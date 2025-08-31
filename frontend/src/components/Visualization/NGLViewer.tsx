/**
 * NGL Viewer component for advanced protein visualization
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage } from 'ngl';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  IconButton, 
  Tooltip, 
  Typography 
} from '@mui/material';
import { 
  Fullscreen, 
  FullscreenExit, 
  CameraAlt, 
  Refresh,
  ZoomIn,
  ZoomOut
} from '@mui/icons-material';
import { ProteinStructure, RenderOptions } from '../../types';

interface NGLViewerProps {
  protein?: ProteinStructure;
  renderOptions: RenderOptions;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
  onLoad?: () => void;
  onAtomClick?: (atomId: number) => void;
  onResidueClick?: (residueId: string) => void;
}

interface ViewerState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  isFullscreen: boolean;
}

export const NGLViewer: React.FC<NGLViewerProps> = ({
  protein,
  renderOptions,
  width = 800,
  height = 600,
  onError,
  onLoad,
  onAtomClick,
  onResidueClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const componentRef = useRef<any>(null);

  const [state, setState] = useState<ViewerState>({
    isLoading: false,
    error: null,
    isInitialized: false,
    isFullscreen: false,
  });

  // Initialize NGL Stage
  const initializeStage = useCallback(() => {
    if (!mountRef.current) return;

    try {
      // Create NGL Stage
      const stage = new Stage(mountRef.current, {
        backgroundColor: '#f5f5f5',
        quality: renderOptions.quality || 'medium',
        sampleLevel: 2,
        workerDefault: true,
        impostor: true,
        ambientColor: 0x666666,
        ambientIntensity: 0.8,
        lightColor: 0xffffff,
        lightIntensity: 1.5,
      });

      stage.setSize(width.toString(), height.toString());
      stageRef.current = stage;

      setState(prev => ({ ...prev, isInitialized: true, error: null }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize NGL viewer';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [width, height, renderOptions.quality, onError]);

  // Convert protein structure to PDB format string
  const convertToPDBString = useCallback((proteinData: ProteinStructure): string => {
    if (!proteinData || !proteinData.atoms || !Array.isArray(proteinData.atoms)) {
      throw new Error('Invalid protein data: missing atoms array');
    }

    let pdbString = '';

    // Add header
    const classification = proteinData.metadata?.classification || 'UNKNOWN';
    const date = new Date().toISOString().slice(0, 10);
    const pdbId = proteinData.id || 'UNKN';
    pdbString += `HEADER    ${classification.padEnd(40)}${date}   ${pdbId}\n`;
    
    const title = proteinData.metadata?.title || proteinData.name || 'Unknown Protein';
    pdbString += `TITLE     ${title}\n`;

    // Add atoms
    proteinData.atoms.forEach((atom, index) => {
      if (!atom || !atom.position) return;

      const residues = proteinData.residues || [];
      const residue = residues.find(r => r && r.id === atom.residueId);
      
      const residueName = residue?.name || 'ALA';
      const residuePosition = residue?.position || Math.floor(index / 4) + 1;
      const chainId = atom.chainId || 'A';
      const element = atom.element || atom.name?.charAt(0) || 'C';

      const x = typeof atom.position.x === 'number' ? atom.position.x : 0;
      const y = typeof atom.position.y === 'number' ? atom.position.y : 0;
      const z = typeof atom.position.z === 'number' ? atom.position.z : 0;

      const record = 'ATOM  ';
      const atomNum = (index + 1).toString().padStart(5, ' ');
      const atomName = (atom.name || element).padEnd(4, ' ');
      const altLoc = ' ';
      const resName = residueName.padEnd(3, ' ');
      const resNum = residuePosition.toString().padStart(4, ' ');
      const iCode = ' ';
      const xStr = x.toFixed(3).padStart(8, ' ');
      const yStr = y.toFixed(3).padStart(8, ' ');
      const zStr = z.toFixed(3).padStart(8, ' ');
      const occupancy = '  1.00';
      const bFactor = ' 20.00';
      const elementStr = element.padStart(12, ' ');

      const line = `${record}${atomNum} ${atomName}${altLoc}${resName} ${chainId}${resNum}${iCode}   ${xStr}${yStr}${zStr}${occupancy}${bFactor}${elementStr}`;
      pdbString += line + '\n';
    });

    pdbString += 'END\n';
    return pdbString;
  }, []);

  // Apply representation to NGL component
  const applyRepresentation = useCallback((component: any, options: RenderOptions) => {
    if (!component || !options) return;

    try {
      if (component.removeAllRepresentations) {
        component.removeAllRepresentations();
      }

      const representationType = options.representation || 'cartoon';
      const colorScheme = options.colorScheme || 'element';
      const quality = options.quality || 'medium';

      let reprType = '';
      let reprParams: any = {};

      switch (representationType) {
        case 'cartoon':
          reprType = 'cartoon';
          reprParams = {
            colorScheme: colorScheme === 'cpk' ? 'element' : colorScheme,
            quality: quality,
            radiusScale: 1.5,
          };
          break;
        
        case 'ball-stick':
          reprType = 'ball+stick';
          reprParams = {
            colorScheme: colorScheme === 'cpk' ? 'element' : colorScheme,
            quality: quality,
            bondScale: 0.4,
            radiusScale: 1.0,
          };
          break;
        
        case 'surface':
          reprType = 'surface';
          reprParams = {
            colorScheme: colorScheme === 'cpk' ? 'element' : colorScheme,
            quality: quality,
            surfaceType: 'av',
            opacity: 0.8,
          };
          break;

        case 'spacefill':
          reprType = 'spacefill';
          reprParams = {
            colorScheme: colorScheme === 'cpk' ? 'element' : colorScheme,
            quality: quality,
            radiusScale: 1.0,
          };
          break;

        default:
          reprType = 'cartoon';
          reprParams = {
            colorScheme: 'element',
            quality: 'medium',
            radiusScale: 1.5,
          };
      }

      const representation = component.addRepresentation(reprType, reprParams);
      if (!representation) {
        throw new Error(`Failed to create ${reprType} representation`);
      }

    } catch (error) {
      console.error('Error applying representation:', error);
      // Fallback to basic cartoon
      try {
        component.addRepresentation('cartoon', {
          colorScheme: 'element',
          quality: 'medium',
        });
      } catch (fallbackError) {
        console.error('Failed to apply fallback representation:', fallbackError);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to display protein structure. Please try a different representation.' 
        }));
      }
    }
  }, []);

  // Load protein structure
  const loadProtein = useCallback(async (proteinData: ProteinStructure) => {
    if (!stageRef.current || !proteinData) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (stageRef.current.removeAllComponents) {
        stageRef.current.removeAllComponents();
      }
      componentRef.current = null;

      if (!proteinData.atoms || !Array.isArray(proteinData.atoms) || proteinData.atoms.length === 0) {
        setState(prev => ({ ...prev, error: 'No 3D structure data available for this protein', isLoading: false }));
        return;
      }

      const pdbString = convertToPDBString(proteinData);
      const blob = new Blob([pdbString], { type: 'text/plain' });
      const file = new File([blob], `${proteinData.name || 'protein'}.pdb`, { type: 'text/plain' });

      const component = await stageRef.current.loadFile(file);
      if (!component) {
        throw new Error('NGL viewer failed to create component from protein data');
      }

      componentRef.current = component;

      setTimeout(() => {
        try {
          applyRepresentation(component, renderOptions);
        } catch (reprError) {
          console.warn('Failed to apply initial representation:', reprError);
          component.addRepresentation('cartoon', { colorScheme: 'element' });
        }
      }, 200);

      setTimeout(() => {
        if (stageRef.current && stageRef.current.autoView) {
          stageRef.current.autoView(1500);
        }
      }, 300);

      setState(prev => ({ ...prev, isLoading: false }));
      onLoad?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load protein';
      console.error('NGLViewer error:', error);
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [renderOptions, onError, onLoad, convertToPDBString, applyRepresentation]);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!mountRef.current) return;

    if (!state.isFullscreen) {
      if (mountRef.current.requestFullscreen) {
        mountRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [state.isFullscreen]);

  // Handle screenshot
  const takeScreenshot = useCallback(() => {
    if (!stageRef.current) return;

    stageRef.current.makeImage({
      factor: 2,
      antialias: true,
      trim: false,
      transparent: false,
    }).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${protein?.name || 'protein'}_screenshot.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }, [protein]);

  // Handle zoom
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!stageRef.current) return;

    const viewer = stageRef.current.viewer;
    const camera = viewer.camera;
    const factor = direction === 'in' ? 0.8 : 1.2;
    
    camera.zoom *= factor;
    viewer.requestRender();
  }, []);

  // Handle reset view
  const resetView = useCallback(() => {
    if (!stageRef.current) return;
    stageRef.current.autoView(1000);
  }, []);

  // Handle resize
  const handleResize = useCallback(() => {
    if (!stageRef.current) return;

    const newWidth = mountRef.current?.clientWidth || width;
    const newHeight = mountRef.current?.clientHeight || height;
    
    stageRef.current.setSize(newWidth, newHeight);
  }, [width, height]);

  // Initialize stage on mount
  useEffect(() => {
    initializeStage();

    const handleFullscreenChange = () => {
      setState(prev => ({ 
        ...prev, 
        isFullscreen: !!document.fullscreenElement 
      }));
      setTimeout(handleResize, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
      
      if (stageRef.current) {
        stageRef.current.dispose();
      }
    };
  }, [initializeStage, handleResize]);

  // Load protein when it changes
  useEffect(() => {
    if (protein && state.isInitialized && stageRef.current) {
      if (protein.atoms && Array.isArray(protein.atoms) && protein.atoms.length > 0) {
        loadProtein(protein);
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'Invalid protein data: no atomic coordinates found' 
        }));
      }
    }
  }, [protein, state.isInitialized, loadProtein]);

  // Update representation when render options change
  useEffect(() => {
    if (componentRef.current && state.isInitialized && !state.isLoading) {
      try {
        applyRepresentation(componentRef.current, renderOptions);
        setTimeout(() => {
          if (stageRef.current) {
            stageRef.current.autoView(1000);
          }
        }, 200);
      } catch (error) {
        console.error('Error updating representation:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to update visualization. Please try a different representation.' 
        }));
        onError?.(error instanceof Error ? error : new Error('Representation update failed'));
      }
    }
  }, [renderOptions, state.isInitialized, state.isLoading, applyRepresentation, onError]);

  // Early return if no protein data
  if (!protein && !state.isLoading && !state.error) {
    return (
      <Box
        sx={{
          position: 'relative',
          width: state.isFullscreen ? '100vw' : width,
          height: state.isFullscreen ? '100vh' : height,
          border: state.isFullscreen ? 'none' : '1px solid #ccc',
          borderRadius: state.isFullscreen ? 0 : 1,
          overflow: 'hidden',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <Typography variant="h6">No protein data available</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: state.isFullscreen ? '100vw' : width,
        height: state.isFullscreen ? '100vh' : height,
        border: state.isFullscreen ? 'none' : '1px solid #ccc',
        borderRadius: state.isFullscreen ? 0 : 1,
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />

      {/* Control buttons */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 1,
          padding: 0.5,
        }}
      >
        <Tooltip title="Zoom In">
          <IconButton
            size="small"
            onClick={() => handleZoom('in')}
            sx={{ color: 'white' }}
          >
            <ZoomIn />
          </IconButton>
        </Tooltip>

        <Tooltip title="Zoom Out">
          <IconButton
            size="small"
            onClick={() => handleZoom('out')}
            sx={{ color: 'white' }}
          >
            <ZoomOut />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset View">
          <IconButton
            size="small"
            onClick={resetView}
            sx={{ color: 'white' }}
          >
            <Refresh />
          </IconButton>
        </Tooltip>

        <Tooltip title="Take Screenshot">
          <IconButton
            size="small"
            onClick={takeScreenshot}
            sx={{ color: 'white' }}
          >
            <CameraAlt />
          </IconButton>
        </Tooltip>

        <Tooltip title={state.isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
          <IconButton
            size="small"
            onClick={toggleFullscreen}
            sx={{ color: 'white' }}
          >
            {state.isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {state.isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
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

      {state.error && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 80,
          }}
        >
          <Alert 
            severity="error" 
            onClose={() => setState(prev => ({ ...prev, error: null }))}
          >
            {state.error}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default NGLViewer;