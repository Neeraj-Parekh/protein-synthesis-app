## STATE MANAGEMENT WITH REDUX TOOLKIT

### Redux Toolkit Architecture

#### 1. Store Configuration
```typescript
// store/store.ts - Centralized state management
import { configureStore } from '@reduxjs/toolkit';
import proteinReducer from './slices/proteinSlice';
import aiReducer from './slices/aiSlice';
import analysisReducer from './slices/analysisSlice';

export const store = configureStore({
  reducer: {
    proteins: proteinReducer,
    ai: aiReducer,
    analysis: analysisReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Date objects in protein data
        ignoredActions: ['proteins/addProtein/fulfilled'],
        ignoredPaths: ['proteins.proteins.createdAt', 'proteins.proteins.updatedAt'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### 2. Async Thunks with createAsyncThunk
```typescript
// Complex async thunk with error handling and loading states
export const generateProtein = createAsyncThunk(
  'ai/generateProtein',
  async (constraints: GenerationConstraints, { rejectWithValue }) => {
    try {
      const response = await aiAPI.generateProtein(constraints);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Unknown error occurred');
    }
  }
);

// Thunk with conditional execution
export const analyzeProtein = createAsyncThunk(
  'analysis/analyzeProtein',
  async (
    { proteinId, analysisType, options }: AnalysisRequest,
    { getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    
    // Check if analysis already exists
    const existingAnalysis = state.analysis.analyses[proteinId]?.[analysisType];
    if (existingAnalysis && !options?.forceRefresh) {
      return existingAnalysis;
    }
    
    try {
      const response = await analysisAPI.analyzeProtein(proteinId, analysisType, options);
      return { proteinId, analysisType, results: response.data };
    } catch (error) {
      return rejectWithValue(`Analysis failed: ${error.message}`);
    }
  }
);
```

#### 3. Slice with Complex State Logic
```typescript
// proteinSlice.ts - Comprehensive state management
const proteinSlice = createSlice({
  name: 'proteins',
  initialState,
  reducers: {
    // Synchronous actions
    setCurrentProtein: (state, action: PayloadAction<string>) => {
      state.currentProteinId = action.payload;
    },
    updateProteinMetadata: (state, action: PayloadAction<{
      id: string;
      metadata: Partial<ProteinMetadata>;
    }>) => {
      const { id, metadata } = action.payload;
      if (state.proteins[id]) {
        state.proteins[id].metadata = { ...state.proteins[id].metadata, ...metadata };
        state.proteins[id].updatedAt = new Date();
      }
    },
    removeProtein: (state, action: PayloadAction<string>) => {
      delete state.proteins[action.payload];
      if (state.currentProteinId === action.payload) {
        state.currentProteinId = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle async thunk states
      .addCase(uploadProtein.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProtein.fulfilled, (state, action) => {
        state.loading = false;
        // Complex data transformation
        const proteinStructure = {
          ...action.payload,
          atoms: action.payload.atoms || [],
          residues: action.payload.residues || [],
          chains: action.payload.chains || [],
          secondaryStructure: action.payload.secondaryStructure || [],
          boundingBox: action.payload.boundingBox || defaultBoundingBox,
          centerOfMass: action.payload.centerOfMass || { x: 0, y: 0, z: 0 },
          createdAt: new Date(action.payload.created_at),
          updatedAt: new Date(action.payload.created_at),
          metadata: action.payload.metadata || {}
        };
        state.proteins[action.payload.id] = proteinStructure;
        state.currentProteinId = action.payload.id;
      })
      .addCase(uploadProtein.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to upload protein';
      });
  },
});
```

### Advanced Redux Patterns

#### 1. Selector Patterns with Reselect
```typescript
// Memoized selectors for performance optimization
import { createSelector } from '@reduxjs/toolkit';

const selectProteins = (state: RootState) => state.proteins.proteins;
const selectCurrentProteinId = (state: RootState) => state.proteins.currentProteinId;

// Memoized selector that only recalculates when dependencies change
export const selectCurrentProtein = createSelector(
  [selectProteins, selectCurrentProteinId],
  (proteins, currentId) => currentId ? proteins[currentId] : null
);

// Complex derived state calculation
export const selectProteinStatistics = createSelector(
  [selectProteins],
  (proteins) => {
    const proteinArray = Object.values(proteins);
    return {
      totalProteins: proteinArray.length,
      averageLength: proteinArray.reduce((sum, p) => sum + p.sequence.length, 0) / proteinArray.length,
      totalAtoms: proteinArray.reduce((sum, p) => sum + p.atoms.length, 0),
      methodDistribution: proteinArray.reduce((acc, p) => {
        const method = p.metadata.method || 'Unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
);
```

#### 2. RTK Query for API State Management
```typescript
// api/proteinApi.ts - Automated API state management
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const proteinApi = createApi({
  reducerPath: 'proteinApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/proteins/',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Protein', 'Analysis'],
  endpoints: (builder) => ({
    // Query with automatic caching and refetching
    getProteins: builder.query<ProteinStructure[], void>({
      query: () => '',
      providesTags: ['Protein'],
      transformResponse: (response: ProteinResponse[]) => 
        response.map(transformProteinResponse),
    }),
    
    // Mutation with optimistic updates
    updateProtein: builder.mutation<ProteinStructure, {
      id: string;
      updates: Partial<ProteinStructure>;
    }>({
      query: ({ id, updates }) => ({
        url: `${id}`,
        method: 'PUT',
        body: updates,
      }),
      // Optimistic update
      async onQueryStarted({ id, updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          proteinApi.util.updateQueryData('getProteins', undefined, (draft) => {
            const protein = draft.find(p => p.id === id);
            if (protein) {
              Object.assign(protein, updates);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Protein', id }],
    }),
  }),
});

export const { useGetProteinsQuery, useUpdateProteinMutation } = proteinApi;
```

## 3D VISUALIZATION TECHNOLOGIES

### Three.js Integration

#### 1. Scene Setup and Management
```typescript
// ThreeJSViewer.tsx - Complex 3D scene management
const ThreeJSViewer: React.FC<ThreeJSViewerProps> = ({ protein, renderOptions }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();
  const animationIdRef = useRef<number>();

  // Initialize Three.js scene
  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera setup with proper aspect ratio
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 50);
    cameraRef.current = camera;

    // Renderer with advanced settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Controls for user interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controlsRef.current = controls;

    mountRef.current.appendChild(renderer.domElement);
  }, []);

  // Animation loop with performance monitoring
  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const startTime = performance.now();

    controlsRef.current?.update();
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    const endTime = performance.now();
    const frameTime = endTime - startTime;
    
    // Performance monitoring
    if (frameTime > 16.67) { // 60fps threshold
      console.warn(`Frame time exceeded: ${frameTime.toFixed(2)}ms`);
    }

    animationIdRef.current = requestAnimationFrame(animate);
  }, []);
```

#### 2. Protein Geometry Generation
```typescript
// Complex protein visualization with different representations
const createProteinVisualization = useCallback((proteinData: ProteinStructure) => {
  if (!sceneRef.current) return;

  // Clear existing protein objects
  const proteinGroup = sceneRef.current.getObjectByName('protein');
  if (proteinGroup) {
    sceneRef.current.remove(proteinGroup);
  }

  const newProteinGroup = new THREE.Group();
  newProteinGroup.name = 'protein';

  switch (renderOptions.representation) {
    case 'ball-stick':
      createBallStickRepresentation(proteinData, newProteinGroup);
      break;
    case 'cartoon':
      createCartoonRepresentation(proteinData, newProteinGroup);
      break;
    case 'surface':
      createSurfaceRepresentation(proteinData, newProteinGroup);
      break;
  }

  sceneRef.current.add(newProteinGroup);
  centerCameraOnProtein(proteinData);
}, [renderOptions]);

// Ball-and-stick representation with instanced rendering for performance
const createBallStickRepresentation = useCallback((
  proteinData: ProteinStructure, 
  group: THREE.Group
) => {
  const atomGeometry = new THREE.SphereGeometry(0.3, 16, 12);
  const bondGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);

  // Group atoms by element for instanced rendering
  const atomsByElement = proteinData.atoms.reduce((acc, atom) => {
    if (!acc[atom.element]) acc[atom.element] = [];
    acc[atom.element].push(atom);
    return acc;
  }, {} as Record<string, Atom[]>);

  // Create instanced meshes for each element type
  Object.entries(atomsByElement).forEach(([element, atoms]) => {
    const color = getAtomColor(element);
    const material = new THREE.MeshPhongMaterial({ color });
    
    const instancedMesh = new THREE.InstancedMesh(atomGeometry, material, atoms.length);
    
    atoms.forEach((atom, index) => {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(atom.position.x, atom.position.y, atom.position.z);
      instancedMesh.setMatrixAt(index, matrix);
    });
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    group.add(instancedMesh);
  });

  // Create bonds
  proteinData.bonds?.forEach(bond => {
    const atom1 = proteinData.atoms.find(a => a.id === bond.atom1Id);
    const atom2 = proteinData.atoms.find(a => a.id === bond.atom2Id);
    
    if (atom1 && atom2) {
      const bondMesh = createBond(atom1.position, atom2.position, bond.bondType);
      group.add(bondMesh);
    }
  });
}, []);

// Advanced cartoon representation using spline curves
const createCartoonRepresentation = useCallback((
  proteinData: ProteinStructure, 
  group: THREE.Group
) => {
  proteinData.chains.forEach(chain => {
    const backbonePoints: THREE.Vector3[] = [];
    
    // Extract backbone atoms (CA atoms) for spline generation
    chain.residues.forEach(residue => {
      const caAtom = residue.atoms.find(atom => atom.name === 'CA');
      if (caAtom) {
        backbonePoints.push(new THREE.Vector3(
          caAtom.position.x,
          caAtom.position.y,
          caAtom.position.z
        ));
      }
    });

    if (backbonePoints.length < 2) return;

    // Create smooth spline curve
    const curve = new THREE.CatmullRomCurve3(backbonePoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.5, 8, false);
    
    // Color based on secondary structure
    const material = new THREE.MeshPhongMaterial({
      color: getChainColor(chain.id, renderOptions.colorScheme),
      shininess: 100,
    });
    
    const tubeMesh = new THREE.Mesh(tubeGeometry, material);
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    group.add(tubeMesh);
  });
}, [renderOptions.colorScheme]);
```

### NGL Viewer Integration

#### 1. NGL Stage Management
```typescript
// NGLViewer.tsx - Molecular visualization with NGL
const NGLViewer: React.FC<NGLViewerProps> = ({ protein, renderOptions }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<NGL.Stage>();
  const componentRef = useRef<NGL.StructureComponent>();

  // Initialize NGL stage with advanced options
  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new NGL.Stage(containerRef.current, {
      backgroundColor: 'white',
      quality: renderOptions.quality,
      sampleLevel: renderOptions.quality === 'high' ? 2 : 1,
      workerDefault: true,
      impostor: true, // Use impostors for better performance
      clipNear: 0,
      clipFar: 100,
      fogNear: 50,
      fogFar: 100,
    });

    stageRef.current = stage;

    // Handle window resize
    const handleResize = () => {
      stage.handleResize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stage.dispose();
    };
  }, [renderOptions.quality]);

  // Convert protein data to PDB format for NGL
  const convertToPDBString = useCallback((proteinData: ProteinStructure): string => {
    let pdbString = '';

    // PDB header
    pdbString += `HEADER    ${proteinData.metadata.classification || 'UNKNOWN'}           ${new Date().toISOString().slice(0, 10)}   ${proteinData.id}\n`;
    pdbString += `TITLE     ${proteinData.metadata.title || proteinData.name}\n`;
    
    if (proteinData.metadata.organism) {
      pdbString += `SOURCE    ${proteinData.metadata.organism}\n`;
    }

    // ATOM records with proper PDB formatting
    proteinData.atoms.forEach((atom, index) => {
      const residue = proteinData.residues.find(r => r.id === atom.residueId.toString());
      if (!residue) return;

      const record = 'ATOM  ';
      const atomNum = (index + 1).toString().padStart(5, ' ');
      const atomName = (atom.element || 'C').padEnd(4, ' ');
      const altLoc = ' ';
      const resName = (residue.name || 'ALA').padEnd(3, ' ');
      const chainId = atom.chainId || 'A';
      const resNum = (residue.position || 1).toString().padStart(4, ' ');
      const iCode = ' ';
      const x = (atom.position?.x || 0).toFixed(3).padStart(8, ' ');
      const y = (atom.position?.y || 0).toFixed(3).padStart(8, ' ');
      const z = (atom.position?.z || 0).toFixed(3).padStart(8, ' ');
      const occupancy = '  1.00';
      const bFactor = ' 20.00';
      const element = (atom.element || 'C').padStart(12, ' ');

      const line = `${record}${atomNum} ${atomName}${altLoc}${resName} ${chainId}${resNum}${iCode}   ${x}${y}${z}${occupancy}${bFactor}${element}`;
      pdbString += line + '\n';
    });

    pdbString += 'END\n';
    return pdbString;
  }, []);

  // Apply NGL representations with advanced styling
  const applyRepresentation = useCallback((component: NGL.StructureComponent, options: RenderOptions) => {
    component.removeAllRepresentations();

    let reprType = '';
    let reprParams: any = {};

    switch (options.representation) {
      case 'cartoon':
        reprType = 'cartoon';
        reprParams = {
          colorScheme: getColorScheme(options.colorScheme),
          quality: options.quality,
          smoothSheet: true,
          subdiv: options.quality === 'high' ? 10 : 5,
          radialSegments: options.quality === 'high' ? 20 : 10,
        };
        break;
      
      case 'ball-stick':
        reprType = 'ball+stick';
        reprParams = {
          colorScheme: getColorScheme(options.colorScheme),
          sphereDetail: options.quality === 'high' ? 3 : 2,
          radiusScale: 0.3,
          bondScale: 0.3,
        };
        break;
      
      case 'surface':
        reprType = 'surface';
        reprParams = {
          colorScheme: getColorScheme(options.colorScheme),
          surfaceType: 'av', // Accessible surface
          probeRadius: 1.4,
          scaleFactor: 2.0,
          cutoff: 0.0,
          contour: true,
          opacity: 0.8,
        };
        break;
    }

    component.addRepresentation(reprType, reprParams);
  }, []);
```