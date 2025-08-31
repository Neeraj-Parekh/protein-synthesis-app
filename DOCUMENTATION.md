# Protein Synthesis Web Application - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [API Documentation](#api-documentation)
5. [Frontend Components](#frontend-components)
6. [Backend Services](#backend-services)
7. [Database Schema](#database-schema)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

## Project Overview

The Protein Synthesis Web Application is a comprehensive educational and research tool that combines 3D protein visualization, chemical composition analysis, and AI-powered protein design capabilities. The application provides an interactive platform for studying protein structures, analyzing their chemical properties, and generating novel protein sequences using lightweight AI models.

### Key Features
- **3D Protein Visualization**: Interactive WebGL-based protein structure rendering
- **Chemical Analysis**: Comprehensive amino acid sequence and property analysis
- **AI-Powered Generation**: Protein sequence generation using lightweight models
- **Comparison Tools**: Side-by-side protein structure and sequence comparison
- **Export Capabilities**: High-resolution image and data export functionality
- **Responsive Design**: Mobile-friendly interface with touch controls

### Technology Stack
- **Frontend**: React.js 18+ with TypeScript, Three.js, NGL Viewer, Material-UI
- **Backend**: Node.js with Express.js, Python FastAPI for AI services
- **Database**: SQLite for metadata, Redis for caching
- **AI Models**: ProtFlash, ProtGPT2, Geneverse (CPU-optimized)
- **Testing**: Jest, React Testing Library, Playwright

## Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Service    │
│   (React.js)    │◄──►│   (Express.js)  │◄──►│   (FastAPI)     │
│                 │    │                 │    │                 │
│ • 3D Viewer     │    │ • REST API      │    │ • ProtFlash     │
│ • UI Components │    │ • Data Process  │    │ • ProtGPT2      │
│ • State Mgmt    │    │ • File Storage  │    │ • Geneverse     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (SQLite)      │
                    │                 │
                    │ • Proteins      │
                    │ • Analysis      │
                    │ • Sessions      │
                    └─────────────────┘
```

### Directory Structure
```
protein-synthesis-app/
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Redux store
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                 # Node.js backend application
│   ├── models/             # Data models
│   ├── routers/            # API route handlers
│   ├── services/           # Business logic services
│   ├── repositories/       # Database access layer
│   └── tests/              # Backend tests
├── ai-service/             # Python AI service (FastAPI)
│   ├── models/             # AI model implementations
│   ├── services/           # AI processing services
│   └── requirements.txt    # Python dependencies
├── docs/                   # Additional documentation
├── scripts/                # Setup and deployment scripts
└── README.md              # Project overview
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Git
- 16GB RAM (recommended)
- Modern browser with WebGL support

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd protein-synthesis-app

# Run the setup script
chmod +x setup.sh
./setup.sh

# Or manual setup:
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Install AI service dependencies
cd ../ai-service
pip install -r requirements.txt

# Initialize database
cd ../backend
python init_db.py

# Start all services
npm run dev:all
```

### Environment Configuration
Create `.env` files in both frontend and backend directories:

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_AI_SERVICE_URL=http://localhost:8001
REACT_APP_ENVIRONMENT=development
```

**Backend (.env)**
```
PORT=8000
DATABASE_URL=./data/proteins.db
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8001
NODE_ENV=development
```

**AI Service (.env)**
```
PORT=8001
MODEL_PATH=./models
CACHE_SIZE=1000
MAX_MEMORY_GB=4
```

## API Documentation

### Protein Management Endpoints

#### Upload Protein
```http
POST /api/proteins/upload
Content-Type: multipart/form-data

Body: {
  file: <PDB file>
  name?: string
  description?: string
}

Response: {
  id: string
  name: string
  sequence: string
  molecularWeight: number
  length: number
  createdAt: string
}
```

#### Get Protein
```http
GET /api/proteins/:id

Response: {
  id: string
  name: string
  sequence: string
  structure: ProteinStructure
  metadata: ProteinMetadata
}
```

#### List Proteins
```http
GET /api/proteins?page=1&limit=10&search=query

Response: {
  proteins: ProteinSummary[]
  total: number
  page: number
  totalPages: number
}
```

### Analysis Endpoints

#### Analyze Protein
```http
POST /api/analysis/analyze/:proteinId
Content-Type: application/json

Body: {
  analysisType: 'chemical' | 'structural' | 'sequence'
  options?: AnalysisOptions
}

Response: {
  id: string
  proteinId: string
  analysisType: string
  results: AnalysisResults
  createdAt: string
}
```

#### Compare Proteins
```http
POST /api/analysis/compare
Content-Type: application/json

Body: {
  proteinIds: string[]
  comparisonType: 'sequence' | 'structure'
  options?: ComparisonOptions
}

Response: {
  alignment?: SequenceAlignment
  structuralComparison?: StructuralComparison
  similarity: number
  commonDomains: Domain[]
}
```

### AI Model Endpoints

#### Generate Protein
```http
POST /api/ai/generate
Content-Type: application/json

Body: {
  model: 'protflash' | 'protgpt2' | 'geneverse'
  constraints: {
    length?: [number, number]
    composition?: AminoAcidComposition
    properties?: ChemicalProperties
  }
}

Response: {
  sequence: string
  confidence: number
  properties: ChemicalProperties
  validationScore: number
  metadata: GenerationMetadata
}
```

#### Optimize Sequence
```http
POST /api/ai/optimize
Content-Type: application/json

Body: {
  sequence: string
  objectives: string[]
  model: 'protgpt2' | 'geneverse'
}

Response: {
  optimizedSequence: string
  improvements: OptimizationResult[]
  confidence: number
}
```

### Export Endpoints

#### Export Visualization
```http
POST /api/export/image
Content-Type: application/json

Body: {
  proteinId: string
  format: 'png' | 'svg'
  resolution: number
  options: ExportOptions
}

Response: {
  url: string
  filename: string
  size: number
}
```

#### Export Data
```http
POST /api/export/data
Content-Type: application/json

Body: {
  proteinId: string
  format: 'pdb' | 'fasta' | 'json'
  includeAnalysis: boolean
}

Response: {
  data: string | object
  filename: string
  contentType: string
}
```

## Frontend Components

### Core Components

#### ProteinViewer
Main 3D visualization component that integrates Three.js and NGL Viewer.

```typescript
interface ProteinViewerProps {
  proteinId: string
  representation: 'cartoon' | 'surface' | 'ball-stick'
  colorScheme: 'cpk' | 'hydrophobicity' | 'secondary-structure'
  onResidueSelect?: (residue: Residue) => void
  onError?: (error: Error) => void
}
```

**Features:**
- Interactive 3D protein structure rendering
- Multiple representation modes
- Residue selection and highlighting
- Performance optimization for large structures
- Export functionality

#### ChemicalAnalysis
Component for displaying protein chemical properties and analysis results.

```typescript
interface ChemicalAnalysisProps {
  proteinId: string
  analysisResults?: AnalysisResults
  onAnalysisComplete?: (results: AnalysisResults) => void
}
```

**Features:**
- Amino acid composition charts
- Hydrophobicity plots
- Secondary structure visualization
- Interactive sequence display

#### ProteinComparison
Side-by-side comparison tool for multiple proteins.

```typescript
interface ProteinComparisonProps {
  proteinIds: string[]
  comparisonType: 'sequence' | 'structure'
  onComparisonComplete?: (results: ComparisonResults) => void
}
```

**Features:**
- Sequence alignment visualization
- Structural overlay in 3D
- RMSD calculation display
- Common domain highlighting

### Utility Components

#### ErrorBoundary
React error boundary for graceful error handling.

#### LoadingSpinner
Reusable loading indicator with progress tracking.

#### Navigation
Main navigation component with responsive design.

## Backend Services

### ProteinService
Handles protein data management and processing.

```python
class ProteinService:
    async def upload_protein(self, file_data: bytes, metadata: dict) -> Protein
    async def get_protein(self, protein_id: str) -> Protein
    async def list_proteins(self, filters: dict) -> List[Protein]
    async def delete_protein(self, protein_id: str) -> bool
```

### AnalysisService
Provides protein analysis capabilities.

```python
class AnalysisService:
    async def analyze_chemical_properties(self, protein: Protein) -> ChemicalAnalysis
    async def analyze_secondary_structure(self, protein: Protein) -> SecondaryStructure
    async def compare_proteins(self, proteins: List[Protein]) -> ComparisonResult
```

### AIService
Interfaces with AI models for protein generation and optimization.

```python
class AIService:
    async def generate_protein(self, constraints: GenerationConstraints) -> GeneratedProtein
    async def optimize_sequence(self, sequence: str, objectives: List[str]) -> OptimizedSequence
    async def predict_structure(self, sequence: str) -> PredictedStructure
```

### ExportService
Handles data and visualization export functionality.

```python
class ExportService:
    async def export_image(self, protein_id: str, options: ExportOptions) -> ExportResult
    async def export_data(self, protein_id: str, format: str) -> ExportResult
    async def generate_report(self, analysis_id: str) -> ReportResult
```

## Database Schema

### Tables

#### proteins
```sql
CREATE TABLE proteins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sequence TEXT NOT NULL,
    molecular_weight REAL,
    length INTEGER,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### analysis_results
```sql
CREATE TABLE analysis_results (
    id TEXT PRIMARY KEY,
    protein_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    result_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (protein_id) REFERENCES proteins(id)
);
```

#### user_sessions
```sql
CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    preferences JSON,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
```sql
CREATE INDEX idx_proteins_name ON proteins(name);
CREATE INDEX idx_proteins_created_at ON proteins(created_at);
CREATE INDEX idx_analysis_protein_id ON analysis_results(protein_id);
CREATE INDEX idx_analysis_type ON analysis_results(analysis_type);
```

## Testing

### Frontend Testing
```bash
# Run all frontend tests
cd frontend
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Backend Testing
```bash
# Run backend tests
cd backend
npm test

# Run Python AI service tests
cd ../ai-service
pytest
```

### Test Structure
- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API endpoint and service integration testing
- **E2E Tests**: Complete user workflow testing
- **Performance Tests**: Load and stress testing

## Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
npm run build

# Prepare AI service
cd ../ai-service
pip install -r requirements-prod.txt
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Environment Variables (Production)
```bash
# Frontend
REACT_APP_API_URL=https://api.yourapp.com
REACT_APP_ENVIRONMENT=production

# Backend
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://redis-host:6379

# AI Service
MODEL_PATH=/app/models
MAX_MEMORY_GB=8
```

## Troubleshooting

### Common Issues

#### WebGL Not Supported
**Problem**: 3D visualization not working
**Solution**: 
- Update browser to latest version
- Enable hardware acceleration
- Check WebGL support at webglreport.com

#### Memory Issues
**Problem**: Application crashes with large proteins
**Solution**:
- Enable level-of-detail rendering
- Reduce visualization quality
- Clear browser cache
- Restart application

#### AI Model Loading Errors
**Problem**: AI generation not working
**Solution**:
- Check AI service is running
- Verify model files are present
- Check available memory (>4GB recommended)
- Restart AI service

#### Database Connection Issues
**Problem**: Data not saving/loading
**Solution**:
- Check database file permissions
- Verify SQLite installation
- Run database initialization script
- Check disk space

### Performance Optimization

#### Frontend Optimization
- Enable code splitting
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize bundle size with tree shaking

#### Backend Optimization
- Implement Redis caching
- Use database connection pooling
- Enable gzip compression
- Optimize database queries

#### AI Service Optimization
- Use quantized models
- Implement model caching
- Enable batch processing
- Monitor memory usage

### Monitoring and Logging

#### Application Monitoring
- Use browser dev tools for frontend debugging
- Implement structured logging in backend
- Monitor API response times
- Track memory usage patterns

#### Error Tracking
- Implement error boundaries in React
- Use centralized error logging
- Monitor AI model performance
- Track user interaction patterns

## Support and Maintenance

### Regular Maintenance Tasks
- Update dependencies monthly
- Clean up old analysis results
- Monitor disk usage
- Backup database regularly
- Update AI models as needed

### Performance Monitoring
- Monitor API response times
- Track memory usage patterns
- Analyze user interaction data
- Monitor error rates

### Security Considerations
- Validate all file uploads
- Sanitize user inputs
- Implement rate limiting
- Use HTTPS in production
- Regular security audits

---

For additional support or questions, please refer to the project repository or contact the development team.