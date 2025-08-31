import axios from 'axios'
import { 
  ProteinResponse, 
  ProteinStructure, 
  SequenceAnalysis, 
  ChemicalProperties,
  GenerationConstraints,
  GeneratedProtein
} from '../types/protein'
import {
  User,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  UpdateProfileRequest
} from '../types/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Mock data for offline mode
const mockProteinData = {
  id: 'mock-protein-1',
  name: 'Mock Protein',
  sequence: 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN',
  molecular_weight: 5808.0,
  length: 110,
  created_at: new Date().toISOString(),
  metadata: { source: 'Mock Data' }
}

const mockGeneratedProtein = {
  sequence: 'MKWVTFISLLFLFSSAYSRGVFRRDAHKSEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAALGL',
  confidence: 0.85,
  properties: {
    molecularWeight: 66430.0,
    molecular_weight: 66430.0,
    hydrophobicity: [0.2, -0.1, 0.5, -0.3, 0.1, 0.4, -0.2, 0.3],
    chargeDistribution: [1, -1, 0, 1, -1, 0, 1, -1],
    charge_distribution: [1, -1, 0, 1, -1, 0, 1, -1],
    isoelectricPoint: 6.8,
    isoelectric_point: 6.8,
    stability: 0.75
  },
  validationScore: 0.92,
  validation_score: 0.92,
  generation_metadata: { model: 'protgpt2' },
  metadata: { model: 'protgpt2' }
}

// Helper function to simulate API delay
const mockDelay = (ms: number = 1000) => new Promise(resolve => setTimeout(resolve, ms))

// Request interceptor to add authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Request interceptor for error handling - reduced fallback to mock data
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.warn('API Error:', error.response?.data || error.message)
    
    // Don't interfere with auth endpoints - let them fail naturally
    const url = error.config?.url || ''
    if (url.includes('/auth/')) {
      return Promise.reject(error)
    }
    
    // Only use mock data as absolute last resort for specific endpoints
    // For AI generation, try to show meaningful error instead of mock data
    if (url.includes('/ai/generate')) {
      if (error.response?.status === 503) {
        throw new Error('AI service is currently unavailable. Please try again later.')
      }
      // Only use mock data if specifically requested in development
      if (process.env.NODE_ENV === 'development' && error.config.params?.useMock) {
        await mockDelay(2000)
        return { data: mockGeneratedProtein }
      }
    }
    
    return Promise.reject(error)
  }
)

// Protein API
export const proteinAPI = {
  getProteins: () => api.get<ProteinResponse[]>('/proteins'),
  
  getProtein: (id: string) => api.get<ProteinResponse>(`/proteins/${id}`),
  
  getProteinStructure: (id: string) => api.get<ProteinStructure>(`/proteins/${id}/structure`),
  
  uploadProtein: (file: File, name?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (name) formData.append('name', name)
    
    return api.post<ProteinResponse>('/proteins/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  
  deleteProtein: (id: string) => api.delete(`/proteins/${id}`),
  
  exportVisualization: (proteinId: string, options: any) =>
    api.post(`/export/image`, { proteinId, ...options }),
  
  exportData: (proteinId: string, options: any) =>
    api.post(`/export/data`, { proteinId, ...options }),
}

// Analysis API
export const analysisAPI = {
  analyzeProtein: (proteinId: string, analysisType: string, options?: any) =>
    api.post(`/analysis/analyze/${proteinId}`, { analysisType, options }),
  
  compareProteins: (proteinIds: string[], comparisonType: string, options?: any) =>
    api.post('/analysis/compare', { proteinIds, comparisonType, options }),
  
  analyzeSequence: (proteinId: string) => 
    api.get<SequenceAnalysis>(`/analysis/${proteinId}/sequence`),
  
  getChemicalProperties: (proteinId: string) => 
    api.get<ChemicalProperties>(`/analysis/${proteinId}/properties`),
  
  getSecondaryStructure: (proteinId: string) => 
    api.get<any[]>(`/analysis/${proteinId}/secondary-structure`),
}

// AI Analysis API - Connected to real backend AI service (ESM-2)
export const aiAPI = {
  generateProtein: (constraints: any) =>
    api.post('/ai/generate', {
      length: constraints.length || [100, 300],
      model: constraints.model || 'esm2_small',
      composition: constraints.composition,
      properties: constraints.properties,
      template: constraints.template,
      use_real_ai: true
    }),
  
  optimizeSequence: (sequence: string, objectives: string[], model: string) =>
    api.post('/ai/optimize', { sequence, objectives, model: model || 'esm2_small' }),
  
  validateSequence: (sequence: string) =>
    api.post('/ai-models/validate-sequence', { sequence }),
  
  getModelStatus: () =>
    api.get('/ai-models/status'),
  
  // Real ESM-2 endpoints
  analyzeSequence: (sequence: string, model?: string) =>
    api.post('/ai-models/analyze-sequence', { 
      sequence, 
      model: model || 'esm2_small',
      include_embeddings: true,
      include_properties: true 
    }),
  
  predictStructure: (sequence: string, model?: string) =>
    api.post('/ai-models/predict-structure', { 
      sequence, 
      model: model || 'esm2_small' 
    }),

  generateVariants: (sequence: string, num_variants?: number) =>
    api.post('/ai-models/generate-variants', { 
      sequence, 
      num_variants: num_variants || 3,
      model: 'esm2_small'
    }),

  getAIHealth: () =>
    api.get('/ai-models/health')
}

// Large AI Models API
export const largeAiAPI = {
  // Health check for Ollama service
  checkHealth: () => api.get('/large-models/health'),
  
  // List available large models
  listModels: () => api.get('/large-models/models'),
  
  // Load a specific model
  loadModel: (modelKey: string) => 
    api.post(`/large-models/models/${modelKey}/load`),
  
  // Get model status
  getModelStatus: (modelKey: string) => 
    api.get(`/large-models/models/${modelKey}/status`),
  
  // Analyze sequence with large models
  analyzeSequence: (data: {
    sequence: string;
    model?: string;
    options?: Record<string, any>;
  }) => api.post('/large-models/analyze-sequence', data),
  
  // Predict structure with large models
  predictStructure: (data: {
    sequence: string;
    model?: string;
    confidence_threshold?: number;
  }) => api.post('/large-models/predict-structure', data),
  
  // Design protein with RFdiffusion
  designProtein: (data: {
    target_function: string;
    constraints?: Record<string, any>;
    length_range?: [number, number];
  }) => api.post('/large-models/design-protein', data),
  
  // Send custom prompt to any model
  customPrompt: (modelKey: string, prompt: string, options?: Record<string, any>) =>
    api.post('/large-models/custom-prompt', { 
      model_key: modelKey, 
      prompt, 
      options 
    }),
}

// Export API
export const exportAPI = {
  exportProteins: (proteinIds: string[], format: string, options?: any) =>
    api.post('/export/proteins', { protein_ids: proteinIds, format, options }),
  
  exportAnalysis: (proteinId: string, analysisType: string, format: string = 'json') =>
    api.post('/export/analysis', { protein_id: proteinId, analysis_type: analysisType, format }),
  
  exportVisualization: (proteinId: string, viewSettings: any, format: string = 'png', resolution: number = 1920) =>
    api.post('/export/visualization', { protein_id: proteinId, view_settings: viewSettings, format, resolution }),
  
  exportSession: (sessionId: string) =>
    api.get(`/export/session/${sessionId}`),
}

// Authentication API
export const authAPI = {
  login: (credentials: LoginRequest) =>
    api.post<TokenResponse>('/auth/login', credentials),
  
  register: (userData: RegisterRequest) =>
    api.post<User>('/auth/register', userData),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getCurrentUser: () =>
    api.get<User>('/auth/me'),
  
  updateProfile: (userData: UpdateProfileRequest) =>
    api.put<User>('/auth/me', userData),
  
  changePassword: (passwordData: ChangePasswordRequest) =>
    api.post('/auth/change-password', passwordData),
  
  forgotPassword: (resetRequest: PasswordResetRequest) =>
    api.post('/auth/forgot-password', resetRequest),
  
  resetPassword: (resetData: PasswordResetConfirm) =>
    api.post('/auth/reset-password', resetData),
  
  verifyEmail: (token: string) =>
    api.post(`/auth/verify-email/${token}`),
}

// External AI Models API
export const externalAIAPI = {
  getAvailableModels: () =>
    api.get('/external-ai/models'),
  
  loadModel: (modelName: string) =>
    api.post(`/external-ai/models/${modelName}/load`),
  
  getModelsStatus: () =>
    api.get('/external-ai/models/status'),
  
  generateProteinWithAI: (data: {
    prompt: string;
    model_name?: string;
    max_length?: number;
  }) =>
    api.post('/external-ai/generate/protein', data),
  
  getExternalStorageInfo: () =>
    api.get('/external-ai/external-storage/info'),
  
  startOllamaService: () =>
    api.post('/external-ai/ollama/start'),
}

export default api