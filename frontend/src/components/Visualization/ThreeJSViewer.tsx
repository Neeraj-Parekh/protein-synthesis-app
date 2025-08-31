/**
 * Three.js wrapper component for 3D protein visualization
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Box, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material';
import { 
  Refresh,
  ZoomIn,
  ZoomOut,
  CameraAlt 
} from '@mui/icons-material';
import { ProteinStructure, RenderOptions } from '../../types';

interface ThreeJSViewerProps {
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
}

export const ThreeJSViewer: React.FC<ThreeJSViewerProps> = ({
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
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const [state, setState] = useState<ViewerState>({
    isLoading: false,
    error: null,
    isInitialized: false,
  });

  // Initialize Three.js scene
  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    try {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        1000
      );
      camera.position.set(0, 0, 50);
      cameraRef.current = camera;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true 
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      // Add renderer to DOM
      mountRef.current.appendChild(renderer.domElement);

      // Create raycaster for mouse interactions
      raycasterRef.current = new THREE.Raycaster();

      // Add lights
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0xffffff, 0.5);
      pointLight.position.set(-10, -10, -5);
      scene.add(pointLight);

      // Initialize controls (we'll add OrbitControls later)
      setupControls();

      // Add event listeners
      renderer.domElement.addEventListener('click', handleMouseClick);
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('resize', handleResize);

      setState(prev => ({ ...prev, isInitialized: true, error: null }));

      // Start render loop
      animate();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize 3D viewer';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [width, height, onError]);

  // Setup camera controls
  const setupControls = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return;

    // Basic mouse controls implementation
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown || !cameraRef.current) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      // Rotate camera around the origin
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(cameraRef.current.position);
      
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;
      
      // Limit phi to prevent flipping
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      cameraRef.current.position.setFromSpherical(spherical);
      cameraRef.current.lookAt(0, 0, 0);

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!cameraRef.current) return;
      
      const scale = event.deltaY > 0 ? 1.1 : 0.9;
      cameraRef.current.position.multiplyScalar(scale);
      
      // Limit zoom
      const distance = cameraRef.current.position.length();
      if (distance < 5) {
        cameraRef.current.position.normalize().multiplyScalar(5);
      } else if (distance > 200) {
        cameraRef.current.position.normalize().multiplyScalar(200);
      }
    };

    const canvas = rendererRef.current.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel);

    // Store cleanup function
    controlsRef.current = () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Handle mouse interactions
  const handleMouseClick = useCallback((event: MouseEvent) => {
    if (!raycasterRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      const intersected = intersects[0];
      const userData = intersected.object.userData;

      if (userData.atomId) {
        onAtomClick?.(userData.atomId);
      } else if (userData.residueId) {
        onResidueClick?.(userData.residueId);
      }
    }
  }, [onAtomClick, onResidueClick]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Update mouse position for raycasting
    if (!mountRef.current) return;
    
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }, []);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return;

    const newWidth = mountRef.current?.clientWidth || width;
    const newHeight = mountRef.current?.clientHeight || height;

    cameraRef.current.aspect = newWidth / newHeight;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(newWidth, newHeight);
  }, [width, height]);

  // Animation loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    animationIdRef.current = requestAnimationFrame(animate);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, []);

  // Load protein structure
  const loadProtein = useCallback(async (proteinData: ProteinStructure) => {
    if (!sceneRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Clear existing protein objects
      const objectsToRemove = sceneRef.current.children.filter(
        child => child.userData.isProtein
      );
      objectsToRemove.forEach(obj => sceneRef.current!.remove(obj));

      // Create protein visualization based on render options
      await createProteinVisualization(proteinData);

      // Center camera on protein
      centerCameraOnProtein(proteinData);

      setState(prev => ({ ...prev, isLoading: false }));
      onLoad?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load protein';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [renderOptions, onLoad, onError]);

  // Create protein visualization
  const createProteinVisualization = useCallback(async (proteinData: ProteinStructure) => {
    if (!sceneRef.current) return;

    const group = new THREE.Group();
    group.userData.isProtein = true;

    // Create atoms based on render options
    if (renderOptions.representation === 'ball-stick') {
      createBallStickRepresentation(proteinData, group);
    } else if (renderOptions.representation === 'cartoon') {
      createCartoonRepresentation(proteinData, group);
    } else if (renderOptions.representation === 'surface') {
      createSurfaceRepresentation(proteinData, group);
    }

    sceneRef.current.add(group);
  }, [renderOptions]);

  // Create ball-and-stick representation
  const createBallStickRepresentation = useCallback((proteinData: ProteinStructure, group: THREE.Group) => {
    const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const bondGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);

    proteinData.atoms.forEach(atom => {
      // Create atom sphere
      const atomMaterial = new THREE.MeshLambertMaterial({
        color: getAtomColor(atom.element, renderOptions.colorScheme)
      });

      const atomMesh = new THREE.Mesh(atomGeometry, atomMaterial);
      atomMesh.position.set(atom.position.x, atom.position.y, atom.position.z);
      atomMesh.userData = { atomId: atom.id, residueId: atom.residueId };

      group.add(atomMesh);
    });

    // Add bonds if available
    if (proteinData.bonds) {
      proteinData.bonds.forEach(bond => {
        const atom1 = proteinData.atoms.find(a => a.id === bond.atom1Id);
        const atom2 = proteinData.atoms.find(a => a.id === bond.atom2Id);

        if (atom1 && atom2) {
          const bondMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
          const bondMesh = new THREE.Mesh(bondGeometry, bondMaterial);

          // Position and orient bond
          const start = new THREE.Vector3(atom1.position.x, atom1.position.y, atom1.position.z);
          const end = new THREE.Vector3(atom2.position.x, atom2.position.y, atom2.position.z);
          const center = start.clone().add(end).multiplyScalar(0.5);
          const direction = end.clone().sub(start);

          bondMesh.position.copy(center);
          bondMesh.lookAt(end);
          bondMesh.rotateX(Math.PI / 2);
          bondMesh.scale.y = direction.length();

          group.add(bondMesh);
        }
      });
    }
  }, [renderOptions]);

  // Create cartoon representation (simplified)
  const createCartoonRepresentation = useCallback((proteinData: ProteinStructure, group: THREE.Group) => {
    // This is a simplified cartoon representation
    // In a full implementation, you'd create ribbons for secondary structures
    
    proteinData.chains.forEach(chain => {
      const points: THREE.Vector3[] = [];
      
      // Get backbone atoms (CA atoms) to create the chain path
      chain.residues.forEach(residue => {
        const caAtom = residue.atoms.find(atom => atom.name === 'CA');
        if (caAtom) {
          points.push(new THREE.Vector3(caAtom.position.x, caAtom.position.y, caAtom.position.z));
        }
      });

      if (points.length > 1) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, points.length * 2, 0.5, 8, false);
        const tubeMaterial = new THREE.MeshLambertMaterial({
          color: getChainColor(chain.id, renderOptions.colorScheme)
        });

        const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tubeMesh.userData = { chainId: chain.id };
        group.add(tubeMesh);
      }
    });
  }, [renderOptions]);

  // Create surface representation (placeholder)
  const createSurfaceRepresentation = useCallback((proteinData: ProteinStructure, group: THREE.Group) => {
    // This would require a molecular surface calculation algorithm
    // For now, create a simplified representation
    createBallStickRepresentation(proteinData, group);
  }, [renderOptions]);

  // Get atom color based on element and color scheme
  const getAtomColor = useCallback((element: string, colorScheme: string): number => {
    if (colorScheme === 'cpk') {
      const cpkColors: Record<string, number> = {
        'C': 0x909090,  // Carbon - gray
        'N': 0x3050F8,  // Nitrogen - blue
        'O': 0xFF0D0D,  // Oxygen - red
        'S': 0xFFFF30,  // Sulfur - yellow
        'P': 0xFF8000,  // Phosphorus - orange
        'H': 0xFFFFFF,  // Hydrogen - white
      };
      return cpkColors[element] || 0x909090;
    }
    
    // Default to gray for other color schemes (would implement hydrophobicity, etc.)
    return 0x909090;
  }, []);

  // Get chain color
  const getChainColor = useCallback((chainId: string, _colorScheme: string): number => {
    // Simple chain coloring
    const colors = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4, 0xFECA57, 0xFF9FF3];
    const index = chainId.charCodeAt(0) % colors.length;
    return colors[index];
  }, []);

  // Center camera on protein
  const centerCameraOnProtein = useCallback((proteinData: ProteinStructure) => {
    if (!cameraRef.current) return;

    const center = proteinData.boundingBox.center;
    const size = proteinData.boundingBox.size;
    const maxDim = Math.max(size.x, size.y, size.z);

    // Position camera to view the entire protein with better framing
    const distance = maxDim * 2.5; // Slightly further back for better view
    cameraRef.current.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance
    );
    cameraRef.current.lookAt(center.x, center.y, center.z);
    
    // Update controls target if available
    if (controlsRef.current && controlsRef.current.target) {
      controlsRef.current.target.set(center.x, center.y, center.z);
      controlsRef.current.update();
    }
  }, []);

  // Handle zoom
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!cameraRef.current) return;

    const factor = direction === 'in' ? 0.8 : 1.2;
    cameraRef.current.position.multiplyScalar(factor);
    
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    if (protein) {
      centerCameraOnProtein(protein);
    }
  }, [protein, centerCameraOnProtein]);

  // Take screenshot
  const takeScreenshot = useCallback(() => {
    if (!rendererRef.current) return;

    // Render the scene
    if (sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    // Get the canvas and create download link
    const canvas = rendererRef.current.domElement;
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${protein?.name || 'protein'}_screenshot.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  }, [protein]);

  // Initialize scene on mount
  useEffect(() => {
    initializeScene();

    return () => {
      // Cleanup
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (controlsRef.current) {
        controlsRef.current();
      }

      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('click', handleMouseClick);
        rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        
        if (mountRef.current && rendererRef.current.domElement.parentNode) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }

      if (sceneRef.current) {
        sceneRef.current.clear();
      }
    };
  }, [initializeScene, handleMouseClick, handleMouseMove, handleResize]);

  // Load protein when it changes
  useEffect(() => {
    if (protein && state.isInitialized) {
      loadProtein(protein);
    }
  }, [protein, state.isInitialized, loadProtein]);

  // Update visualization when render options change
  useEffect(() => {
    if (protein && state.isInitialized) {
      loadProtein(protein);
    }
  }, [renderOptions, protein, state.isInitialized, loadProtein]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: width,
        height: height,
        border: '1px solid #ccc',
        borderRadius: 1,
        overflow: 'hidden',
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
          Loading protein...
        </Box>
      )}

      {state.error && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
          }}
        >
          <Alert severity="error" onClose={() => setState(prev => ({ ...prev, error: null }))}>
            {state.error}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default ThreeJSViewer;