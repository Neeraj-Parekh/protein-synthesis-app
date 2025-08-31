## API INTEGRATION AND SERVICE LAYER

### Axios Configuration and Interceptors

#### 1. Advanced API Client Setup
```typescript
// services/api.ts - Comprehensive API client configuration
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for authentication and logging
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // Add timestamp for request tracking
    config.metadata = { startTime: new Date() };
    
    // Add authentication token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with mock data fallback
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Calculate request duration
    const duration = new Date().getTime() - response.config.metadata?.startTime?.getTime();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`, {
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  async (error) => {
    const duration = new Date().getTime() - error.config?.metadata?.startTime?.getTime();
    
    console.warn(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`, {
      status: error.response?.status,
      message: error.message,
    });
    
    // Fallback to mock data when backend is unavailable
    return handleMockFallback(error);
  }
);

// Mock data fallback system
const handleMockFallback = async (error: any): Promise<AxiosResponse> => {
  const url = error.config?.url || '';
  
  console.warn('🔄 Falling back to mock data for:', url);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  if (url.includes('/ai/generate')) {
    return {
      data: mockGeneratedProtein,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: error.config,
    };
  }
  
  if (url.includes('/proteins')) {
    return {
      data: [mockProteinData],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: error.config,
    };
  }
  
  if (url.includes('/analysis')) {
    return {
      data: mockAnalysisData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: error.config,
    };
  }
  
  // If no mock data available, reject with original error
  return Promise.reject(error);
};
```

#### 2. Typed API Service Classes
```typescript
// Protein API service with full CRUD operations
export class ProteinAPIService {
  // Generic API call wrapper with error handling
  private async apiCall<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response = await api.request<APIResponse<T>>({
        method,
        url: endpoint,
        data,
        ...config,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new APIError(
          error.response?.data?.message || error.message,
          error.response?.status || 500,
          error.response?.data
        );
      }
      throw new APIError('Unknown API error', 500);
    }
  }

  // Get all proteins with pagination and filtering
  async getProteins(params?: {
    page?: number;
    limit?: number;
    search?: string;
    method?: string;
    organism?: string;
  }): Promise<APIResponse<ProteinStructure[]>> {
    return this.apiCall<ProteinStructure[]>('GET', '/proteins', undefined, { params });
  }

  // Get single protein with related data
  async getProtein(id: string, include?: string[]): Promise<APIResponse<ProteinStructure>> {
    const params = include ? { include: include.join(',') } : undefined;
    return this.apiCall<ProteinStructure>('GET', `/proteins/${id}`, undefined, { params });
  }

  // Upload protein file with progress tracking
  async uploadProtein(
    file: File, 
    metadata?: Partial<ProteinMetadata>,
    onProgress?: (progress: number) => void
  ): Promise<APIResponse<ProteinStructure>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.apiCall<ProteinStructure>('POST', '/proteins', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      },
    });
  }

  // Update protein with optimistic locking
  async updateProtein(
    id: string, 
    updates: Partial<ProteinStructure>,
    version?: number
  ): Promise<APIResponse<ProteinStructure>> {
    const data = version ? { ...updates, version } : updates;
    return this.apiCall<ProteinStructure>('PUT', `/proteins/${id}`, data);
  }

  // Delete protein with cascade options
  async deleteProtein(id: string, cascade = false): Promise<APIResponse<void>> {
    return this.apiCall<void>('DELETE', `/proteins/${id}`, undefined, {
      params: { cascade },
    });
  }

  // Batch operations
  async batchUpdateProteins(
    updates: Array<{ id: string; data: Partial<ProteinStructure> }>
  ): Promise<APIResponse<ProteinStructure[]>> {
    return this.apiCall<ProteinStructure[]>('PUT', '/proteins/batch', { updates });
  }
}

// AI Service API with streaming support
export class AIAPIService {
  // Generate protein with streaming progress
  async generateProtein(
    constraints: GenerationConstraints,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<APIResponse<GeneratedProtein>> {
    if (onProgress) {
      // Use Server-Sent Events for real-time progress
      return this.generateWithStreaming(constraints, onProgress);
    }
    
    return api.post<APIResponse<GeneratedProtein>>('/ai/generate', constraints)
      .then(response => response.data);
  }

  // Streaming generation with SSE
  private async generateWithStreaming(
    constraints: GenerationConstraints,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<APIResponse<GeneratedProtein>> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(
        `/api/ai/generate/stream?${new URLSearchParams(constraints as any)}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          onProgress(data.progress);
        } else if (data.type === 'complete') {
          eventSource.close();
          resolve(data.result);
        } else if (data.type === 'error') {
          eventSource.close();
          reject(new Error(data.message));
        }
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        reject(new Error('Streaming connection failed'));
      };
    });
  }

  // Optimize sequence with multiple objectives
  async optimizeSequence(
    sequence: string,
    objectives: OptimizationObjective[],
    options?: OptimizationOptions
  ): Promise<APIResponse<OptimizationResult>> {
    return api.post<APIResponse<OptimizationResult>>('/ai/optimize', {
      sequence,
      objectives,
      options,
    }).then(response => response.data);
  }

  // Predict structure with confidence intervals
  async predictStructure(
    sequence: string,
    options?: StructurePredictionOptions
  ): Promise<APIResponse<StructurePrediction>> {
    return api.post<APIResponse<StructurePrediction>>('/ai/predict-structure', {
      sequence,
      options,
    }).then(response => response.data);
  }

  // Get model status and capabilities
  async getModelStatus(): Promise<APIResponse<ModelStatus[]>> {
    return api.get<APIResponse<ModelStatus[]>>('/ai/models/status')
      .then(response => response.data);
  }

  // Load/unload models for resource management
  async loadModel(modelName: string): Promise<APIResponse<void>> {
    return api.post<APIResponse<void>>(`/ai/models/${modelName}/load`)
      .then(response => response.data);
  }

  async unloadModel(modelName: string): Promise<APIResponse<void>> {
    return api.post<APIResponse<void>>(`/ai/models/${modelName}/unload`)
      .then(response => response.data);
  }
}
```

### Error Handling and Validation

#### 1. Custom Error Classes
```typescript
// errors/APIError.ts - Comprehensive error handling
export class APIError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(
    message: string,
    status: number,
    details?: any,
    code?: string
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  // Check if error is retryable
  isRetryable(): boolean {
    return this.status >= 500 || this.status === 429; // Server errors or rate limiting
  }

  // Get user-friendly message
  getUserMessage(): string {
    switch (this.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'Access denied. You don\'t have permission for this action.';
      case 404:
        return 'Resource not found.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }
}

export class ValidationError extends Error {
  public readonly field?: string;
  public readonly value?: any;
  public readonly constraints?: string[];

  constructor(
    message: string,
    field?: string,
    value?: any,
    constraints?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.constraints = constraints;
  }
}
```

#### 2. Request/Response Validation
```typescript
// validation/schemas.ts - Runtime validation with Zod
import { z } from 'zod';

// Protein structure validation schema
export const ProteinStructureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  sequence: z.string().regex(/^[ACDEFGHIKLMNPQRSTVWY]+$/, 'Invalid amino acid sequence'),
  atoms: z.array(z.object({
    id: z.number().positive(),
    name: z.string(),
    element: z.string().length(1, 2),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
    residueId: z.string(),
    chainId: z.string().length(1),
    atomType: z.enum(['backbone', 'sidechain', 'hetero']),
  })),
  residues: z.array(z.object({
    id: z.string(),
    name: z.string().length(3),
    type: z.enum(['ALA', 'ARG', 'ASN', /* ... all amino acids */]),
    position: z.number().positive(),
    chainId: z.string().length(1),
  })),
  metadata: z.object({
    source: z.string().optional(),
    resolution: z.number().positive().optional(),
    method: z.enum(['X-RAY DIFFRACTION', 'NMR', 'ELECTRON MICROSCOPY', 'CRYO-EM', 'OTHER']).optional(),
    organism: z.string().optional(),
  }),
});

// Generation constraints validation
export const GenerationConstraintsSchema = z.object({
  length: z.tuple([z.number().min(10), z.number().max(2000)]).optional(),
  composition: z.record(z.string(), z.number().min(0).max(1)).optional(),
  properties: z.object({
    hydrophobicity: z.number().min(-5).max(5).optional(),
    charge: z.number().min(-10).max(10).optional(),
    stability: z.number().min(0).max(1).optional(),
  }).optional(),
  template: z.string().regex(/^[ACDEFGHIKLMNPQRSTVWY]*$/).optional(),
  model: z.enum(['protgpt2', 'protflash', 'geneverse']),
});

// Validation middleware for API calls
export const validateRequest = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input,
        }));
        
        throw new ValidationError(
          'Validation failed',
          validationErrors[0]?.field,
          validationErrors[0]?.value,
          validationErrors.map(e => e.message)
        );
      }
      throw error;
    }
  };
};

// Usage in API calls
export const createProtein = async (data: unknown): Promise<ProteinStructure> => {
  const validatedData = validateRequest(ProteinStructureSchema)(data);
  const response = await proteinAPI.createProtein(validatedData);
  return response.data;
};
```

## BACKEND ARCHITECTURE (Python/FastAPI)

### FastAPI Application Structure

#### 1. Main Application Setup
```python
# main.py - FastAPI application with advanced configuration
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import logging
from typing import AsyncGenerator

# Import custom modules
from database import engine, Base, get_db
from routers import proteins, analysis, ai_models, export
from middleware import LoggingMiddleware, RateLimitMiddleware
from services.model_manager import ModelManager
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Global model manager instance
model_manager: ModelManager = None

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan management"""
    global model_manager
    
    # Startup
    logger.info("Starting Protein Synthesis API...")
    
    # Initialize database
    Base.metadata.create_all(bind=engine)
    
    # Initialize AI model manager
    model_manager = ModelManager()
    await model_manager.initialize()
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    if model_manager:
        await model_manager.cleanup()
    logger.info("Application shutdown complete")

# Create FastAPI app with comprehensive configuration
app = FastAPI(
    title="Protein Synthesis API",
    description="Advanced API for protein visualization, analysis, and AI-powered design",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Security configuration
security = HTTPBearer()

# Middleware stack (order matters!)
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=settings.ALLOWED_HOSTS
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page-Count"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)

# Include routers with prefixes and tags
app.include_router(
    proteins.router, 
    prefix="/api/proteins", 
    tags=["proteins"],
    dependencies=[Depends(get_db)]
)
app.include_router(
    analysis.router, 
    prefix="/api/analysis", 
    tags=["analysis"],
    dependencies=[Depends(get_db)]
)
app.include_router(
    ai_models.router, 
    prefix="/api/ai", 
    tags=["ai"],
    dependencies=[Depends(get_db)]
)
app.include_router(
    export.router, 
    prefix="/api/export", 
    tags=["export"],
    dependencies=[Depends(get_db)]
)

# Health check endpoints
@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected",
        "models": await model_manager.get_status() if model_manager else "not initialized"
    }

@app.get("/metrics")
async def get_metrics():
    """Application metrics for monitoring"""
    return {
        "requests_total": request_counter.get(),
        "active_connections": len(active_connections),
        "model_memory_usage": await model_manager.get_memory_usage() if model_manager else 0,
        "database_pool_size": engine.pool.size(),
    }

# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "type": "HTTPException",
                "message": exc.detail,
                "status_code": exc.status_code,
                "timestamp": datetime.utcnow().isoformat(),
            }
        }
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "type": "ValidationError",
                "message": "Validation failed",
                "details": exc.errors(),
                "timestamp": datetime.utcnow().isoformat(),
            }
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
        access_log=True,
        workers=1 if settings.DEBUG else 4,
    )
```

#### 2. Database Models with SQLAlchemy
```python
# models/protein.py - Comprehensive database models
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import datetime
import uuid
from typing import Dict, List, Optional

Base = declarative_base()

class ProteinModel(Base):
    """Protein structure database model with full metadata"""
    __tablename__ = "proteins"
    
    # Primary fields
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    sequence = Column(Text, nullable=False)
    pdb_id = Column(String(4), unique=True, index=True)
    
    # Structure data (stored as JSON for flexibility)
    atoms = Column(JSON, nullable=False, default=list)
    residues = Column(JSON, nullable=False, default=list)
    chains = Column(JSON, nullable=False, default=list)
    bonds = Column(JSON, nullable=True, default=list)
    secondary_structure = Column(JSON, nullable=True, default=list)
    
    # Geometric properties
    bounding_box = Column(JSON, nullable=True)
    center_of_mass = Column(JSON, nullable=True)
    radius_of_gyration = Column(Float, nullable=True)
    surface_area = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)
    
    # Metadata
    source = Column(String(100), nullable=True)
    organism = Column(String(255), nullable=True)
    method = Column(String(50), nullable=True)
    resolution = Column(Float, nullable=True)
    classification = Column(String(255), nullable=True)
    
    # Timestamps and versioning
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    
    # User and access control
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    is_public = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    analyses = relationship("AnalysisModel", back_populates="protein", cascade="all, delete-orphan")
    comparisons = relationship("ComparisonModel", back_populates="protein1", foreign_keys="ComparisonModel.protein1_id")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_protein_sequence_hash', 'sequence'),
        Index('idx_protein_created_at', 'created_at'),
        Index('idx_protein_method_organism', 'method', 'organism'),
    )
    
    @validates('sequence')
    def validate_sequence(self, key, sequence):
        """Validate amino acid sequence"""
        if not sequence:
            raise ValueError("Sequence cannot be empty")
        
        valid_amino_acids = set('ACDEFGHIKLMNPQRSTVWY')
        if not all(aa in valid_amino_acids for aa in sequence.upper()):
            raise ValueError("Invalid amino acid characters in sequence")
        
        return sequence.upper()
    
    @validates('resolution')
    def validate_resolution(self, key, resolution):
        """Validate resolution value"""
        if resolution is not None and resolution <= 0:
            raise ValueError("Resolution must be positive")
        return resolution
    
    def to_dict(self) -> Dict:
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'name': self.name,
            'sequence': self.sequence,
            'pdb_id': self.pdb_id,
            'atoms': self.atoms,
            'residues': self.residues,
            'chains': self.chains,
            'bonds': self.bonds,
            'secondary_structure': self.secondary_structure,
            'bounding_box': self.bounding_box,
            'center_of_mass': self.center_of_mass,
            'metadata': {
                'source': self.source,
                'organism': self.organism,
                'method': self.method,
                'resolution': self.resolution,
                'classification': self.classification,
            },
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'version': self.version,
        }

class AnalysisModel(Base):
    """Analysis results storage"""
    __tablename__ = "analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    protein_id = Column(UUID(as_uuid=True), ForeignKey('proteins.id'), nullable=False)
    analysis_type = Column(String(50), nullable=False)
    
    # Analysis results stored as JSON
    results = Column(JSON, nullable=False)
    parameters = Column(JSON, nullable=True)
    
    # Metadata
    status = Column(String(20), default='pending', nullable=False)
    error_message = Column(Text, nullable=True)
    execution_time = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    protein = relationship("ProteinModel", back_populates="analyses")
    
    __table_args__ = (
        Index('idx_analysis_protein_type', 'protein_id', 'analysis_type'),
        Index('idx_analysis_status', 'status'),
    )

class GeneratedProteinModel(Base):
    """AI-generated protein storage"""
    __tablename__ = "generated_proteins"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sequence = Column(Text, nullable=False)
    
    # Generation parameters
    model_name = Column(String(50), nullable=False)
    constraints = Column(JSON, nullable=True)
    generation_parameters = Column(JSON, nullable=True)
    
    # Quality metrics
    confidence_score = Column(Float, nullable=True)
    validation_score = Column(Float, nullable=True)
    novelty_score = Column(Float, nullable=True)
    
    # Properties
    predicted_properties = Column(JSON, nullable=True)
    predicted_structure = Column(JSON, nullable=True)
    
    # Metadata
    generation_time = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    __table_args__ = (
        Index('idx_generated_model_confidence', 'model_name', 'confidence_score'),
        Index('idx_generated_created_at', 'created_at'),
    )
```