import * as React from 'react';
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { ViewInAr, Science, Upload } from '@mui/icons-material';
import { ProteinStructure } from '@/types';
import NGLViewer from './NGLViewer';
import { useDropzone } from 'react-dropzone';
import { loadPDBFromFile } from '@/utils/pdbLoader';

interface ModernProteinViewerProps {
  protein?: ProteinStructure;
  onLoadSample?: (pdbId: string) => void;
}

const ModernProteinViewer: React.FC<ModernProteinViewerProps> = ({ protein, onLoadSample }) => {
  const [colorScheme, setColorScheme] = useState<string>('cpk');
  const [representation, setRepresentation] = useState<string>('cartoon');
  const [atomScale, setAtomScale] = useState<number>(0.3);
  const [quality, setQuality] = useState<string>('medium');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [currentProtein, setCurrentProtein] = useState<ProteinStructure | undefined>(protein);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentProtein(protein);
  }, [protein]);

  const handleColorSchemeChange = (event: SelectChangeEvent) => {
    setColorScheme(event.target.value);
  };

  const handleRepresentationChange = (event: SelectChangeEvent) => {
    setRepresentation(event.target.value);
  };

  const handleQualityChange = (event: SelectChangeEvent) => {
    setQuality(event.target.value);
  };

  const handleScaleChange = (_: Event, value: number | number[]) => {
    setAtomScale(Array.isArray(value) ? value[0] : value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleLoadSample = (pdbId: string) => {
    if (onLoadSample) {
      setLoading(true);
      onLoadSample(pdbId);
      setTimeout(() => setLoading(false), 1000); // Simulate loading
    }
  };

  // File upload handling
  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const loadedProtein = await loadPDBFromFile(file, {
        includeHydrogens: false,
        includeWater: false,
        includeHetero: true,
      });

      setCurrentProtein(loadedProtein);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load protein file');
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'chemical/x-pdb': ['.pdb'],
      'text/plain': ['.pdb', '.txt'],
    },
    multiple: false,
    disabled: loading,
  });

  const sampleProteins = [
    { id: '1CRN', name: 'Crambin', description: 'Small hydrophobic protein' },
    { id: '1LYZ', name: 'Lysozyme', description: 'Antimicrobial enzyme' },
    { id: '1UBQ', name: 'Ubiquitin', description: 'Protein degradation tag' },
    { id: '1MBN', name: 'Myoglobin', description: 'Oxygen-binding protein' }
  ];

  const renderOptions = {
    colorScheme: colorScheme as 'cpk' | 'hydrophobicity' | 'secondary-structure' | 'chainname' | 'bfactor' | 'residue',
    representation: representation as 'cartoon' | 'surface' | 'ball-stick' | 'spacefill' | 'ribbon',
    quality: quality as 'low' | 'medium' | 'high',
    levelOfDetail: true,
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}>
        <Typography variant="h4" gutterBottom>
          🧬 Modern Protein Visualization
        </Typography>
        
        {/* Tab Navigation */}
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mt: 1 }}>
          <Tab 
            icon={<Science />} 
            label="NGL Viewer" 
            iconPosition="start"
          />
          <Tab 
            icon={<ViewInAr />} 
            label="3D Visualization" 
            iconPosition="start"
            disabled
          />
        </Tabs>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Controls Panel */}
        <Paper elevation={2} sx={{ width: 320, p: 2, overflow: 'auto', borderRadius: 0 }}>
          <Typography variant="h6" gutterBottom>
            Visualization Controls
          </Typography>
          
          {/* Representation */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Representation</InputLabel>
            <Select
              value={representation}
              label="Representation"
              onChange={handleRepresentationChange}
            >
              <MenuItem value="cartoon">Cartoon</MenuItem>
              <MenuItem value="ball-stick">Ball & Stick</MenuItem>
              <MenuItem value="surface">Surface</MenuItem>
              <MenuItem value="spacefill">Space Fill</MenuItem>
              <MenuItem value="ribbon">Ribbon</MenuItem>
            </Select>
          </FormControl>

          {/* Color Scheme */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Color Scheme</InputLabel>
            <Select
              value={colorScheme}
              label="Color Scheme"
              onChange={handleColorSchemeChange}
            >
              <MenuItem value="cpk">CPK (Elements)</MenuItem>
              <MenuItem value="hydrophobicity">Hydrophobicity</MenuItem>
              <MenuItem value="secondary-structure">Secondary Structure</MenuItem>
              <MenuItem value="chainname">By Chain</MenuItem>
              <MenuItem value="bfactor">B-factor</MenuItem>
              <MenuItem value="residuename">By Residue</MenuItem>
            </Select>
          </FormControl>

          {/* Quality */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Rendering Quality</InputLabel>
            <Select
              value={quality}
              label="Rendering Quality"
              onChange={handleQualityChange}
            >
              <MenuItem value="low">Low (Fast)</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High (Slow)</MenuItem>
            </Select>
          </FormControl>

          {/* File Upload */}
          <Box sx={{ mb: 3 }}>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? '#f0f0f0' : 'transparent',
                '&:hover': { backgroundColor: '#f8f8f8' },
              }}
            >
              <input {...getInputProps()} />
              <Upload sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {isDragActive ? 'Drop PDB file here' : 'Drag & drop PDB file or click'}
              </Typography>
            </Box>
          </Box>

          {/* Sample Proteins */}
          <Typography variant="h6" gutterBottom>
            Load Sample Proteins
          </Typography>
          <Grid container spacing={1}>
            {sampleProteins.map((sample) => (
              <Grid item xs={6} key={sample.id}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => handleLoadSample(sample.id)}
                  disabled={loading}
                  sx={{ mb: 1, fontSize: '0.75rem' }}
                >
                  {sample.id}
                </Button>
              </Grid>
            ))}
          </Grid>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Protein Info */}
          {currentProtein && (
            <Card sx={{ mt: 2 }} variant="outlined">
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  {currentProtein.name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Atoms:</strong> {currentProtein.atoms?.length || 0}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Residues:</strong> {currentProtein.residues?.length || 0}
                </Typography>
                <Typography variant="body2">
                  <strong>Chains:</strong> {currentProtein.chains?.length || 0}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Paper>

        {/* Visualization Panel */}
        <Box sx={{ flex: 1, position: 'relative', backgroundColor: '#fafafa' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: 2,
                borderRadius: 1,
              }}
            >
              <CircularProgress size={24} />
              <Typography>Loading protein structure...</Typography>
            </Box>
          )}

          {activeTab === 0 && (
            <Box sx={{ width: '100%', height: '100%' }}>
              {!currentProtein && !loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                  }}
                >
                  <Science sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    No Protein Loaded
                  </Typography>
                  <Typography variant="body1">
                    Upload a PDB file or select a sample protein to begin visualization
                  </Typography>
                </Box>
              ) : currentProtein ? (
                <NGLViewer
                  protein={currentProtein}
                  renderOptions={renderOptions}
                  width={window.innerWidth - 320}
                  height={window.innerHeight - 150}
                  onError={(error) => setError(error.message)}
                />
              ) : null}
            </Box>
          )}

          {activeTab === 1 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
              }}
            >
              <ViewInAr sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Advanced 3D Visualization
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                React Three Fiber integration coming soon
              </Typography>
              <Alert severity="info" sx={{ maxWidth: 400 }}>
                This feature will include interactive 3D protein manipulation, 
                animation controls, and advanced rendering effects.
              </Alert>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ModernProteinViewer;
