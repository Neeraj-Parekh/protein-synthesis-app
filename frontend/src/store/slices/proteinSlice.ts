import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { ProteinResponse, ProteinStructure } from '../../types/protein'
import { proteinAPI } from '../../services/api'

interface ProteinState {
  proteins: { [id: string]: ProteinStructure }
  currentProteinId: string | null
  loading: boolean
  error: string | null
}

// Generate more realistic dummy protein data
const generateDummyAtoms = () => {
  const atoms = [];
  
  // Generate atoms for first 10 residues to have some 3D structure
  for (let i = 0; i < 10; i++) {
    const residueId = (i + 1).toString();
    // Generate backbone atoms (N, CA, C, O) for each residue
    const baseX = i * 3.8; // Approximate distance between residues
    const baseY = Math.sin(i * 0.5) * 2; // Add some curvature
    const baseZ = Math.cos(i * 0.5) * 2;
    
    atoms.push(
      { 
        id: i * 4 + 1, 
        name: 'N',
        element: 'N', 
        position: { x: baseX, y: baseY, z: baseZ }, 
        residueId, 
        chainId: 'A',
        atomType: 'backbone' as any
      },
      { 
        id: i * 4 + 2, 
        name: 'CA',
        element: 'C', 
        position: { x: baseX + 1.5, y: baseY + 0.5, z: baseZ }, 
        residueId, 
        chainId: 'A',
        atomType: 'backbone' as any
      },
      { 
        id: i * 4 + 3, 
        name: 'C',
        element: 'C', 
        position: { x: baseX + 2.5, y: baseY, z: baseZ + 0.5 }, 
        residueId, 
        chainId: 'A',
        atomType: 'backbone' as any
      },
      { 
        id: i * 4 + 4, 
        name: 'O',
        element: 'O', 
        position: { x: baseX + 3.0, y: baseY - 1.0, z: baseZ + 0.5 }, 
        residueId, 
        chainId: 'A',
        atomType: 'backbone' as any
      }
    );
  }
  
  return atoms;
};

const generateDummyResidues = (atoms) => {
  const residues = [];
  const aminoAcids = ['MET', 'ALA', 'LEU', 'TRP', 'MET', 'ARG', 'LEU', 'LEU', 'PRO', 'LEU'];
  
  for (let i = 0; i < 10; i++) {
    const residueAtoms = atoms.filter(atom => atom.residueId === (i + 1).toString());
    residues.push({
      id: (i + 1).toString(),
      name: aminoAcids[i] || 'ALA',
      type: 'ALA' as any,
      position: i + 1,
      atoms: residueAtoms,
      chainId: 'A',
      properties: {
        molecularWeight: 89.1,
        hydrophobicity: 0.0,
        charge: 0,
        polarity: 'nonpolar' as any,
        category: 'aliphatic' as any
      }
    });
  }
  
  return residues;
};

// Generate dummy protein data
const atoms = generateDummyAtoms();
const residues = generateDummyResidues(atoms);

// Dummy protein data for testing
const dummyProtein: ProteinStructure = {
  id: 'dummy-protein-1',
  name: 'Sample Insulin',
  sequence: 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN',
  atoms: atoms,
  residues: residues,
  chains: [
    { 
      id: 'A', 
      name: 'Chain A', 
      residues: residues,
      sequence: 'MALWMRLLPL',
      type: 'protein' as any
    },
  ],
  secondaryStructure: [
    { type: 'helix' as any, start: 2, end: 6, confidence: 0.9 },
    { type: 'sheet' as any, start: 7, end: 9, confidence: 0.8 },
  ],
  boundingBox: {
    min: { x: -5, y: -3, z: -3 },
    max: { x: 35, y: 3, z: 3 },
    center: { x: 15, y: 0, z: 0 },
    size: { x: 40, y: 6, z: 6 }
  },
  centerOfMass: { x: 15, y: 0, z: 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {
    source: 'Dummy Data',
    molecularWeight: 5808.0,
    resolution: 2.1,
    method: 'X-RAY DIFFRACTION' as any,
  }
}

const initialState: ProteinState = {
  proteins: {
    'dummy-protein-1': dummyProtein
  },
  currentProteinId: 'dummy-protein-1',
  loading: false,
  error: null,
}

// Async thunks
export const fetchProteins = createAsyncThunk(
  'proteins/fetchProteins',
  async () => {
    const response = await proteinAPI.getProteins()
    return response.data
  }
)

export const uploadProtein = createAsyncThunk(
  'proteins/uploadProtein',
  async (file: File) => {
    const response = await proteinAPI.uploadProtein(file)
    return response.data
  }
)

export const addProtein = createAsyncThunk(
  'proteins/addProtein',
  async (protein: ProteinStructure) => {
    // For generated proteins, we might not need to call API
    return protein
  }
)

export const exportVisualization = createAsyncThunk(
  'proteins/exportVisualization',
  async ({ proteinId, options }: { proteinId: string, options: any }) => {
    const response = await proteinAPI.exportVisualization(proteinId, options)
    return response.data
  }
)

export const exportData = createAsyncThunk(
  'proteins/exportData',
  async ({ proteinId, options }: { proteinId: string, options: any }) => {
    const response = await proteinAPI.exportData(proteinId, options)
    return response.data
  }
)

export const fetchProteinStructure = createAsyncThunk(
  'proteins/fetchProteinStructure',
  async (proteinId: string) => {
    const response = await proteinAPI.getProteinStructure(proteinId)
    return response.data
  }
)

const proteinSlice = createSlice({
  name: 'proteins',
  initialState,
  reducers: {
    setCurrentProtein: (state, action: PayloadAction<string | null>) => {
      state.currentProteinId = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch proteins
      .addCase(fetchProteins.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProteins.fulfilled, (state, action) => {
        state.loading = false
        // Convert array to object with id as key
        action.payload.forEach((protein: any) => {
          state.proteins[protein.id] = protein
        })
      })
      .addCase(fetchProteins.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch proteins'
      })
      // Upload protein
      .addCase(uploadProtein.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(uploadProtein.fulfilled, (state, action) => {
        state.loading = false
        // Convert ProteinResponse to ProteinStructure format
        const proteinStructure = {
          ...action.payload,
          atoms: [],
          residues: [],
          chains: [],
          secondaryStructure: [],
          boundingBox: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
            center: { x: 0, y: 0, z: 0 },
            size: { x: 0, y: 0, z: 0 }
          },
          centerOfMass: { x: 0, y: 0, z: 0 },
          createdAt: new Date(action.payload.created_at),
          updatedAt: new Date(action.payload.created_at),
          metadata: action.payload.metadata || {}
        }
        state.proteins[action.payload.id] = proteinStructure
        state.currentProteinId = action.payload.id
      })
      .addCase(uploadProtein.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to upload protein'
      })
      // Add protein
      .addCase(addProtein.fulfilled, (state, action) => {
        state.proteins[action.payload.id] = action.payload
        state.currentProteinId = action.payload.id
      })
      // Fetch protein structure
      .addCase(fetchProteinStructure.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProteinStructure.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.id) {
          state.proteins[action.payload.id] = action.payload
        }
      })
      .addCase(fetchProteinStructure.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch protein structure'
      })
  },
})

export const { setCurrentProtein, clearError } = proteinSlice.actions
export default proteinSlice.reducer