import sharp from 'sharp';

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 1-100
  format?: 'jpeg' | 'png' | 'webp';
  enableProgressive?: boolean;
  stripMetadata?: boolean;
  compressionLevel?: number; // 0-9 for PNG
}

export interface OptimizationResult {
  optimized: boolean;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  optimizedBuffer: Buffer;
  metadata: {
    width?: number;
    height?: number;
    hasAlpha?: boolean;
    colorSpace?: string;
    compressionMethod?: string;
  };
}

export interface DocumentConversionOptions {
  outputFormat: 'pdf' | 'docx' | 'txt';
  imageQuality?: number;
  embedImages?: boolean;
  compressImages?: boolean;
}

export interface ConversionResult {
  converted: boolean;
  originalFormat: string;
  outputFormat: string;
  originalSize: number;
  convertedSize: number;
  convertedBuffer: Buffer;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
  };
}

class FileOptimizationService {
  private readonly MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_DOCUMENT_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Optimize image files with compression and resizing
   */
  async optimizeImage(
    inputBuffer: Buffer,
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const {
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 85,
      format = 'jpeg',
      enableProgressive = true,
      stripMetadata = true,
      compressionLevel = 6,
    } = options;

    try {
      if (inputBuffer.length > this.MAX_IMAGE_SIZE) {
        throw new Error('Image size exceeds maximum allowed size');
      }

      // Get original metadata
      const originalMetadata = await sharp(inputBuffer).metadata();
      const originalSize = inputBuffer.length;

      // Create Sharp instance with input buffer
      let sharpInstance = sharp(inputBuffer);

      // Strip metadata if requested
      if (stripMetadata) {
        sharpInstance = sharpInstance.withMetadata({});
      }

      // Resize if needed
      if (originalMetadata.width && originalMetadata.height) {
        if (
          originalMetadata.width > maxWidth ||
          originalMetadata.height > maxHeight
        ) {
          sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
      }

      // Apply format-specific optimizations
      let optimizedBuffer: Buffer;

      switch (format) {
        case 'jpeg':
          optimizedBuffer = await sharpInstance
            .jpeg({
              quality,
              progressive: enableProgressive,
              mozjpeg: true, // Use mozjpeg encoder for better compression
            })
            .toBuffer();
          break;

        case 'png':
          optimizedBuffer = await sharpInstance
            .png({
              compressionLevel,
              adaptiveFiltering: true,
              palette:
                originalMetadata.channels === 1 ||
                originalMetadata.channels === 2,
            })
            .toBuffer();
          break;

        case 'webp':
          optimizedBuffer = await sharpInstance
            .webp({
              quality,
              effort: 6, // Maximum compression effort
              lossless: false,
            })
            .toBuffer();
          break;

        default:
          throw new Error(`Unsupported output format: ${format}`);
      }

      // Get optimized metadata
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();
      const optimizedSize = optimizedBuffer.length;
      const compressionRatio = (originalSize - optimizedSize) / originalSize;

      return {
        optimized: optimizedSize < originalSize,
        originalSize,
        optimizedSize,
        compressionRatio,
        format,
        optimizedBuffer,
        metadata: {
          width: optimizedMetadata.width,
          height: optimizedMetadata.height,
          hasAlpha: optimizedMetadata.hasAlpha,
          colorSpace: optimizedMetadata.space,
          compressionMethod: format.toUpperCase(),
        },
      };
    } catch (error) {
      throw new Error(
        `Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Optimize PDF documents by compressing images and removing unnecessary data
   */
  async optimizePDF(inputBuffer: Buffer): Promise<OptimizationResult> {
    try {
      if (inputBuffer.length > this.MAX_DOCUMENT_SIZE) {
        throw new Error('PDF size exceeds maximum allowed size');
      }

      const originalSize = inputBuffer.length;

      // Dynamically import pdf-lib to reduce initial bundle size
      const { PDFDocument } = await import('pdf-lib');

      // Load the PDF
      const pdfDoc = await PDFDocument.load(inputBuffer);

      // Remove metadata to reduce size
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      // Save optimized PDF
      const optimizedBuffer = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50,
      });

      const optimizedSize = optimizedBuffer.length;
      const compressionRatio = (originalSize - optimizedSize) / originalSize;

      return {
        optimized: optimizedSize < originalSize,
        originalSize,
        optimizedSize,
        compressionRatio,
        format: 'pdf',
        optimizedBuffer: Buffer.from(optimizedBuffer),
        metadata: {
          compressionMethod: 'PDF_OPTIMIZATION',
        },
      };
    } catch (error) {
      throw new Error(
        `PDF optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detect file type and apply appropriate optimization
   */
  async optimizeFile(
    inputBuffer: Buffer,
    mimeType: string,
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    try {
      // Determine optimization strategy based on MIME type
      if (mimeType.startsWith('image/')) {
        return await this.optimizeImage(inputBuffer, options);
      } else if (mimeType === 'application/pdf') {
        return await this.optimizePDF(inputBuffer);
      } else if (mimeType.startsWith('text/')) {
        // For text files, just compress whitespace
        return await this.optimizeTextFile(inputBuffer, mimeType);
      } else {
        // For other file types, return original
        return {
          optimized: false,
          originalSize: inputBuffer.length,
          optimizedSize: inputBuffer.length,
          compressionRatio: 0,
          format: mimeType,
          optimizedBuffer: inputBuffer,
          metadata: {
            compressionMethod: 'NONE',
          },
        };
      }
    } catch (error) {
      throw new Error(
        `File optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Optimize text files by removing unnecessary whitespace
   */
  private async optimizeTextFile(
    inputBuffer: Buffer,
    mimeType: string
  ): Promise<OptimizationResult> {
    const originalSize = inputBuffer.length;
    const text = inputBuffer.toString('utf-8');

    let optimizedText: string;

    if (mimeType === 'text/plain') {
      // Remove excessive whitespace but preserve line breaks
      optimizedText = text
        .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();
    } else if (mimeType === 'text/html') {
      // Minify HTML
      optimizedText = text
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .trim();
    } else if (mimeType === 'text/css') {
      // Minify CSS
      optimizedText = text
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .replace(/;\s*}/g, '}') // Remove last semicolon before closing brace
        .replace(/\s*{\s*/g, '{') // Remove whitespace around opening brace
        .replace(/;\s*/g, ';') // Remove whitespace after semicolons
        .trim();
    } else {
      // Default text optimization
      optimizedText = text.replace(/\s+/g, ' ').trim();
    }

    const optimizedBuffer = Buffer.from(optimizedText, 'utf-8');
    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = (originalSize - optimizedSize) / originalSize;

    return {
      optimized: optimizedSize < originalSize,
      originalSize,
      optimizedSize,
      compressionRatio,
      format: mimeType,
      optimizedBuffer,
      metadata: {
        compressionMethod: 'TEXT_MINIFICATION',
      },
    };
  }

  /**
   * Convert document formats
   */
  async convertDocument(
    inputBuffer: Buffer,
    inputMimeType: string,
    options: DocumentConversionOptions
  ): Promise<ConversionResult> {
    try {
      // For now, we'll implement basic conversions
      // In a production environment, you might want to use libraries like:
      // - pdf2pic for PDF to image conversion
      // - mammoth for DOCX to HTML conversion
      // - pandoc via child_process for various format conversions

      if (
        inputMimeType === 'application/pdf' &&
        options.outputFormat === 'txt'
      ) {
        return await this.convertPDFToText(inputBuffer);
      } else if (
        inputMimeType === 'text/plain' &&
        options.outputFormat === 'pdf'
      ) {
        return await this.convertTextToPDF(inputBuffer);
      } else {
        throw new Error(
          `Conversion from ${inputMimeType} to ${options.outputFormat} is not supported`
        );
      }
    } catch (error) {
      throw new Error(
        `Document conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert PDF to plain text (simplified implementation)
   */
  private async convertPDFToText(
    inputBuffer: Buffer
  ): Promise<ConversionResult> {
    // This is a simplified implementation
    // In production, you'd use a library like pdf-parse or pdf2pic
    const originalSize = inputBuffer.length;

    // For demo purposes, just return placeholder text
    const textContent = `[PDF Content Extracted]\n\nThis is a placeholder for PDF text extraction.\nIn a production environment, this would contain the actual extracted text from the PDF.`;

    const convertedBuffer = Buffer.from(textContent, 'utf-8');
    const convertedSize = convertedBuffer.length;

    return {
      converted: true,
      originalFormat: 'application/pdf',
      outputFormat: 'text/plain',
      originalSize,
      convertedSize,
      convertedBuffer,
      metadata: {
        characterCount: textContent.length,
        wordCount: textContent.split(/\s+/).length,
      },
    };
  }

  /**
   * Convert plain text to PDF
   */
  private async convertTextToPDF(
    inputBuffer: Buffer
  ): Promise<ConversionResult> {
    const text = inputBuffer.toString('utf-8');
    const originalSize = inputBuffer.length;

    // Dynamically import pdf-lib to reduce initial bundle size
    const { PDFDocument, rgb } = await import('pdf-lib');

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size

    // Add text to the page
    const font = await pdfDoc.embedFont('Helvetica');
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;

    // Split text into lines and add to PDF
    const lines = text.split('\n');
    let yPosition = 750; // Start near top of page

    for (const line of lines) {
      if (yPosition < 50) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = 750;
        newPage.drawText(line, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      } else {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
      yPosition -= lineHeight;
    }

    const convertedBuffer = Buffer.from(await pdfDoc.save());
    const convertedSize = convertedBuffer.length;

    return {
      converted: true,
      originalFormat: 'text/plain',
      outputFormat: 'application/pdf',
      originalSize,
      convertedSize,
      convertedBuffer,
      metadata: {
        pageCount: pdfDoc.getPageCount(),
        characterCount: text.length,
        wordCount: text.split(/\s+/).length,
      },
    };
  }

  /**
   * Get optimization recommendations for a file
   */
  async getOptimizationRecommendations(
    fileSize: number,
    mimeType: string,
    metadata?: any
  ): Promise<{
    shouldOptimize: boolean;
    recommendations: string[];
    estimatedSavings: number;
    priority: 'low' | 'medium' | 'high';
  }> {
    const recommendations: string[] = [];
    let estimatedSavings = 0;
    let priority: 'low' | 'medium' | 'high' = 'low';

    if (mimeType.startsWith('image/')) {
      if (fileSize > 1024 * 1024) {
        // > 1MB
        recommendations.push(
          'Consider compressing this image to reduce file size'
        );
        estimatedSavings = 0.3; // Estimate 30% savings
        priority = 'high';
      } else if (fileSize > 500 * 1024) {
        // > 500KB
        recommendations.push('This image could benefit from light compression');
        estimatedSavings = 0.15; // Estimate 15% savings
        priority = 'medium';
      }

      if (metadata?.width > 2048 || metadata?.height > 2048) {
        recommendations.push('Consider resizing this image for web use');
        estimatedSavings = Math.max(estimatedSavings, 0.4);
        priority = 'high';
      }
    } else if (mimeType === 'application/pdf') {
      if (fileSize > 5 * 1024 * 1024) {
        // > 5MB
        recommendations.push('This PDF could be optimized to reduce file size');
        estimatedSavings = 0.2; // Estimate 20% savings
        priority = 'high';
      }
    } else if (mimeType.startsWith('text/')) {
      if (fileSize > 100 * 1024) {
        // > 100KB
        recommendations.push('This text file could be minified');
        estimatedSavings = 0.1; // Estimate 10% savings
        priority = 'low';
      }
    }

    return {
      shouldOptimize: recommendations.length > 0,
      recommendations,
      estimatedSavings,
      priority,
    };
  }

  /**
   * Batch optimize multiple files
   */
  async batchOptimize(
    files: Array<{ buffer: Buffer; mimeType: string; filename: string }>,
    options: OptimizationOptions = {}
  ): Promise<Array<OptimizationResult & { filename: string; error?: string }>> {
    const results: Array<
      OptimizationResult & { filename: string; error?: string }
    > = [];

    for (const file of files) {
      try {
        const result = await this.optimizeFile(
          file.buffer,
          file.mimeType,
          options
        );
        results.push({
          ...result,
          filename: file.filename,
        });
      } catch (error) {
        results.push({
          optimized: false,
          originalSize: file.buffer.length,
          optimizedSize: file.buffer.length,
          compressionRatio: 0,
          format: file.mimeType,
          optimizedBuffer: file.buffer,
          metadata: {},
          filename: file.filename,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const fileOptimizationService = new FileOptimizationService();
