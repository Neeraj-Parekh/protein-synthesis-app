import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uploadProtein, addProtein } from '../../store/slices/proteinSlice';

interface FileUploadProps {
  onUploadComplete?: (proteinId: string) => void;
  acceptedFormats?: string[];
  maxFileSize?: number; // in MB
  multiple?: boolean;
}

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  proteinId?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  acceptedFormats = ['.pdb', '.cif', '.mol2', '.sdf'],
  maxFileSize = 50, // 50MB default
  multiple = true
}) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.proteins);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdbDialogOpen, setPdbDialogOpen] = useState(false);
  const [pdbId, setPdbId] = useState('');
  const [pdbSource, setPdbSource] = useState<'rcsb' | 'alphafold'>('rcsb');

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file format
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFormats.includes(fileExtension)) {
        continue; // Skip unsupported files
      }
      
      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        continue; // Skip files too large
      }
      
      newFiles.push({
        file,
        id: `${Date.now()}_${i}`,
        status: 'pending',
        progress: 0
      });
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    handleFileSelect(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const uploadFile = async (fileData: UploadedFile) => {
    try {
      // Update status to uploading
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('name', fileData.file.name.replace(/\.[^/.]+$/, '')); // Remove extension
      formData.append('source', 'upload');

      // Simulate upload progress (in real app, you'd track actual progress)
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileData.id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

      // Upload file (you'll need to implement this API endpoint)
      const response = await fetch('/api/proteins/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      // Update status to success
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'success', progress: 100, proteinId: result.id }
            : f
        )
      );

      // Notify parent component
      onUploadComplete?.(result.id);

    } catch (error) {
      // Update status to error
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      );
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
      // Small delay between uploads to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFetchPdbStructure = async () => {
    if (!pdbId.trim()) return;

    try {
      const response = await fetch('/api/proteins/fetch-pdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          pdb_id: pdbId.toUpperCase(),
          source: pdbSource
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PDB structure');
      }

      const result = await response.json();
      setPdbDialogOpen(false);
      setPdbId('');
      onUploadComplete?.(result.id);

    } catch (error) {
      console.error('PDB fetch failed:', error);
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdb':
        return '🧬';
      case 'cif':
        return '📊';
      case 'mol2':
        return '⚛️';
      case 'sdf':
        return '🔬';
      default:
        return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'uploading': return 'primary';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: isDragOver ? 'primary.main' : 'grey.300',
          bgcolor: isDragOver ? 'primary.50' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.50'
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drag & Drop Protein Files
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          or click to browse your computer
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Supported formats: {acceptedFormats.join(', ')} • Max size: {maxFileSize}MB
        </Typography>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => fileInputRef.current?.click()}
        >
          Browse Files
        </Button>
        <Button
          variant="outlined"
          onClick={() => setPdbDialogOpen(true)}
        >
          Fetch from PDB
        </Button>
      </Box>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Uploaded Files ({uploadedFiles.length})
            </Typography>
            <Button
              variant="contained"
              onClick={handleUploadAll}
              disabled={!uploadedFiles.some(f => f.status === 'pending') || loading}
            >
              Upload All
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            {uploadedFiles.map((fileData) => (
              <Grid item xs={12} key={fileData.id}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontSize: 24 }}>
                        {getFileIcon(fileData.file.name)}
                      </Typography>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {fileData.file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                        
                        {fileData.status === 'uploading' && (
                          <LinearProgress 
                            variant="determinate" 
                            value={fileData.progress} 
                            sx={{ mt: 1 }}
                          />
                        )}
                        
                        {fileData.error && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {fileData.error}
                          </Alert>
                        )}
                      </Box>
                      
                      <Chip
                        label={fileData.status}
                        color={getStatusColor(fileData.status)}
                        size="small"
                      />
                      
                      <Box>
                        {fileData.status === 'success' && fileData.proteinId && (
                          <IconButton size="small" color="primary">
                            <ViewIcon />
                          </IconButton>
                        )}
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleRemoveFile(fileData.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* PDB Fetch Dialog */}
      <Dialog open={pdbDialogOpen} onClose={() => setPdbDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Fetch Structure from Database</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="PDB ID"
              value={pdbId}
              onChange={(e) => setPdbId(e.target.value.toUpperCase())}
              placeholder="e.g., 1ABC"
              helperText="Enter a 4-character PDB identifier"
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth>
              <InputLabel>Database Source</InputLabel>
              <Select
                value={pdbSource}
                label="Database Source"
                onChange={(e) => setPdbSource(e.target.value as 'rcsb' | 'alphafold')}
              >
                <MenuItem value="rcsb">RCSB Protein Data Bank</MenuItem>
                <MenuItem value="alphafold">AlphaFold Database</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdbDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleFetchPdbStructure}
            disabled={!pdbId.trim() || loading}
          >
            Fetch Structure
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload;
