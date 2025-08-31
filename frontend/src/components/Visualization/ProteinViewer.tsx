/**
 * Main protein visualization component that combines Three.js and NGL viewers
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Divider,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ViewInAr,
  Science,
  Upload,
  Download,
  Settings,
  Info,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

import ThreeJSViewer from './ThreeJSViewer';
import NGLViewer from './NGLViewer';
import { ProteinStructure, RenderOptions } from '../../types';
import { loadPDBFromFile, loadSampleProtein, SAMPLE_PDB_URLS, SAMPLE_PROTEINS, SampleProteinInfo, PDBParseError } from '../../utils/pdbLoader';

interface ProteinViewerProps {
  protein?: ProteinStructure;
  onProteinLoad?: (protein: ProteinStructure) => void;
  onError?: (error: Error) => void;
  width?: number;
  height?: number;
  showAdvancedControls?: boolean;
  defaultViewerType?: ViewerType;
}

type ViewerType = 'threejs' | 'ngl';

interface ViewerState {
  isLoading: boolean;
  error: string | null;
  loadingProgress: number;
  selectedSample: string;
}

export const ProteinViewer: React.FC<ProteinViewerProps> = ({
  protein,
  onProteinLoad,
  onError,
  width = 800,
  height = 600,
  showAdvancedControls = true,
  defaultViewerType = 'ngl',
}) => {
  const [viewerType, setViewerType] = useState<ViewerType>(defaultViewerType);
  const [renderOptions, setRenderOptions] = useState<RenderOptions>({
    colorScheme: 'cpk',
    representation: 'cartoon',
    levelOfDetail: true,
    quality: 'medium',
  });
  
  const [state, setState] = useState<ViewerState>({
    isLoading: false,
    error: null,
    loadingProgress: 0,
    selectedSample: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, loadingProgress: 0 }));

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          loadingProgress: Math.min(prev.loadingProgress + 10, 90) 
        }));
      }, 100);

      const loadedProtein = await loadPDBFromFile(file, {
        includeHydrogens: false,
        includeWater: false,
        includeHetero: true,
      });

      clearInterval(progressInterval);
      setState(prev => ({ ...prev, loadingProgress: 100 }));

      setTimeout(() => {
        setState(prev => ({ ...prev, isLoading: false, loadingProgress: 0 }));
        onProteinLoad?.(loadedProtein);
      }, 500);

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load protein',
        loadingProgress: 0 
      }));
      onError?.(error instanceof Error ? error : new Error('Failed to load protein'));
    }
  }, [onProteinLoad, onError]);

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'chemical/x-pdb': ['.pdb'],
      'text/plain': ['.pdb', '.txt'],
    },
    multiple: false,
    disabled: state.isLoading,
  });

  // Handle sample protein loading with smart defaults
  const loadSample = useCallback(async (pdbId: keyof typeof SAMPLE_PDB_URLS) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, loadingProgress: 0, selectedSample: pdbId }));

    try {
      const progressInterval = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          loadingProgress: Math.min(prev.loadingProgress + 5, 90) 
        }));
      }, 200);

      const loadedProtein = await loadSampleProtein(pdbId, {
        includeHydrogens: false,
        includeWater: false,
        includeHetero: true,
      });

      clearInterval(progressInterval);
      
      // Apply smart defaults based on sample protein info
      const sampleInfo = SAMPLE_PROTEINS[pdbId];
      if (sampleInfo) {
        setRenderOptions(prev => ({
          ...prev,
          representation: sampleInfo.recommendedRepresentation,
          colorScheme: sampleInfo.recommendedColorScheme === 'element' ? 'cpk' : 
                      sampleInfo.recommendedColorScheme === 'secondaryStructure' ? 'secondary-structure' :
                      sampleInfo.recommendedColorScheme
        }));
        
        // Use NGL for complex structures, Three.js for simple ones
        if (sampleInfo.difficulty === 'advanced' || sampleInfo.residueCount > 500) {
          setViewerType('ngl');
        } else {
          setViewerType(defaultViewerType);
        }
      }

      setState(prev => ({ ...prev, loadingProgress: 100 }));

      setTimeout(() => {
        setState(prev => ({ ...prev, isLoading: false, loadingProgress: 0 }));
        onProteinLoad?.(loadedProtein);
      }, 500);

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load sample protein',
        loadingProgress: 0,
        selectedSample: ''
      }));
      onError?.(error instanceof Error ? error : new Error('Failed to load sample protein'));
    }
  }, [onProteinLoad, onError, defaultViewerType]);

  // Handle file input click
  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onDrop([file]);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [onDrop]);

  // Handle viewer type change
  const handleViewerTypeChange = useCallback((_: React.MouseEvent<HTMLElement>, newViewerType: ViewerType | null) => {
    if (newViewerType) {
      setViewerType(newViewerType);
    }
  }, []);

  // Handle render option changes
  const handleRenderOptionChange = useCallback((option: keyof RenderOptions, value: any) => {
    setRenderOptions(prev => ({ ...prev, [option]: value }));
  }, []);

  // Handle atom/residue clicks
  const handleAtomClick = useCallback((atomId: number) => {
    console.log('Atom clicked:', atomId);
    // TODO: Implement atom selection logic
  }, []);

  const handleResidueClick = useCallback((residueId: string) => {
    console.log('Residue clicked:', residueId);
    // TODO: Implement residue selection logic
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Controls */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          {/* Viewer Type Toggle */}
          <ToggleButtonGroup
            value={viewerType}
            exclusive
            onChange={handleViewerTypeChange}
            size="small"
          >
            <ToggleButton value="ngl">
              <Science sx={{ mr: 1 }} />
              NGL Viewer
            </ToggleButton>
            <ToggleButton value="threejs">
              <ViewInAr sx={{ mr: 1 }} />
              Three.js
            </ToggleButton>
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Representation */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="representation-label">Representation</InputLabel>
            <Select
              labelId="representation-label"
              value={renderOptions.representation}
              label="Representation"
              onChange={(e) => handleRenderOptionChange('representation', e.target.value)}
            >
              <MenuItem value="cartoon">
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography>Cartoon</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Best for overall structure
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value="ball-stick">
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography>Ball & Stick</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Best for atomic detail
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value="surface">
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography>Surface</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Best for binding sites
                  </Typography>
                </Box>
              </MenuItem>
              {showAdvancedControls && (
                <>
                  <MenuItem value="spacefill">
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography>Spacefill</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Van der Waals volume
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="ribbon">
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography>Ribbon</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Simplified backbone
                      </Typography>
                    </Box>
                  </MenuItem>
                </>
              )}
            </Select>
          </FormControl>

          {/* Color Scheme */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="color-scheme-label">Color Scheme</InputLabel>
            <Select
              labelId="color-scheme-label"
              value={renderOptions.colorScheme}
              label="Color Scheme"
              onChange={(e) => handleRenderOptionChange('colorScheme', e.target.value)}
            >
              <MenuItem value="cpk">
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography>CPK (Elements)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    C=gray, N=blue, O=red
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value="hydrophobicity">
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography>Hydrophobicity</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Hydrophobic=orange, Hydrophilic=blue
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value="secondary-structure">
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography>Secondary Structure</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Helix=red, Sheet=yellow, Coil=gray
                  </Typography>
                </Box>
              </MenuItem>
              {showAdvancedControls && (
                <>
                  <MenuItem value="chainname">
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography>Chain ID</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Different color per chain
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="bfactor">
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography>B-factor</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Blue=rigid, Red=flexible
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="residuename">
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography>Residue Type</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Different color per amino acid
                      </Typography>
                    </Box>
                  </MenuItem>
                </>
              )}
            </Select>
          </FormControl>

          {/* Quality */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="quality-label">Quality</InputLabel>
            <Select
              labelId="quality-label"
              value={renderOptions.quality}
              label="Quality"
              onChange={(e) => handleRenderOptionChange('quality', e.target.value)}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>

          <Divider orientation="vertical" flexItem />

          {/* File Upload */}
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={handleFileUpload}
            disabled={state.isLoading}
          >
            Upload PDB
          </Button>

          {/* Sample Proteins */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="sample-protein-label">Load Sample Protein</InputLabel>
            <Select
              labelId="sample-protein-label"
              value={state.selectedSample}
              label="Load Sample Protein"
              onChange={(e) => loadSample(e.target.value as keyof typeof SAMPLE_PDB_URLS)}
              disabled={state.isLoading}
            >
              {/* Beginner Samples */}
              <MenuItem disabled>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  🟢 BEGINNER - Small & Clear Structure
                </Typography>
              </MenuItem>
              {Object.entries(SAMPLE_PROTEINS)
                .filter(([_, info]) => info.difficulty === 'beginner')
                .map(([pdbId, info]) => (
                  <MenuItem key={pdbId} value={pdbId}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.5 }}>
                      <Typography>{info.name} ({pdbId})</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {info.residueCount} residues • {info.category}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              
              {/* Intermediate Samples */}
              <MenuItem disabled>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  🟡 INTERMEDIATE - Multi-chain & Complex
                </Typography>
              </MenuItem>
              {Object.entries(SAMPLE_PROTEINS)
                .filter(([_, info]) => info.difficulty === 'intermediate')
                .map(([pdbId, info]) => (
                  <MenuItem key={pdbId} value={pdbId}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.5 }}>
                      <Typography>{info.name} ({pdbId})</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {info.residueCount} residues • {info.category}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              
              {/* Advanced Samples */}
              {showAdvancedControls && (
                <>
                  <MenuItem disabled>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      🔴 ADVANCED - Large & Specialized
                    </Typography>
                  </MenuItem>
                  {Object.entries(SAMPLE_PROTEINS)
                    .filter(([_, info]) => info.difficulty === 'advanced')
                    .map(([pdbId, info]) => (
                      <MenuItem key={pdbId} value={pdbId}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.5 }}>
                          <Typography>{info.name} ({pdbId})</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {info.residueCount} residues • {info.category}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                </>
              )}
            </Select>
          </FormControl>
        </Box>

        {/* Loading Progress */}
        {state.isLoading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={state.loadingProgress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading protein structure... {state.loadingProgress}%
            </Typography>
          </Box>
        )}

        {/* Error Display */}
        {state.error && (
          <Alert 
            severity="error" 
            sx={{ mt: 2 }}
            onClose={() => setState(prev => ({ ...prev, error: null }))}
          >
            {state.error}
          </Alert>
        )}
      </Paper>

      {/* Protein Info */}
      {protein && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Info color="primary" />
            <Typography variant="h6">{protein.name}</Typography>
            {state.selectedSample && SAMPLE_PROTEINS[state.selectedSample] && (
              <Chip 
                label={SAMPLE_PROTEINS[state.selectedSample].difficulty.toUpperCase()} 
                size="small"
                color={
                  SAMPLE_PROTEINS[state.selectedSample].difficulty === 'beginner' ? 'success' :
                  SAMPLE_PROTEINS[state.selectedSample].difficulty === 'intermediate' ? 'warning' : 'error'
                }
              />
            )}
          </Box>
          
          {/* Basic Info */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip label={`ID: ${protein.id}`} size="small" />
            <Chip label={`${protein.atoms.length} atoms`} size="small" />
            <Chip label={`${protein.residues.length} residues`} size="small" />
            <Chip label={`${protein.chains.length} chains`} size="small" />
            {protein.metadata.resolution && (
              <Chip label={`${protein.metadata.resolution}Å resolution`} size="small" />
            )}
            {protein.metadata.method && (
              <Chip label={protein.metadata.method} size="small" />
            )}
          </Box>

          {/* Sample Protein Details */}
          {state.selectedSample && SAMPLE_PROTEINS[state.selectedSample] && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                {SAMPLE_PROTEINS[state.selectedSample].description}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mr: 1 }}>
                  Key Features:
                </Typography>
                {SAMPLE_PROTEINS[state.selectedSample].features.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
              
              {/* Recommended Settings Info */}
              <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  💡 Recommended: {SAMPLE_PROTEINS[state.selectedSample].recommendedRepresentation} representation 
                  with {SAMPLE_PROTEINS[state.selectedSample].recommendedColorScheme} coloring
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Viewer */}
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        {/* File Drop Zone */}
        {!protein && (
          <Box
            {...getRootProps()}
            sx={{
              width,
              height,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 1,
              backgroundColor: isDragActive ? 'action.hover' : 'background.default',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {isDragActive ? 'Drop PDB file here' : 'Drag & drop a PDB file'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select a file, or choose a sample protein above
            </Typography>
          </Box>
        )}

        {/* Actual Viewer */}
        {protein && (
          <>
            {viewerType === 'ngl' ? (
              <Box sx={{ position: 'relative' }}>
                <NGLViewer
                  protein={protein}
                  renderOptions={renderOptions}
                  width={width}
                  height={height}
                  onError={(error) => {
                    console.warn('NGL Viewer failed, switching to Three.js:', error);
                    setViewerType('threejs');
                    onError?.(error);
                  }}
                  onAtomClick={handleAtomClick}
                  onResidueClick={handleResidueClick}
                />
              </Box>
            ) : (
              <ThreeJSViewer
                protein={protein}
                renderOptions={renderOptions}
                width={width}
                height={height}
                onError={onError}
                onAtomClick={handleAtomClick}
                onResidueClick={handleResidueClick}
              />
            )}
          </>
        )}
      </Paper>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdb,.txt"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
    </Box>
  );
};

export default ProteinViewer;