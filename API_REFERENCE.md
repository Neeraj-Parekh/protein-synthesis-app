# Protein Synthesis Web Application - API Reference

## Base URL
```
Development: http://localhost:8000/api
Production: https://api.yourapp.com/api
```

## Authentication
Currently, the API does not require authentication. Future versions may implement JWT-based authentication.

## Response Format
All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details
    }
  }
}
```

## Protein Management

### Upload Protein
Upload a PDB file and create a new protein entry.

**Endpoint:** `POST /proteins/upload`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (required): PDB file
- `name` (optional): Custom name for the protein
- `description` (optional): Description of the protein

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/proteins/upload \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@protein.pdb' \
  -F 'name=My Protein' \
  -F 'description=Test protein structure'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prot_123456789",
    "name": "My Protein",
    "sequence": "MKLLVLSLSLVLVLLLPPLP...",
    "molecularWeight": 15420.5,
    "length": 142,
    "createdAt": "2025-01-27T10:30:00Z",
    "filePath": "/uploads/prot_123456789.pdb"
  }
}
```

### Get Protein Details
Retrieve detailed information about a specific protein.

**Endpoint:** `GET /proteins/:id`

**Parameters:**
- `id` (path): Protein ID

**Example Request:**
```bash
curl -X GET http://localhost:8000/api/proteins/prot_123456789
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prot_123456789",
    "name": "My Protein",
    "sequence": "MKLLVLSLSLVLVLLLPPLP...",
    "structure": {
      "atoms": [
        {
          "id": 1,
          "element": "N",
          "position": [1.234, 5.678, 9.012],
          "residueId": "res_1",
          "chainId": "A"
        }
      ],
      "residues": [
        {
          "id": "res_1",
          "type": "MET",
          "position": 1,
          "chainId": "A"
        }
      ],
      "chains": [
        {
          "id": "A",
          "length": 142
        }
      ]
    },
    "metadata": {
      "molecularWeight": 15420.5,
      "length": 142,
      "resolution": 2.1,
      "method": "X-RAY DIFFRACTION"
    }
  }
}
```

### List Proteins
Get a paginated list of proteins with optional filtering.

**Endpoint:** `GET /proteins`

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `search` (optional): Search term for protein names
- `sortBy` (optional): Sort field (name, createdAt, length)
- `sortOrder` (optional): Sort order (asc, desc)

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/proteins?page=1&limit=5&search=insulin&sortBy=createdAt&sortOrder=desc"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proteins": [
      {
        "id": "prot_123456789",
        "name": "Human Insulin",
        "sequence": "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN",
        "molecularWeight": 5808.0,
        "length": 51,
        "createdAt": "2025-01-27T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 5,
      "totalPages": 5
    }
  }
}
```

### Delete Protein
Remove a protein and all associated data.

**Endpoint:** `DELETE /proteins/:id`

**Parameters:**
- `id` (path): Protein ID

**Example Request:**
```bash
curl -X DELETE http://localhost:8000/api/proteins/prot_123456789
```

**Response:**
```json
{
  "success": true,
  "message": "Protein deleted successfully"
}
```

## Analysis

### Analyze Protein
Perform various types of analysis on a protein structure.

**Endpoint:** `POST /analysis/analyze/:proteinId`

**Parameters:**
- `proteinId` (path): Protein ID

**Request Body:**
```json
{
  "analysisType": "chemical",
  "options": {
    "includeHydrophobicity": true,
    "includeChargeDistribution": true,
    "includeSecondaryStructure": true
  }
}
```

**Analysis Types:**
- `chemical`: Chemical properties analysis
- `structural`: Secondary structure analysis
- `sequence`: Sequence composition analysis

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/analysis/analyze/prot_123456789 \
  -H 'Content-Type: application/json' \
  -d '{
    "analysisType": "chemical",
    "options": {
      "includeHydrophobicity": true,
      "includeChargeDistribution": true
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "analysis_987654321",
    "proteinId": "prot_123456789",
    "analysisType": "chemical",
    "results": {
      "composition": {
        "A": 12, "R": 8, "N": 6, "D": 7,
        "C": 4, "Q": 5, "E": 9, "G": 10,
        "H": 3, "I": 8, "L": 15, "K": 11,
        "M": 2, "F": 6, "P": 7, "S": 9,
        "T": 8, "W": 2, "Y": 4, "V": 12
      },
      "properties": {
        "molecularWeight": 15420.5,
        "isoelectricPoint": 6.8,
        "hydrophobicity": [0.2, -0.1, 0.8, ...],
        "chargeDistribution": [1, 0, -1, 0, ...]
      },
      "secondaryStructure": [
        {
          "type": "helix",
          "start": 10,
          "end": 25,
          "confidence": 0.95
        },
        {
          "type": "sheet",
          "start": 35,
          "end": 42,
          "confidence": 0.88
        }
      ]
    },
    "createdAt": "2025-01-27T10:35:00Z"
  }
}
```

### Compare Proteins
Compare multiple proteins for structural or sequence similarities.

**Endpoint:** `POST /analysis/compare`

**Request Body:**
```json
{
  "proteinIds": ["prot_123456789", "prot_987654321"],
  "comparisonType": "sequence",
  "options": {
    "alignmentMethod": "global",
    "includeStructural": false
  }
}
```

**Comparison Types:**
- `sequence`: Sequence alignment and similarity
- `structure`: Structural comparison and RMSD calculation

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/analysis/compare \
  -H 'Content-Type: application/json' \
  -d '{
    "proteinIds": ["prot_123456789", "prot_987654321"],
    "comparisonType": "sequence"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comparisonId": "comp_555666777",
    "proteinIds": ["prot_123456789", "prot_987654321"],
    "comparisonType": "sequence",
    "results": {
      "alignment": {
        "sequence1": "MKLLVLSLSLVLVLLLPPLP---AAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN",
        "sequence2": "MKLLVLSLSLVLVLLLPPLPAAAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN",
        "matches": "||||||||||||||||||||   ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||",
        "score": 0.95,
        "identity": 95.2,
        "similarity": 97.8
      },
      "commonDomains": [
        {
          "name": "Insulin domain",
          "start1": 10,
          "end1": 50,
          "start2": 13,
          "end2": 53,
          "confidence": 0.92
        }
      ]
    },
    "createdAt": "2025-01-27T10:40:00Z"
  }
}
```

### Get Analysis Results
Retrieve previously computed analysis results.

**Endpoint:** `GET /analysis/:analysisId`

**Parameters:**
- `analysisId` (path): Analysis ID

**Example Request:**
```bash
curl -X GET http://localhost:8000/api/analysis/analysis_987654321
```

## AI Models

### Generate Protein
Generate a novel protein sequence using AI models.

**Endpoint:** `POST /ai/generate`

**Request Body:**
```json
{
  "model": "protflash",
  "constraints": {
    "length": [50, 200],
    "composition": {
      "hydrophobic": 0.4,
      "polar": 0.3,
      "charged": 0.3
    },
    "properties": {
      "targetMW": 15000,
      "targetPI": 7.0
    }
  },
  "options": {
    "temperature": 0.8,
    "numSamples": 1
  }
}
```

**Available Models:**
- `protflash`: Lightweight protein language model
- `protgpt2`: GPT-2 based protein generation
- `geneverse`: Parameter-efficient fine-tuned model

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/ai/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "protflash",
    "constraints": {
      "length": [100, 150]
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generationId": "gen_111222333",
    "sequence": "MKLLVLSLSLVLVLLLPPLPAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN",
    "confidence": 0.87,
    "properties": {
      "molecularWeight": 14250.3,
      "isoelectricPoint": 6.9,
      "hydrophobicity": 0.42,
      "stability": 0.78
    },
    "validationScore": 0.91,
    "metadata": {
      "model": "protflash",
      "temperature": 0.8,
      "generationTime": 2.3,
      "memoryUsed": "1.2GB"
    },
    "createdAt": "2025-01-27T10:45:00Z"
  }
}
```

### Optimize Sequence
Optimize an existing protein sequence for specific objectives.

**Endpoint:** `POST /ai/optimize`

**Request Body:**
```json
{
  "sequence": "MKLLVLSLSLVLVLLLPPLPAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN",
  "objectives": ["stability", "solubility", "expression"],
  "model": "protgpt2",
  "options": {
    "maxIterations": 10,
    "conservativeMode": true
  }
}
```

**Available Objectives:**
- `stability`: Improve protein stability
- `solubility`: Enhance solubility
- `expression`: Optimize for expression
- `activity`: Maintain/improve activity

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/ai/optimize \
  -H 'Content-Type: application/json' \
  -d '{
    "sequence": "MKLLVLSLSLVLVLLLPPLP",
    "objectives": ["stability"],
    "model": "protgpt2"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "optimizationId": "opt_444555666",
    "originalSequence": "MKLLVLSLSLVLVLLLPPLP",
    "optimizedSequence": "MKLLVLSLSLVLVLLLPPLK",
    "improvements": [
      {
        "objective": "stability",
        "originalScore": 0.65,
        "optimizedScore": 0.78,
        "improvement": 0.13,
        "changes": [
          {
            "position": 20,
            "from": "P",
            "to": "K",
            "reason": "Improved electrostatic interactions"
          }
        ]
      }
    ],
    "confidence": 0.84,
    "metadata": {
      "model": "protgpt2",
      "iterations": 5,
      "optimizationTime": 8.7
    },
    "createdAt": "2025-01-27T10:50:00Z"
  }
}
```

### Predict Structure
Predict 3D structure from amino acid sequence.

**Endpoint:** `POST /ai/predict-structure`

**Request Body:**
```json
{
  "sequence": "MKLLVLSLSLVLVLLLPPLPAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN",
  "method": "alphafold",
  "options": {
    "confidence_threshold": 0.7,
    "include_domains": true
  }
}
```

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/ai/predict-structure \
  -H 'Content-Type: application/json' \
  -d '{
    "sequence": "MKLLVLSLSLVLVLLLPPLP"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictionId": "pred_777888999",
    "sequence": "MKLLVLSLSLVLVLLLPPLP",
    "structure": {
      "pdbData": "ATOM      1  N   MET A   1      -8.901   4.127  -0.555  1.00 11.99           N",
      "confidence": [0.95, 0.94, 0.93, ...],
      "domains": [
        {
          "name": "Domain 1",
          "start": 1,
          "end": 20,
          "confidence": 0.89
        }
      ]
    },
    "metadata": {
      "method": "alphafold",
      "predictionTime": 15.2,
      "averageConfidence": 0.87
    },
    "createdAt": "2025-01-27T10:55:00Z"
  }
}
```

## Export

### Export Visualization
Export protein visualization as image.

**Endpoint:** `POST /export/image`

**Request Body:**
```json
{
  "proteinId": "prot_123456789",
  "format": "png",
  "resolution": 1920,
  "options": {
    "representation": "cartoon",
    "colorScheme": "cpk",
    "backgroundColor": "#ffffff",
    "includeLabels": true
  }
}
```

**Available Formats:**
- `png`: PNG image
- `svg`: SVG vector image
- `jpg`: JPEG image

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/export/image \
  -H 'Content-Type: application/json' \
  -d '{
    "proteinId": "prot_123456789",
    "format": "png",
    "resolution": 1920
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "exp_123456789",
    "url": "/downloads/protein_visualization_123456789.png",
    "filename": "protein_visualization_123456789.png",
    "size": 2048576,
    "format": "png",
    "resolution": "1920x1080",
    "expiresAt": "2025-01-28T10:30:00Z"
  }
}
```

### Export Data
Export protein data in various formats.

**Endpoint:** `POST /export/data`

**Request Body:**
```json
{
  "proteinId": "prot_123456789",
  "format": "pdb",
  "options": {
    "includeAnalysis": true,
    "includeMetadata": true,
    "compression": "gzip"
  }
}
```

**Available Formats:**
- `pdb`: Protein Data Bank format
- `fasta`: FASTA sequence format
- `json`: JSON format with full data
- `csv`: CSV format for analysis data

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/export/data \
  -H 'Content-Type: application/json' \
  -d '{
    "proteinId": "prot_123456789",
    "format": "fasta"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "exp_987654321",
    "url": "/downloads/protein_data_123456789.fasta",
    "filename": "protein_data_123456789.fasta",
    "size": 1024,
    "format": "fasta",
    "contentType": "text/plain",
    "expiresAt": "2025-01-28T10:30:00Z"
  }
}
```

### Generate Report
Generate comprehensive analysis report.

**Endpoint:** `POST /export/report`

**Request Body:**
```json
{
  "proteinId": "prot_123456789",
  "analysisIds": ["analysis_987654321", "analysis_111222333"],
  "format": "pdf",
  "options": {
    "includeVisualization": true,
    "includeComparison": false,
    "template": "detailed"
  }
}
```

**Available Formats:**
- `pdf`: PDF report
- `html`: HTML report
- `docx`: Word document

**Example Request:**
```bash
curl -X POST \
  http://localhost:8000/api/export/report \
  -H 'Content-Type: application/json' \
  -d '{
    "proteinId": "prot_123456789",
    "format": "pdf"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "rep_555666777",
    "url": "/downloads/protein_report_123456789.pdf",
    "filename": "protein_report_123456789.pdf",
    "size": 5242880,
    "format": "pdf",
    "pages": 12,
    "expiresAt": "2025-01-28T10:30:00Z"
  }
}
```

## Error Codes

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request format or parameters are invalid |
| `PROTEIN_NOT_FOUND` | Requested protein does not exist |
| `ANALYSIS_NOT_FOUND` | Requested analysis does not exist |
| `FILE_UPLOAD_ERROR` | Error during file upload |
| `INVALID_PDB_FORMAT` | PDB file format is invalid |
| `AI_MODEL_ERROR` | Error in AI model processing |
| `MEMORY_LIMIT_EXCEEDED` | Operation exceeds memory limits |
| `PROCESSING_TIMEOUT` | Operation timed out |
| `EXPORT_ERROR` | Error during export operation |
| `DATABASE_ERROR` | Database operation failed |

### Error Response Examples

#### Invalid Request
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required parameter: proteinId",
    "details": {
      "field": "proteinId",
      "expected": "string",
      "received": "undefined"
    }
  }
}
```

#### Protein Not Found
```json
{
  "success": false,
  "error": {
    "code": "PROTEIN_NOT_FOUND",
    "message": "Protein with ID 'prot_invalid' not found",
    "details": {
      "proteinId": "prot_invalid"
    }
  }
}
```

#### Memory Limit Exceeded
```json
{
  "success": false,
  "error": {
    "code": "MEMORY_LIMIT_EXCEEDED",
    "message": "Protein structure too large for processing",
    "details": {
      "proteinSize": 50000,
      "maxSize": 10000,
      "suggestion": "Try enabling low-memory mode or use a smaller protein"
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Standard endpoints**: 100 requests per minute per IP
- **AI endpoints**: 10 requests per minute per IP
- **Upload endpoints**: 20 requests per minute per IP

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1643723400
```

## Webhooks (Future Feature)

Future versions will support webhooks for long-running operations:

```json
{
  "webhookUrl": "https://your-app.com/webhook",
  "events": ["analysis.completed", "generation.completed"],
  "secret": "your-webhook-secret"
}
```

## SDK and Client Libraries

Official client libraries will be available for:
- JavaScript/TypeScript
- Python
- R (for bioinformatics workflows)

Example usage:
```javascript
import { ProteinSynthesisAPI } from '@protein-synthesis/api-client';

const api = new ProteinSynthesisAPI({
  baseURL: 'http://localhost:8000/api',
  apiKey: 'your-api-key' // Future feature
});

const protein = await api.proteins.upload(file);
const analysis = await api.analysis.analyze(protein.id, 'chemical');
```