# COMPREHENSIVE TECHNICAL DOCUMENTATION
# Protein Synthesis Web Application

## TABLE OF CONTENTS
1. [ARCHITECTURE OVERVIEW](#architecture-overview)
2. [FRONTEND TECHNOLOGIES](#frontend-technologies)
3. [BACKEND TECHNOLOGIES](#backend-technologies)
4. [TYPE SYSTEM & INTERFACES](#type-system--interfaces)
5. [STATE MANAGEMENT](#state-management)
6. [COMPONENT ARCHITECTURE](#component-architecture)
7. [API INTEGRATION](#api-integration)
8. [3D VISUALIZATION](#3d-visualization)
9. [ERROR HANDLING](#error-handling)
10. [BUILD SYSTEM](#build-system)

---

## ARCHITECTURE OVERVIEW

### Multi-Service Architecture
The application follows a microservices architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │    BACKEND      │    │   AI SERVICE    │
│   React/TS      │◄──►│   FastAPI       │◄──►│   ML Models     │
│   Port: 5173    │    │   Port: 8000    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   STATIC FILES  │    │   PostgreSQL    │    │   MODEL CACHE   │
│   Vite Build    │    │   Database      │    │   GPU Memory    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack Breakdown

**Frontend Stack:**
- **React 18.2.0**: Component-based UI library with concurrent features
- **TypeScript 5.8.3**: Static type checking and enhanced developer experience
- **Vite 7.0.6**: Modern build tool with HMR (Hot Module Replacement)
- **Material-UI 5.x**: Component library for consistent design system
- **Redux Toolkit**: State management with RTK Query for API calls
- **Three.js**: 3D graphics library for protein visualization
- **NGL Viewer**: Specialized molecular visualization library
- **Recharts**: Data visualization for analysis charts

**Backend Stack:**
- **FastAPI**: Modern Python web framework with automatic OpenAPI docs
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Relational database for protein data storage
- **Redis**: Caching layer for frequently accessed data
- **Pydantic**: Data validation and serialization

**AI/ML Stack:**
- **PyTorch**: Deep learning framework for model inference
- **Transformers**: Hugging Face library for protein language models
- **ESM**: Meta's protein language model
- **BioPython**: Bioinformatics tools and data structures
- **NumPy/SciPy**: Scientific computing libraries

---

## FRONTEND TECHNOLOGIES

### React 18 Features Used

#### 1. Functional Components with Hooks
```typescript
// Example from ProteinViewer.tsx
const ProteinViewer: React.FC<ProteinViewerProps> = ({ 
  protein, 
  onProteinLoad, 
  onError, 
  width = 800, 
  height = 600 
}) => {
  // useState for local component state
  const [viewerType, setViewerType] = useState<ViewerType>('threejs');
  const [renderOptions, setRenderOptions] = useState<RenderOptions>({
    colorScheme: 'cpk',
    representation: 'cartoon',
    levelOfDetail: true,
    quality: 'medium'
  });
  
  // useRef for DOM manipulation and persistent values
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // useCallback for memoized functions to prevent unnecessary re-renders
  const handleViewerTypeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newViewerType: ViewerType | null) => {
      if (newViewerType) {
        setViewerType(newViewerType);
      }
    }, 
    []
  );
```

#### 2. Advanced Hook Patterns

**Custom Hooks for Reusable Logic:**
```typescript
// Custom hook for dropzone functionality
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: {
    'chemical/x-pdb': ['.pdb'],
    'text/plain': ['.txt']
  },
  multiple: false,
  maxSize: 10 * 1024 * 1024 // 10MB
});
```

**useCallback for Performance Optimization:**
```typescript
// Memoized callback to prevent child component re-renders
const loadProtein = useCallback(async (proteinData: ProteinStructure) => {
  if (!stageRef.current || !proteinData) return;
  
  setState(prev => ({ ...prev, isLoading: true, error: null }));
  
  try {
    // Complex protein loading logic
    const pdbString = convertToPDBString(proteinData);
    const blob = new Blob([pdbString], { type: 'text/plain' });
    const component = await stageRef.current.loadFile(blob, { ext: 'pdb' });
    
    setState(prev => ({ ...prev, isLoading: false }));
  } catch (error) {
    setState(prev => ({ 
      ...prev, 
      error: error instanceof Error ? error.message : 'Failed to load protein',
      isLoading: false 
    }));
  }
}, [renderOptions, onError]);
```

#### 3. Error Boundaries
```typescript
// ErrorBoundary.tsx - Class component for error catching
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### TypeScript Advanced Features

#### 1. Complex Interface Definitions
```typescript
// Comprehensive protein structure interface
export interface ProteinStructure {
  id: string;
  name: string;
  sequence: string;
  atoms: Atom[];
  residues: Residue[];
  chains: Chain[];
  bonds?: Bond[];
  metadata: ProteinMetadata;
  secondaryStructure: SecondaryStructure[];
  boundingBox: BoundingBox;
  centerOfMass: Vector3;
  radiusOfGyration?: number;
  surfaceArea?: number;
  volume?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Nested interface with optional properties
export interface Atom {
  id: number;
  name: string;
  element: string;
  position: Vector3;
  residueId: string;
  chainId: string;
  bFactor?: number;
  occupancy?: number;
  altLoc?: string;
  atomType: 'backbone' | 'sidechain' | 'hetero';
}
```

#### 2. Generic Types and Utility Types
```typescript
// Generic API response wrapper
interface APIResponse<T> {
  data: T;
  status: number;
  message?: string;
  timestamp: string;
}

// Utility types for partial updates
type PartialProtein = Partial<Pick<ProteinStructure, 'name' | 'metadata'>>;

// Conditional types for different render options
type RenderOptions = {
  colorScheme: 'cpk' | 'hydrophobicity' | 'secondary-structure';
  representation: 'cartoon' | 'surface' | 'ball-stick';
  levelOfDetail: boolean;
  quality: 'low' | 'medium' | 'high';
};
```

#### 3. Advanced Type Guards and Assertions
```typescript
// Type guard for runtime type checking
function isProteinStructure(obj: any): obj is ProteinStructure {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.sequence === 'string' &&
    Array.isArray(obj.atoms) &&
    Array.isArray(obj.residues) &&
    Array.isArray(obj.chains)
  );
}

// Type assertion with validation
const validateAndCastProtein = (data: unknown): ProteinStructure => {
  if (!isProteinStructure(data)) {
    throw new ValidationError('Invalid protein structure data');
  }
  return data;
};
```

### Material-UI Integration

#### 1. Theme Customization
```typescript
// Custom theme with protein-specific color palette
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Protein blue
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e', // DNA red
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});
```

#### 2. Advanced Component Composition
```typescript
// Complex form with validation and dynamic fields
const ProteinGenerator: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <FormControl fullWidth>
        <InputLabel>Model</InputLabel>
        <Select
          value={constraints.model}
          label="Model"
          onChange={(e) => setConstraints(prev => ({ 
            ...prev, 
            model: e.target.value as GenerationConstraints['model'] 
          }))}
        >
          <MenuItem value="protgpt2">ProtGPT2</MenuItem>
          <MenuItem value="protflash">ProtFlash</MenuItem>
          <MenuItem value="geneverse">Geneverse</MenuItem>
        </Select>
      </FormControl>
      
      {/* Dynamic length constraints */}
      <Box sx={{ px: 2 }}>
        <Typography gutterBottom>Sequence Length: {length[0]} - {length[1]}</Typography>
        <Slider
          value={length}
          onChange={handleLengthChange}
          valueLabelDisplay="auto"
          min={10}
          max={1000}
          marks={[
            { value: 50, label: '50' },
            { value: 200, label: '200' },
            { value: 500, label: '500' },
          ]}
        />
      </Box>
    </Box>
  );
};
```