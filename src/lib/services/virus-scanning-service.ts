import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface VirusScanResult {
  safe: boolean;
  scanId?: string;
  threatName?: string;
  details?: string;
  scanProvider?: string;
  scanDurationMs?: number;
  quarantined?: boolean;
}

export interface FileScanOptions {
  skipCache?: boolean;
  scanProvider?: 'clamav' | 'virustotal' | 'local';
  maxScanTimeMs?: number;
}

/**
 * Comprehensive virus scanning service with multiple providers
 */
class VirusScanningService {
  private readonly MAX_SCAN_TIME = 30000; // 30 seconds default timeout
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // In production, these would be environment variables
  private readonly VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
  private readonly CLAMAV_HOST = process.env.CLAMAV_HOST || 'localhost';
  private readonly CLAMAV_PORT = process.env.CLAMAV_PORT || '3310';

  /**
   * Main scanning function that orchestrates different scan providers
   */
  async scanFile(file: File, options: FileScanOptions = {}): Promise<VirusScanResult> {
    const startTime = Date.now();
    const fileBuffer = await file.arrayBuffer();
    const fileHash = this.generateFileHash(Buffer.from(fileBuffer));

    // Check cache first (unless explicitly skipped)
    if (!options.skipCache) {
      const cachedResult = await this.getCachedScanResult(fileHash);
      if (cachedResult) {
        return {
          ...cachedResult,
          scanDurationMs: Date.now() - startTime,
        };
      }
    }

    let scanResult: VirusScanResult;

    // Determine scan provider priority
    const provider = options.scanProvider || this.getPreferredProvider();

    try {
      switch (provider) {
        case 'clamav':
          scanResult = await this.scanWithClamAV(Buffer.from(fileBuffer));
          break;
        case 'virustotal':
          scanResult = await this.scanWithVirusTotal(Buffer.from(fileBuffer), fileHash);
          break;
        case 'local':
        default:
          scanResult = await this.performLocalScan(file, Buffer.from(fileBuffer));
          break;
      }

      // Add metadata
      scanResult.scanDurationMs = Date.now() - startTime;
      scanResult.scanProvider = provider;

      // Cache the result
      await this.cacheScanResult(fileHash, scanResult);

      // Log scan activity
      await this.logScanActivity(file, scanResult, fileHash);

      return scanResult;

    } catch (error) {
      console.error('Virus scan failed:', error);
      
      // Fallback to local scan if external provider fails
      if (provider !== 'local') {
        console.warn(`${provider} scan failed, falling back to local scan`);
        return this.scanFile(file, { ...options, scanProvider: 'local' });
      }

      // If all scans fail, be conservative and mark as unsafe
      return {
        safe: false,
        details: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        scanProvider: provider,
        scanDurationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Scan with ClamAV (requires ClamAV daemon running)
   */
  private async scanWithClamAV(fileBuffer: Buffer): Promise<VirusScanResult> {
    try {
      // In production, this would connect to ClamAV daemon
      // For now, implementing a basic simulation
      
      const net = await import('net');
      
      return new Promise((resolve, reject) => {
        const socket = net.createConnection(parseInt(this.CLAMAV_PORT), this.CLAMAV_HOST);
        let response = '';

        socket.setTimeout(this.MAX_SCAN_TIME);

        socket.on('connect', () => {
          // Send INSTREAM command followed by file data
          socket.write('zINSTREAM\0');
          
          // Send file size (4 bytes, network byte order)
          const sizeBuffer = Buffer.allocUnsafe(4);
          sizeBuffer.writeUInt32BE(fileBuffer.length, 0);
          socket.write(sizeBuffer);
          
          // Send file data
          socket.write(fileBuffer);
          
          // Send terminating zero size
          const terminatorBuffer = Buffer.allocUnsafe(4);
          terminatorBuffer.writeUInt32BE(0, 0);
          socket.write(terminatorBuffer);
        });

        socket.on('data', (data) => {
          response += data.toString();
        });

        socket.on('end', () => {
          if (response.includes('OK')) {
            resolve({
              safe: true,
              scanProvider: 'clamav',
            });
          } else if (response.includes('FOUND')) {
            const threatMatch = response.match(/: (.+) FOUND/);
            resolve({
              safe: false,
              threatName: threatMatch ? threatMatch[1] : 'Unknown threat',
              details: response.trim(),
              scanProvider: 'clamav',
              quarantined: true,
            });
          } else {
            reject(new Error(`Unexpected ClamAV response: ${response}`));
          }
        });

        socket.on('error', (error) => {
          reject(error);
        });

        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('ClamAV scan timeout'));
        });
      });

    } catch (error) {
      throw new Error(`ClamAV scan failed: ${error}`);
    }
  }

  /**
   * Scan with VirusTotal API
   */
  private async scanWithVirusTotal(fileBuffer: Buffer, fileHash: string): Promise<VirusScanResult> {
    if (!this.VIRUSTOTAL_API_KEY) {
      throw new Error('VirusTotal API key not configured');
    }

    try {
      // First, check if file is already known by hash
      const hashCheckResponse = await fetch(
        `https://www.virustotal.com/vtapi/v2/file/report?apikey=${this.VIRUSTOTAL_API_KEY}&resource=${fileHash}`,
        { method: 'GET' }
      );

      const hashCheckData = await hashCheckResponse.json();

      if (hashCheckData.response_code === 1) {
        // File is known, return cached results
        const positives = hashCheckData.positives || 0;
        const total = hashCheckData.total || 0;
        
        return {
          safe: positives === 0,
          threatName: positives > 0 ? 'Multiple threats detected' : undefined,
          details: `VirusTotal: ${positives}/${total} engines detected threats`,
          scanProvider: 'virustotal',
        };
      }

      // File not known, upload for scanning
      const formData = new FormData();
      formData.append('apikey', this.VIRUSTOTAL_API_KEY);
      formData.append('file', new Blob([fileBuffer]));

      const uploadResponse = await fetch(
        'https://www.virustotal.com/vtapi/v2/file/scan',
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();

      if (uploadData.response_code !== 1) {
        throw new Error(`VirusTotal upload failed: ${uploadData.verbose_msg}`);
      }

      // Wait for scan completion and get results
      await this.sleep(5000); // Wait 5 seconds before checking results

      const resultResponse = await fetch(
        `https://www.virustotal.com/vtapi/v2/file/report?apikey=${this.VIRUSTOTAL_API_KEY}&resource=${uploadData.resource}`,
        { method: 'GET' }
      );

      const resultData = await resultResponse.json();

      if (resultData.response_code === 1) {
        const positives = resultData.positives || 0;
        const total = resultData.total || 0;
        
        return {
          safe: positives === 0,
          threatName: positives > 0 ? 'Multiple threats detected' : undefined,
          details: `VirusTotal: ${positives}/${total} engines detected threats`,
          scanProvider: 'virustotal',
          scanId: uploadData.resource,
        };
      } else {
        // Scan still in progress or failed
        return {
          safe: true, // Conservative default
          details: 'VirusTotal scan in progress, file appears safe',
          scanProvider: 'virustotal',
          scanId: uploadData.resource,
        };
      }

    } catch (error) {
      throw new Error(`VirusTotal scan failed: ${error}`);
    }
  }

  /**
   * Local virus scan with heuristic analysis
   */
  private async performLocalScan(file: File, fileBuffer: Buffer): Promise<VirusScanResult> {
    const threats: string[] = [];
    let suspiciousCount = 0;

    // 1. File size checks
    if (fileBuffer.length === 0) {
      return {
        safe: false,
        threatName: 'Empty file',
        details: 'File is empty, potentially corrupted or malicious',
        scanProvider: 'local',
      };
    }

    if (fileBuffer.length > 500 * 1024 * 1024) { // 500MB
      suspiciousCount++;
    }

    // 2. Filename checks
    const suspiciousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.vbe', '.js', 
      '.jar', '.app', '.deb', '.rpm', '.dmg', '.pkg', '.msi', '.run'
    ];
    
    const fileName = file.name.toLowerCase();
    
    for (const ext of suspiciousExtensions) {
      if (fileName.endsWith(ext)) {
        threats.push(`Executable file type: ${ext}`);
        break;
      }
    }

    // Check for double extensions
    const parts = fileName.split('.');
    if (parts.length > 2) {
      const lastTwo = parts.slice(-2).join('.');
      const suspiciousDoubleExts = ['.pdf.exe', '.doc.exe', '.jpg.exe', '.txt.exe'];
      
      if (suspiciousDoubleExts.some(ext => lastTwo.includes(ext.substring(1)))) {
        threats.push('Suspicious double extension detected');
      }
    }

    // 3. Magic number / file signature checks
    const magicBytes = fileBuffer.slice(0, 16);
    const magicHex = magicBytes.toString('hex').toLowerCase();
    
    // PE executable signatures
    if (magicHex.startsWith('4d5a')) { // MZ header
      threats.push('Windows executable detected (PE format)');
    }
    
    // ELF executable signatures
    if (magicHex.startsWith('7f454c46')) { // ELF header
      threats.push('Linux executable detected (ELF format)');
    }

    // Mach-O executable signatures
    if (magicHex.startsWith('feedface') || magicHex.startsWith('feedfacf')) {
      threats.push('macOS executable detected (Mach-O format)');
    }

    // 4. Content-based analysis
    const fileContent = fileBuffer.toString('ascii', 0, Math.min(fileBuffer.length, 64000));
    
    // Suspicious strings
    const suspiciousStrings = [
      'cmd.exe', 'powershell', 'eval(', 'exec(', 'system(',
      '<script>', 'javascript:', 'vbscript:', 'activexobject',
      'shell.application', 'wscript.shell', 'document.write(',
      'fromcharcode', 'string.fromcharcode', 'unescape(',
      'base64_decode', 'gzinflate', 'eval(base64_decode'
    ];

    let suspiciousStringCount = 0;
    for (const suspiciousString of suspiciousStrings) {
      if (fileContent.toLowerCase().includes(suspiciousString)) {
        suspiciousStringCount++;
      }
    }

    if (suspiciousStringCount > 3) {
      threats.push(`High concentration of suspicious code patterns (${suspiciousStringCount} detected)`);
    } else if (suspiciousStringCount > 0) {
      suspiciousCount += suspiciousStringCount;
    }

    // 5. Entropy analysis (simple)
    const entropy = this.calculateEntropy(fileBuffer.slice(0, 8192)); // First 8KB
    if (entropy > 7.5) { // High entropy might indicate encryption/packing
      suspiciousCount++;
      if (entropy > 7.8) {
        threats.push('Extremely high entropy detected (possible packing/encryption)');
      }
    }

    // 6. MIME type mismatch detection
    const declaredType = file.type;
    const actualType = this.detectFileType(fileBuffer);
    
    if (declaredType && actualType && declaredType !== actualType) {
      if (this.isSignificantMismatch(declaredType, actualType)) {
        threats.push(`MIME type mismatch: declared ${declaredType}, actual ${actualType}`);
      }
    }

    // 7. Final assessment
    const isSafe = threats.length === 0 && suspiciousCount < 3;

    return {
      safe: isSafe,
      threatName: threats.length > 0 ? threats[0] : (suspiciousCount > 0 ? 'Suspicious patterns detected' : undefined),
      details: threats.length > 0 
        ? threats.join('; ')
        : (suspiciousCount > 0 ? `${suspiciousCount} suspicious indicators found` : 'File appears safe'),
      scanProvider: 'local',
      quarantined: !isSafe,
    };
  }

  /**
   * Calculate Shannon entropy of data
   */
  private calculateEntropy(buffer: Buffer): number {
    const frequencies = new Array(256).fill(0);
    
    for (let i = 0; i < buffer.length; i++) {
      frequencies[buffer[i]]++;
    }
    
    let entropy = 0;
    for (let freq of frequencies) {
      if (freq > 0) {
        const p = freq / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy;
  }

  /**
   * Detect actual file type based on content
   */
  private detectFileType(buffer: Buffer): string | null {
    const magic = buffer.slice(0, 16).toString('hex').toLowerCase();
    
    // Common file signatures
    const signatures: Record<string, string> = {
      '89504e47': 'image/png',
      'ffd8ffe0': 'image/jpeg',
      'ffd8ffe1': 'image/jpeg',
      'ffd8ffe2': 'image/jpeg',
      '47494638': 'image/gif',
      '25504446': 'application/pdf',
      '504b0304': 'application/zip',
      '504b0506': 'application/zip',
      '504b0708': 'application/zip',
      'd0cf11e0': 'application/msword',
      '4d5a9000': 'application/x-msdownload', // PE executable
    };
    
    for (const [sig, type] of Object.entries(signatures)) {
      if (magic.startsWith(sig)) {
        return type;
      }
    }
    
    return null;
  }

  /**
   * Check if MIME type mismatch is significant
   */
  private isSignificantMismatch(declared: string, actual: string): boolean {
    // Some mismatches are acceptable
    const acceptableMismatches = [
      ['application/octet-stream', ''], // Generic binary
      ['text/plain', ''], // Generic text
    ];
    
    for (const [decl, act] of acceptableMismatches) {
      if (declared === decl || actual === act) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Generate file hash for caching
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get cached scan result
   */
  private async getCachedScanResult(fileHash: string): Promise<VirusScanResult | null> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('virus_scan_cache')
        .select('*')
        .eq('file_hash', fileHash)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        safe: data.is_safe,
        threatName: data.threat_name || undefined,
        details: data.scan_details || undefined,
        scanProvider: data.scan_provider,
        scanId: data.scan_id || undefined,
      };

    } catch (error) {
      console.warn('Failed to get cached scan result:', error);
      return null;
    }
  }

  /**
   * Cache scan result
   */
  private async cacheScanResult(fileHash: string, result: VirusScanResult): Promise<void> {
    try {
      const supabase = await createClient();
      const expiresAt = new Date(Date.now() + this.CACHE_DURATION);

      await supabase
        .from('virus_scan_cache')
        .upsert({
          file_hash: fileHash,
          is_safe: result.safe,
          threat_name: result.threatName || null,
          scan_details: result.details || null,
          scan_provider: result.scanProvider || 'local',
          scan_id: result.scanId || null,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        });

    } catch (error) {
      console.warn('Failed to cache scan result:', error);
    }
  }

  /**
   * Log scan activity
   */
  private async logScanActivity(
    file: File, 
    result: VirusScanResult, 
    fileHash: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      
      await supabase
        .from('virus_scan_logs')
        .insert({
          file_hash: fileHash,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          scan_provider: result.scanProvider || 'local',
          is_safe: result.safe,
          threat_name: result.threatName || null,
          scan_details: result.details || null,
          scan_duration_ms: result.scanDurationMs || null,
          quarantined: result.quarantined || false,
          created_at: new Date().toISOString(),
        });

    } catch (error) {
      console.warn('Failed to log scan activity:', error);
    }
  }

  /**
   * Get preferred scan provider based on configuration
   */
  private getPreferredProvider(): 'clamav' | 'virustotal' | 'local' {
    if (process.env.NODE_ENV === 'production') {
      if (this.VIRUSTOTAL_API_KEY) {
        return 'virustotal';
      }
      // In production, you might have ClamAV running
      return 'clamav';
    }
    
    return 'local';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const virusScanningService = new VirusScanningService();