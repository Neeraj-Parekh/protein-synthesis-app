import React, { useState, useCallback, useRef, useEffect } from 'react';
// Temporarily disabled React Three Fiber to fix React shared internals conflict
// import { Canvas } from '@react-three/fiber';
// import { OrbitControls, Environment, PerspectiveCamera, Grid, Html } from '@react-three/drei';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Fab, 
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Card,
  CardContent,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Animation as AnimationIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ViewInAr as ViewIcon,
  Fullscreen as FullscreenIcon,
  Science as ScienceIcon,
  AutoAwesome as AIIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useDropzone } from 'react-dropzone';

import { loadPDBFromFile, loadSampleProtein, SAMPLE_PROTEINS } from '@/utils/pdbLoader';
import { ProteinStructure } from '@/types';

// Modern Protein Mesh Component using React Three Fiber
const ModernProteinMesh: React.FC<{ protein: ProteinStructure; colorScheme: string; representation: string }> = ({ 
  protein, 
  colorScheme, 
  representation 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState(false);

  const atomData = React.useMemo(() => {
    if (!protein?.atoms) return { positions: [], colors: [], scales: [] };
    
    const positions: number[] = [];
    const colors: number[] = [];
    const scales: number[] = [];
    
    protein.atoms.forEach((atom) => {
      positions.push(atom.position.x, atom.position.y, atom.position.z);
      
      // Enhanced color schemes
      const color = new THREE.Color();
      switch (colorScheme) {
        case 'cpk':
          switch (atom.element) {
            case 'C': color.setRGB(0.2, 0.2, 0.2); break;
            case 'N': color.setRGB(0.1, 0.1, 0.9); break;
            case 'O': color.setRGB(0.9, 0.1, 0.1); break;
            case 'S': color.setRGB(0.9, 0.9, 0.1); break;
            case 'P': color.setRGB(0.9, 0.5, 0.1); break;
            default: color.setRGB(0.5, 0.5, 0.5);
          }
          break;
        case 'rainbow': {
          const hue = (atom.position.z + 50) / 100;
          color.setHSL(hue, 1, 0.5);
          break;
        }
        default:
          color.setRGB(0.7, 0.7, 0.9);
      }
      
      colors.push(color.r, color.g, color.b);
      
      // Scale based on atom type and representation
      const baseScale = representation === 'spacefill' ? 1.5 : 0.8;
      const elementScale = atom.element === 'H' ? 0.5 : 1.0;
      scales.push(baseScale * elementScale);
    });
    
    return { positions, colors, scales };
  }, [protein, colorScheme, representation]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, protein?.atoms?.length || 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshPhysicalMaterial
        roughness={0.3}
        metalness={0.1}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        envMapIntensity={0.5}
      />
      
      {protein?.atoms?.map((atom, i) => (
        <mesh key={i} position={[atom.position.x, atom.position.y, atom.position.z]}>
          <sphereGeometry args={[atomData.scales[i] || 0.8, 16, 16]} />
          <meshPhysicalMaterial
            color={new THREE.Color(atomData.colors[i * 3], atomData.colors[i * 3 + 1], atomData.colors[i * 3 + 2])}
            roughness={0.3}
            metalness={0.1}
            transparent={hovered}
            opacity={hovered ? 0.8 : 1.0}
          />
        </mesh>
      ))}
    </instancedMesh>
  );
};

// Main Modern Visualization Component
export const ModernVisualizationPage: React.FC = () => {
  const [protein, setProtein] = useState<ProteinStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Visualization settings
  const [settings, setSettings] = useState({
    colorScheme: 'cpk',
    representation: 'ball-stick',
    quality: 'high',
    environment: 'studio',
    animationSpeed: 1.0,
    showGrid: false,
    autoRotate: false,
    wireframe: false,
    transparency: 1.0
  });

  // Camera controls ref
  const controlsRef = useRef<any>(null);

  // File drop handling
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
      setProtein(loadedProtein);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load protein');
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

  // Load sample protein
  const loadSample = useCallback(async (pdbId: string) => {
    setLoading(true);
    setError(null);

    try {
      const loadedProtein = await loadSampleProtein(pdbId as any, {
        includeHydrogens: false,
        includeWater: false,
        includeHetero: true,
      });
      setProtein(loadedProtein);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample protein');
    } finally {
      setLoading(false);
    }
  }, []);

  // Animation controls
  const toggleAnimation = useCallback(() => {
    setIsAnimating(!isAnimating);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !isAnimating;
    }
  }, [isAnimating]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Reset view
  const resetView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  // Export functionality
  const exportImage = useCallback(() => {
    // TODO: Implement canvas export
    console.log('Exporting image...');
  }, []);

  // Speed dial actions
  const speedDialActions = [
    { icon: <UploadIcon />, name: 'Upload PDB', onClick: () => document.getElementById('file-upload')?.click() },
    { icon: <DownloadIcon />, name: 'Export Image', onClick: exportImage },
    { icon: <RefreshIcon />, name: 'Reset View', onClick: resetView },
    { icon: <FullscreenIcon />, name: 'Fullscreen', onClick: toggleFullscreen },
  ];

  return (
    <Box 
      sx={{ 
        height: '100vh', 
        width: '100%', 
        position: 'relative',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Temporarily disabled 3D Canvas due to React conflicts */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 1
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            🧬 Advanced 3D Visualization
          </Typography>
          <Typography variant="body1" color="text.secondary">
            React Three Fiber integration temporarily disabled due to dependency conflicts.
            <br />
            This will be restored in the next update with proper React 18 compatibility.
          </Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2 }}
            onClick={() => window.location.href = '/visualization'}
          >
            Use NGL Viewer Instead
          </Button>
        </Paper>
      </Box>

      {/* File Drop Overlay */}
      {!protein && (
        <Box
          {...getRootProps()}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDragActive ? 'rgba(0,0,0,0.3)' : 'transparent',
            border: isDragActive ? '3px dashed #fff' : 'none',
            borderRadius: 2,
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            zIndex: isDragActive ? 10 : 0,
          }}
        >
          <input {...getInputProps()} id="file-upload" />
          
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card sx={{ 
                backgroundColor: 'rgba(255,255,255,0.9)', 
                backdropFilter: 'blur(10px)',
                maxWidth: 500,
                mx: 2
              }}>
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <ViewIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h4" gutterBottom>
                    Modern Protein Visualization
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Experience next-generation 3D protein visualization with advanced rendering,
                    interactive controls, and AI-powered analysis.
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 3 }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<UploadIcon />}
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Upload PDB File
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<ScienceIcon />}
                      onClick={() => loadSample('1crn')}
                    >
                      Load Sample
                    </Button>
                  </Box>
                  
                  {/* Quick Samples */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Quick Samples:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {Object.entries(SAMPLE_PROTEINS).slice(0, 4).map(([pdbId, info]) => (
                        <Chip
                          key={pdbId}
                          label={`${info.name} (${pdbId})`}
                          onClick={() => loadSample(pdbId)}
                          clickable
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </Box>
      )}

      {/* Modern Control Panel */}
      <AnimatePresence>
        {protein && (
          <>
            {/* Top Bar */}
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              transition={{ type: "spring", stiffness: 100 }}
            >
              <Paper 
                sx={{ 
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  right: 16,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  p: 2,
                  borderRadius: 2,
                  zIndex: 1000
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => setControlsOpen(true)}>
                      <MenuIcon />
                    </IconButton>
                    
                    <Typography variant="h6">{protein.name}</Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={`${protein.atoms.length} atoms`} size="small" />
                      <Chip label={`${protein.residues.length} residues`} size="small" />
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={isAnimating ? "Pause" : "Play"}>
                      <IconButton onClick={toggleAnimation} color={isAnimating ? "primary" : "default"}>
                        {isAnimating ? <PauseIcon /> : <PlayIcon />}
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="AI Analysis">
                      <IconButton>
                        <AIIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Settings">
                      <IconButton onClick={() => setControlsOpen(true)}>
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            </motion.div>

            {/* Speed Dial */}
            <SpeedDial
              ariaLabel="Actions"
              sx={{ position: 'absolute', bottom: 16, right: 16 }}
              icon={<SpeedDialIcon />}
              direction="up"
            >
              {speedDialActions.map((action) => (
                <SpeedDialAction
                  key={action.name}
                  icon={action.icon}
                  tooltipTitle={action.name}
                  onClick={action.onClick}
                />
              ))}
            </SpeedDial>
          </>
        )}
      </AnimatePresence>

      {/* Advanced Controls Drawer */}
      <Drawer
        anchor="left"
        open={controlsOpen}
        onClose={() => setControlsOpen(false)}
        PaperProps={{
          sx: { 
            width: 350,
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">Visualization Controls</Typography>
            <IconButton onClick={() => setControlsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Representation */}
          <Typography variant="subtitle2" gutterBottom>Representation</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {['ball-stick', 'spacefill', 'cartoon', 'surface'].map((rep) => (
              <Chip
                key={rep}
                label={rep}
                clickable
                color={settings.representation === rep ? 'primary' : 'default'}
                onClick={() => setSettings(prev => ({ ...prev, representation: rep }))}
              />
            ))}
          </Box>

          {/* Color Schemes */}
          <Typography variant="subtitle2" gutterBottom>Color Scheme</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {['cpk', 'rainbow', 'hydrophobicity', 'secondary'].map((scheme) => (
              <Chip
                key={scheme}
                label={scheme}
                clickable
                color={settings.colorScheme === scheme ? 'primary' : 'default'}
                onClick={() => setSettings(prev => ({ ...prev, colorScheme: scheme }))}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Environment */}
          <Typography variant="subtitle2" gutterBottom>Environment</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {['studio', 'sunset', 'dawn', 'night', 'forest', 'apartment'].map((env) => (
              <Chip
                key={env}
                label={env}
                clickable
                color={settings.environment === env ? 'primary' : 'default'}
                onClick={() => setSettings(prev => ({ ...prev, environment: env }))}
              />
            ))}
          </Box>

          {/* Animation Speed */}
          <Typography variant="subtitle2" gutterBottom>Animation Speed</Typography>
          <Slider
            value={settings.animationSpeed}
            onChange={(_, value) => setSettings(prev => ({ ...prev, animationSpeed: value as number }))}
            min={0.1}
            max={5.0}
            step={0.1}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 3 }}
          />

          {/* Transparency */}
          <Typography variant="subtitle2" gutterBottom>Transparency</Typography>
          <Slider
            value={settings.transparency}
            onChange={(_, value) => setSettings(prev => ({ ...prev, transparency: value as number }))}
            min={0.1}
            max={1.0}
            step={0.1}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 3 }}
          />

          {/* Toggles */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRotate}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoRotate: e.target.checked }))}
                />
              }
              label="Auto Rotate"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showGrid}
                  onChange={(e) => setSettings(prev => ({ ...prev, showGrid: e.target.checked }))}
                />
              }
              label="Show Grid"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.wireframe}
                  onChange={(e) => setSettings(prev => ({ ...prev, wireframe: e.target.checked }))}
                />
              }
              label="Wireframe Mode"
            />
          </Box>
        </Box>
      </Drawer>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error"
          onClose={() => setError(null)}
          sx={{
            position: 'absolute',
            top: 80,
            left: 16,
            right: 16,
            zIndex: 1001
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ModernVisualizationPage;
