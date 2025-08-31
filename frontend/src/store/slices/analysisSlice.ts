import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { SequenceAnalysis, ChemicalProperties } from '../../types/protein'
import { analysisAPI } from '../../services/api'

interface AnalysisState {
  analyses: { [proteinId: string]: any }
  comparisons: { [key: string]: any }
  loading: boolean
  error: string | null
}

// Dummy analysis data
const dummyAnalysis = {
  composition: {
    composition: {
      'A': 12, 'R': 8, 'N': 6, 'D': 7, 'C': 4, 'Q': 5, 'E': 9, 'G': 10,
      'H': 3, 'I': 8, 'L': 12, 'K': 9, 'M': 3, 'F': 5, 'P': 6, 'S': 8,
      'T': 7, 'W': 2, 'Y': 4, 'V': 9
    },
    percentages: {
      'A': 10.9, 'R': 7.3, 'N': 5.5, 'D': 6.4, 'C': 3.6, 'Q': 4.5, 'E': 8.2, 'G': 9.1,
      'H': 2.7, 'I': 7.3, 'L': 10.9, 'K': 8.2, 'M': 2.7, 'F': 4.5, 'P': 5.5, 'S': 7.3,
      'T': 6.4, 'W': 1.8, 'Y': 3.6, 'V': 8.2
    },
    total_residues: 110
  },
  properties: {
    molecularWeight: 5808.0,
    molecular_weight: 5808.0,
    hydrophobicity: [0.2, -0.1, 0.5, -0.3, 0.1, 0.4, -0.2, 0.3],
    chargeDistribution: [1, -1, 0, 1, -1, 0, 1, -1],
    charge_distribution: [1, -1, 0, 1, -1, 0, 1, -1],
    isoelectricPoint: 6.8,
    isoelectric_point: 6.8,
  },
  domains: [],
  motifs: [],
  secondaryStructure: [
    { type: 'helix', start: 2, end: 6, confidence: 0.9 },
    { type: 'sheet', start: 7, end: 9, confidence: 0.8 },
  ],
  timestamp: new Date().toISOString()
}

const initialState: AnalysisState = {
  analyses: {
    'dummy-protein-1': {
      sequence: dummyAnalysis
    }
  },
  comparisons: {},
  loading: false,
  error: null,
}

// Async thunks
export const analyzeProtein = createAsyncThunk(
  'analysis/analyzeProtein',
  async ({ proteinId, analysisType, options }: { proteinId: string, analysisType: string, options?: any }) => {
    const response = await analysisAPI.analyzeProtein(proteinId, analysisType, options)
    return { proteinId, analysisType, results: response.data }
  }
)

export const compareProteins = createAsyncThunk(
  'analysis/compareProteins',
  async ({ proteinIds, comparisonType, options }: { proteinIds: string[], comparisonType: string, options?: any }) => {
    const response = await analysisAPI.compareProteins(proteinIds, comparisonType, options)
    const key = proteinIds.sort().join('-')
    return { key, comparisonType, results: response.data }
  }
)

export const analyzeSequence = createAsyncThunk(
  'analysis/analyzeSequence',
  async (proteinId: string) => {
    const response = await analysisAPI.analyzeSequence(proteinId)
    return response.data
  }
)

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    clearAnalysis: (state) => {
      state.analyses = {}
      state.comparisons = {}
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Analyze protein
      .addCase(analyzeProtein.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(analyzeProtein.fulfilled, (state, action) => {
        state.loading = false
        state.analyses[action.payload.proteinId] = action.payload
      })
      .addCase(analyzeProtein.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to analyze protein'
      })
      // Compare proteins
      .addCase(compareProteins.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(compareProteins.fulfilled, (state, action) => {
        state.loading = false
        state.comparisons[action.payload.key] = action.payload
      })
      .addCase(compareProteins.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to compare proteins'
      })
      // Analyze sequence (legacy)
      .addCase(analyzeSequence.fulfilled, (state, action) => {
        // Handle legacy analysis
      })
  },
})

export const { clearAnalysis } = analysisSlice.actions
export default analysisSlice.reducer