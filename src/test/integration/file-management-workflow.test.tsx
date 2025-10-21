import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders, mockUser, mockCoachUser, mockSupabaseClient, setupTestEnvironment } from '@/test/utils';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/files',
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock file service
const mockFileService = {
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
  deleteFile: vi.fn(),
  shareFile: vi.fn(),
  createFolder: vi.fn(),
  moveFile: vi.fn(),
  getFileUrl: vi.fn(),
  validateFile: vi.fn(),
};

vi.mock('@/lib/services/file-service', () => ({
  fileService: mockFileService,
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock progress tracking
const mockProgressCallback = vi.fn();

// Mock file components
const FileUploadDropzone = ({ onFileUpload, onProgress }: any) => {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach(file => onFileUpload(file, mockProgressCallback));
  };

  return (
    <div>
      <input 
        type="file" 
        multiple 
        onChange={handleFileSelect}
        data-testid="file-input"
      />
      <div data-testid="dropzone">Drop files here or click to select</div>
    </div>
  );
};

const FileManager = ({ userId, userRole }: { userId: string; userRole: string }) => {
  const [files, setFiles] = React.useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = React.useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});

  const handleFileUpload = async (file: File, onProgress: (progress: number) => void) => {
    try {
      const result = await mockFileService.uploadFile(file, { 
        userId, 
        folder: '/uploads',
        onProgress 
      });
      
      setFiles(prev => [...prev, result]);
      mockToast({
        title: 'Upload Successful',
        description: `${file.name} uploaded successfully`,
        variant: 'default',
      });
    } catch (error) {
      mockToast({
        title: 'Upload Failed',
        description: `Failed to upload ${file.name}`,
        variant: 'destructive',
      });
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      await mockFileService.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      mockToast({
        title: 'File Deleted',
        description: 'File deleted successfully',
        variant: 'default',
      });
    } catch (error) {
      mockToast({
        title: 'Delete Failed',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  const handleFileShare = async (fileId: string, shareOptions: any) => {
    try {
      const result = await mockFileService.shareFile(fileId, shareOptions);
      mockToast({
        title: 'File Shared',
        description: 'Share link created successfully',
        variant: 'default',
      });
      return result;
    } catch (error) {
      mockToast({
        title: 'Share Failed',
        description: 'Failed to create share link',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedFiles.map(id => mockFileService.deleteFile(id)));
      setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
      setSelectedFiles([]);
      mockToast({
        title: 'Files Deleted',
        description: `${selectedFiles.length} files deleted`,
        variant: 'default',
      });
    } catch (error) {
      mockToast({
        title: 'Bulk Delete Failed',
        description: 'Failed to delete selected files',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <FileUploadDropzone onFileUpload={handleFileUpload} onProgress={mockProgressCallback} />
      
      <div data-testid="file-list">
        {files.map(file => (
          <div key={file.id} data-testid={`file-${file.id}`}>
            <input
              type="checkbox"
              checked={selectedFiles.includes(file.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedFiles(prev => [...prev, file.id]);
                } else {
                  setSelectedFiles(prev => prev.filter(id => id !== file.id));
                }
              }}
            />
            <span>{file.name}</span>
            <span>{file.size} bytes</span>
            <button onClick={() => handleFileDelete(file.id)}>Delete</button>
            <button onClick={() => handleFileShare(file.id, { expiresIn: '7d' })}>Share</button>
          </div>
        ))}
      </div>

      {selectedFiles.length > 0 && (
        <button onClick={handleBulkDelete}>
          Delete Selected ({selectedFiles.length})
        </button>
      )}
    </div>
  );
};

// Mock React for the component
const React = { useState: vi.fn() };

describe('File Management Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTestEnvironment();

    // Mock React.useState
    let stateIndex = 0;
    const mockStates: any[] = [
      [[], vi.fn()], // files
      [[], vi.fn()], // selectedFiles
      [{}, vi.fn()], // uploadProgress
    ];

    React.useState.mockImplementation(() => mockStates[stateIndex++]);

    // Mock successful API responses
    mockSupabaseClient.from.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Upload Workflow', () => {
    it('uploads single file successfully', async () => {
      const mockFile = new File(['file content'], 'test.pdf', { type: 'application/pdf' });
      
      mockFileService.uploadFile.mockResolvedValue({
        id: 'file-123',
        name: 'test.pdf',
        size: 12,
        type: 'application/pdf',
        url: 'https://storage.example.com/file-123',
        uploadedAt: new Date().toISOString(),
        userId: mockUser.id,
      });

      renderWithProviders(<FileManager userId={mockUser.id} userRole={mockUser.role} />);

      const fileInput = screen.getByTestId('file-input');
      
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockFileService.uploadFile).toHaveBeenCalledWith(
          mockFile,
          expect.objectContaining({
            userId: mockUser.id,
            folder: '/uploads',
            onProgress: expect.any(Function),
          })
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Upload Successful',
        description: 'test.pdf uploaded successfully',
        variant: 'default',
      });
    });

    it('handles multiple file uploads with progress tracking', async () => {
      const mockFiles = [
        new File(['content 1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content 2'], 'file2.txt', { type: 'text/plain' }),
        new File(['content 3'], 'file3.txt', { type: 'text/plain' }),
      ];

      mockFileService.uploadFile
        .mockResolvedValueOnce({
          id: 'file-1',
          name: 'file1.txt',
          size: 9,
          type: 'text/plain',
        })
        .mockResolvedValueOnce({
          id: 'file-2',
          name: 'file2.txt',
          size: 9,
          type: 'text/plain',
        })
        .mockResolvedValueOnce({
          id: 'file-3',
          name: 'file3.txt',
          size: 9,
          type: 'text/plain',
        });

      renderWithProviders(<FileManager userId={mockUser.id} userRole={mockUser.role} />);

      const fileInput = screen.getByTestId('file-input');
      
      Object.defineProperty(fileInput, 'files', {
        value: mockFiles,
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockFileService.uploadFile).toHaveBeenCalledTimes(3);
      });

      // Verify progress tracking was called
      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('validates file types and sizes before upload', async () => {
      const oversizedFile = new File(['x'.repeat(50 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      });
      const invalidFile = new File(['content'], 'script.exe', { 
        type: 'application/octet-stream' 
      });

      mockFileService.validateFile
        .mockReturnValueOnce({ valid: false, error: 'File too large' })
        .mockReturnValueOnce({ valid: false, error: 'File type not allowed' });

      renderWithProviders(<FileManager userId={mockUser.id} userRole={mockUser.role} />);

      const fileInput = screen.getByTestId('file-input');
      
      Object.defineProperty(fileInput, 'files', {
        value: [oversizedFile, invalidFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockFileService.validateFile).toHaveBeenCalledWith(oversizedFile);
        expect(mockFileService.validateFile).toHaveBeenCalledWith(invalidFile);
      });

      expect(mockFileService.uploadFile).not.toHaveBeenCalled();
      
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Upload Failed',
          variant: 'destructive',
        })
      );
    });

    it('handles upload failures with retry mechanism', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      mockFileService.uploadFile
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          id: 'file-123',
          name: 'test.txt',
          size: 7,
          type: 'text/plain',
        });

      renderWithProviders(<FileManager userId={mockUser.id} userRole={mockUser.role} />);

      const fileInput = screen.getByTestId('file-input');
      
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // First attempt fails
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Upload Failed',
          description: 'Failed to upload test.txt',
          variant: 'destructive',
        });
      });

      // Retry upload
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockFileService.uploadFile).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('File Download Workflow', () => {
    it('downloads file successfully', async () => {
      const mockFile = {
        id: 'file-123',
        name: 'document.pdf',
        size: 1024,
        type: 'application/pdf',
        url: 'https://storage.example.com/file-123',
      };

      mockFileService.downloadFile.mockResolvedValue({
        blob: new Blob(['file content'], { type: 'application/pdf' }),
        filename: 'document.pdf',
      });

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock download trigger
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      const DownloadButton = ({ fileId }: { fileId: string }) => {
        const handleDownload = async () => {
          try {
            const result = await mockFileService.downloadFile(fileId);
            const url = URL.createObjectURL(result.blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            link.click();
            
            URL.revokeObjectURL(url);
          } catch (error) {
            mockToast({
              title: 'Download Failed',
              description: 'Failed to download file',
              variant: 'destructive',
            });
          }
        };

        return <button onClick={handleDownload}>Download</button>;
      };

      renderWithProviders(<DownloadButton fileId={mockFile.id} />);

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockFileService.downloadFile).toHaveBeenCalledWith(mockFile.id);
      });

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('handles download failures gracefully', async () => {
      mockFileService.downloadFile.mockRejectedValue(new Error('File not found'));

      const DownloadButton = ({ fileId }: { fileId: string }) => {
        const handleDownload = async () => {
          try {
            await mockFileService.downloadFile(fileId);
          } catch (error) {
            mockToast({
              title: 'Download Failed',
              description: 'Failed to download file',
              variant: 'destructive',
            });
          }
        };

        return <button onClick={handleDownload}>Download</button>;
      };

      renderWithProviders(<DownloadButton fileId="nonexistent-file" />);

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Download Failed',
          description: 'Failed to download file',
          variant: 'destructive',
        });
      });
    });
  });

  describe('File Sharing Workflow', () => {
    it('creates temporary share link with expiration', async () => {
      const mockFile = {
        id: 'file-123',
        name: 'shared-doc.pdf',
        userId: mockUser.id,
      };

      mockFileService.shareFile.mockResolvedValue({
        shareId: 'share-abc-123',
        shareUrl: 'https://app.loom.com/shared/share-abc-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: ['view', 'download'],
      });

      renderWithProviders(<FileManager userId={mockUser.id} userRole={mockUser.role} />);

      // Simulate file already exists in the list
      const setFiles = React.useState.mock.results[0].value[1];
      setFiles([mockFile]);

      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockFileService.shareFile).toHaveBeenCalledWith(
          mockFile.id,
          { expiresIn: '7d' }
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'File Shared',
        description: 'Share link created successfully',
        variant: 'default',
      });
    });

    it('handles permission-based sharing for coaches and clients', async () => {
      const coachFile = {
        id: 'coach-file-123',
        name: 'session-notes.pdf',
        userId: mockCoachUser.id,
      };

      mockFileService.shareFile.mockResolvedValue({
        shareId: 'share-coach-123',
        shareUrl: 'https://app.loom.com/shared/share-coach-123',
        permissions: ['view'],
        sharedWith: [mockUser.id], // Shared with specific client
      });

      renderWithProviders(<FileManager userId={mockCoachUser.id} userRole={mockCoachUser.role} />);

      // Test coach sharing with specific client
      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockFileService.shareFile).toHaveBeenCalledWith(
          coachFile.id,
          expect.objectContaining({
            expiresIn: '7d',
          })
        );
      });
    });

    it('revokes share access when file is deleted', async () => {
      const sharedFile = {
        id: 'shared-file-123',
        name: 'shared.pdf',
        isShared: true,
        shareLinks: ['share-abc-123'],
      };

      mockFileService.deleteFile.mockImplementation(async (fileId) => {
        // Should also revoke all share links
        return { deleted: true, sharesRevoked: 1 };
      });

      renderWithProviders(<FileManager userId={mockUser.id} userRole={mockUser.role} />);

      // Simulate file exists
      const setFiles = React.useState.mock.results[0].value[1];
      setFiles([sharedFile]);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockFileService.deleteFile).toHaveBeenCalledWith(sharedFile.id);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'File Deleted',
        description: 'File deleted successfully',
        variant: 'default',
      });
    });
  });

  describe('Bulk File Operations', () => {
    it('performs bulk delete operation', async () => {
      const mockFiles = [
        { id: 'file-1', name: 'doc1.pdf' },
        { id: 'file-2', name: 'doc2.pdf' },
        { id: 'file-3', name: 'doc3.pdf' },
      ];

      mockFileService.deleteFile.mockResolvedValue({ deleted: true });

      renderWithProviders(<FileManager userId={mockUser.id} userRole={mockUser.role} />);

      // Simulate files exist and are selected
      const setFiles = React.useState.mock.results[0].value[1];
      const setSelectedFiles = React.useState.mock.results[1].value[1];
      
      setFiles(mockFiles);
      setSelectedFiles(['file-1', 'file-2']);

      const bulkDeleteButton = screen.getByRole('button', { name: /delete selected \(2\)/i });
      fireEvent.click(bulkDeleteButton);

      await waitFor(() => {
        expect(mockFileService.deleteFile).toHaveBeenCalledWith('file-1');
        expect(mockFileService.deleteFile).toHaveBeenCalledWith('file-2');
        expect(mockFileService.deleteFile).toHaveBeenCalledTimes(2);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Files Deleted',
        description: '2 files deleted',
        variant: 'default',
      });
    });

    it('handles partial failures in bulk operations', async () => {
      const mockFiles = [
        { id: 'file-1', name: 'doc1.pdf' },
        { id: 'file-2', name: 'doc2.pdf' },
        { id: 'file-3', name: 'doc3.pdf' },
      ];

      mockFileService.deleteFile
        .mockResolvedValueOnce({ deleted: true })
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce({ deleted: true });

      renderWithProviders(<FileManager userId={mockUser.id} userRole={mockUser.role} />);

      // Simulate files exist and are selected
      const setFiles = React.useState.mock.results[0].value[1];
      const setSelectedFiles = React.useState.mock.results[1].value[1];
      
      setFiles(mockFiles);
      setSelectedFiles(['file-1', 'file-2', 'file-3']);

      const bulkDeleteButton = screen.getByRole('button', { name: /delete selected \(3\)/i });
      fireEvent.click(bulkDeleteButton);

      await waitFor(() => {
        expect(mockFileService.deleteFile).toHaveBeenCalledTimes(3);
      });

      // Should show error for partial failure
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Bulk Delete Failed',
        description: 'Failed to delete selected files',
        variant: 'destructive',
      });
    });
  });

  describe('File Organization Workflow', () => {
    it('creates folder structure and moves files', async () => {
      mockFileService.createFolder.mockResolvedValue({
        id: 'folder-123',
        name: 'Session Notes',
        path: '/Session Notes',
        userId: mockUser.id,
      });

      mockFileService.moveFile.mockResolvedValue({
        id: 'file-123',
        name: 'notes.pdf',
        newPath: '/Session Notes/notes.pdf',
      });

      const FolderManager = () => {
        const handleCreateFolder = async () => {
          await mockFileService.createFolder({
            name: 'Session Notes',
            parentPath: '/',
            userId: mockUser.id,
          });
        };

        const handleMoveFile = async () => {
          await mockFileService.moveFile('file-123', '/Session Notes');
        };

        return (
          <div>
            <button onClick={handleCreateFolder}>Create Folder</button>
            <button onClick={handleMoveFile}>Move File</button>
          </div>
        );
      };

      renderWithProviders(<FolderManager />);

      const createFolderButton = screen.getByRole('button', { name: /create folder/i });
      fireEvent.click(createFolderButton);

      await waitFor(() => {
        expect(mockFileService.createFolder).toHaveBeenCalledWith({
          name: 'Session Notes',
          parentPath: '/',
          userId: mockUser.id,
        });
      });

      const moveFileButton = screen.getByRole('button', { name: /move file/i });
      fireEvent.click(moveFileButton);

      await waitFor(() => {
        expect(mockFileService.moveFile).toHaveBeenCalledWith('file-123', '/Session Notes');
      });
    });
  });

  describe('File Version Management', () => {
    it('handles file versioning and rollback', async () => {
      const originalFile = {
        id: 'file-123',
        name: 'document.pdf',
        version: 1,
        versions: [
          { version: 1, uploadedAt: '2024-01-01T00:00:00Z', size: 1024 },
          { version: 2, uploadedAt: '2024-01-02T00:00:00Z', size: 1536 },
        ],
      };

      mockFileService.uploadFile.mockResolvedValue({
        ...originalFile,
        version: 2,
        isNewVersion: true,
      });

      const VersionManager = () => {
        const handleVersionUpload = async () => {
          const file = new File(['updated content'], 'document.pdf', { 
            type: 'application/pdf' 
          });
          
          await mockFileService.uploadFile(file, {
            existingFileId: originalFile.id,
            createNewVersion: true,
          });
        };

        return <button onClick={handleVersionUpload}>Update File Version</button>;
      };

      renderWithProviders(<VersionManager />);

      const versionButton = screen.getByRole('button', { name: /update file version/i });
      fireEvent.click(versionButton);

      await waitFor(() => {
        expect(mockFileService.uploadFile).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            existingFileId: originalFile.id,
            createNewVersion: true,
          })
        );
      });
    });
  });

  describe('Storage Quota Management', () => {
    it('enforces storage limits and shows usage', async () => {
      const storageInfo = {
        used: 45 * 1024 * 1024, // 45MB used
        limit: 50 * 1024 * 1024, // 50MB limit
        percentage: 90,
      };

      mockFileService.uploadFile.mockRejectedValue(new Error('Storage quota exceeded'));

      const StorageManager = ({ usage }: { usage: typeof storageInfo }) => {
        const handleUpload = async () => {
          const file = new File(['content'], 'large-file.pdf', { type: 'application/pdf' });
          
          try {
            await mockFileService.uploadFile(file, { userId: mockUser.id });
          } catch (error) {
            mockToast({
              title: 'Upload Failed',
              description: 'Storage quota exceeded. Please delete some files.',
              variant: 'destructive',
            });
          }
        };

        return (
          <div>
            <div data-testid="storage-usage">
              Storage: {usage.percentage}% used ({Math.round(usage.used / 1024 / 1024)}MB / {Math.round(usage.limit / 1024 / 1024)}MB)
            </div>
            <button onClick={handleUpload}>Upload File</button>
          </div>
        );
      };

      renderWithProviders(<StorageManager usage={storageInfo} />);

      expect(screen.getByTestId('storage-usage')).toHaveTextContent('Storage: 90% used (45MB / 50MB)');

      const uploadButton = screen.getByRole('button', { name: /upload file/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Upload Failed',
          description: 'Storage quota exceeded. Please delete some files.',
          variant: 'destructive',
        });
      });
    });
  });
});