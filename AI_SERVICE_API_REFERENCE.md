# AI Service API Reference

## Overview
The AI Service provides comprehensive protein analysis, generation, and optimization capabilities through a RESTful API running on port 8001.

## Base URL
```
http://localhost:8001
```

## Endpoints

### Health & Status

#### `GET /health`
Check service health status.

**Response:**
```json
{
  "status": "healthy",
  "models_loaded": 3,
  "memory_usage": 1.2,
  "available_models": ["protgpt2", "protflash", "geneverse"]
}
```

#### `GET /models/status`
Get status of all AI models.

**Response:**
```json
{
  "protgpt2": {
    "loaded": true,
    "memory_usage": 0.5,
    "last_used": 1640995200,
    "status": "ready"
  }
}
```

#### `GET /models/{model_name}/info`
Get detailed information about a specific model.

**Response:**
```json
{
  "name": "ProtGPT2",
  "description": "GPT-2 based protein language model",
  "parameters": "124M",
  "training_data": "UniProt sequences",
  "capabilities": ["generation", "completion"]
}
```

#### `GET /models/{model_name}/benchmark`
Get benchmark performance data for a model.

**Response:**
```json
{
  "generation_quality": 0.87,
  "sequence_validity": 0.94,
  "functional_accuracy": 0.82,
  "speed": "fast",
  "benchmarks": {
    "CASP": {"score": 0.78, "rank": 12}
  }
}
```

### Protein Generation

#### `POST /generate`
Generate novel protein sequences using AI models.

**Request:**
```json
{
  "model_name": "protgpt2",
  "length": 100,
  "temperature": 0.8,
  "num_sequences": 1,
  "constraints": {}
}
```

**Response:**
```json
{
  "proteins": [{
    "sequence": "MALWMRLLPLL...",
    "confidence": 0.85,
    "validation_score": 0.92,
    "properties": {
      "molecular_weight": 11000.0,
      "isoelectric_point": 6.8
    }
  }],
  "generation_time": 2.5,
  "model_used": "protgpt2",
  "request_id": "gen_1640995200"
}
```

#### `POST /design-protein`
Design proteins based on functional requirements.

**Request:**
```json
{
  "function": "enzyme",
  "length": 150,
  "constraints": {
    "stability": 0.8,
    "activity": 0.9
  }
}
```

**Response:**
```json
{
  "designed_sequence": "MKWVTFISLLFLFSS...",
  "design_scores": {
    "overall": 0.87,
    "stability": 0.82,
    "function": 0.91
  },
  "predicted_properties": {
    "molecular_weight": 16500.0,
    "active_sites": [{"position": 45, "type": "catalytic"}]
  }
}
```

### Sequence Analysis

#### `POST /validate-sequence`
Validate protein sequences against known principles.

**Request:**
```json
"MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "score": 0.95,
  "length": 110,
  "composition": {"M": 3, "A": 8, "L": 12}
}
```

#### `POST /analyze-properties`
Analyze biochemical properties of protein sequences.

**Request:**
```json
"MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"
```

**Response:**
```json
{
  "sequence": "MALWMRLL...",
  "properties": {
    "length": 110,
    "molecular_weight": 12100.0,
    "isoelectric_point": 6.8,
    "hydrophobicity": 0.2,
    "secondary_structure": {
      "helix": 0.4,
      "sheet": 0.3,
      "coil": 0.3
    }
  },
  "confidence": 0.92
}
```

#### `POST /predict-function`
Predict protein function from sequence.

**Request:**
```json
"MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"
```

**Response:**
```json
{
  "predicted_functions": [
    {
      "name": "enzyme",
      "probability": 0.87,
      "ec_number": "3.4.21.62"
    }
  ],
  "domains": [
    {
      "name": "Domain_1",
      "start": 15,
      "end": 85,
      "pfam_id": "PF12345"
    }
  ],
  "subcellular_localization": {
    "cytoplasm": 0.7,
    "nucleus": 0.2
  }
}
```

#### `POST /analyze-stability`
Analyze protein stability under different conditions.

**Request:**
```json
{
  "sequence": "MALWMRLL...",
  "temperature": 37.0,
  "ph": 7.0
}
```

**Response:**
```json
{
  "stability_metrics": {
    "thermodynamic_stability": 0.78,
    "unfolding_temperature": 65.5,
    "half_life": 24.0
  },
  "destabilizing_regions": [
    {
      "start": 45,
      "end": 55,
      "severity": 0.6,
      "reason": "hydrophobic_cluster"
    }
  ],
  "overall_stability_score": 0.78
}
```

### Structure Prediction

#### `POST /predict-structure`
Predict 3D structure from protein sequence.

**Request:**
```json
"MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"
```

**Response:**
```json
{
  "sequence": "MALWMRLL...",
  "structure_data": {
    "coordinates": [[1.5, 2.0, 1.5], [3.0, 1.8, 2.1]],
    "secondary_structure": [
      {"position": 0, "type": "H", "confidence": 0.9}
    ],
    "domains": [
      {"start": 1, "end": 50, "type": "domain_1"}
    ]
  },
  "confidence": 0.85,
  "method": "AlphaFold-lite"
}
```

#### `POST /predict-interactions`
Predict molecular interactions for a protein.

**Request:**
```json
{
  "sequence": "MALWMRLL...",
  "interaction_type": "protein"
}
```

**Response:**
```json
{
  "predicted_interactions": [
    {
      "partner_id": "PROT_1234",
      "partner_name": "Protein_1",
      "confidence": 0.87,
      "interaction_type": "binding",
      "binding_site": {"start": 25, "end": 45}
    }
  ],
  "interaction_network": {
    "nodes": [{"id": "query_protein", "type": "protein"}],
    "edges": [{"source": "query_protein", "target": "partner_0"}]
  },
  "summary": {
    "total_interactions": 5,
    "high_confidence_interactions": 3
  }
}
```

### Sequence Optimization

#### `POST /optimize-sequence`
Optimize protein sequences for specific properties.

**Request:**
```json
{
  "sequence": "MALWMRLL...",
  "target_properties": {
    "molecular_weight": 6000.0,
    "isoelectric_point": 7.0,
    "stability": 0.9
  }
}
```

**Response:**
```json
{
  "original_sequence": "MALWMRLL...",
  "optimized_sequence": "MALWMRLL...",
  "target_properties": {"stability": 0.9},
  "achieved_properties": {"stability": 0.87},
  "optimization_score": 0.85,
  "iterations": 45
}
```

#### `POST /mutate-sequence`
Generate mutations of a protein sequence.

**Request:**
```json
{
  "sequence": "MALWMRLL...",
  "mutation_type": "random",
  "num_mutations": 3
}
```

**Response:**
```json
{
  "original_sequence": "MALWMRLL...",
  "mutated_sequences": [
    {
      "sequence": "MALWMRLL...",
      "mutations": [
        {
          "position": 15,
          "original": "L",
          "mutated": "V",
          "type": "substitution"
        }
      ],
      "predicted_effects": {
        "stability_change": -0.1,
        "function_change": 0.05
      }
    }
  ]
}
```

### Sequence Comparison

#### `POST /compare-sequences`
Compare multiple protein sequences.

**Request:**
```json
{
  "sequences": [
    "MALWMRLL...",
    "ACDEFGHI..."
  ]
}
```

**Response:**
```json
{
  "sequences": ["MALWMRLL...", "ACDEFGHI..."],
  "comparisons": [
    {
      "sequence_1_index": 0,
      "sequence_2_index": 1,
      "similarity": 0.75,
      "identity": 0.65,
      "alignment_score": 125.5
    }
  ],
  "consensus_sequence": "MALWMRLL...",
  "phylogenetic_tree": {
    "newick": "(seq_0,seq_1);",
    "distances": [0.75]
  }
}
```

### Batch Processing

#### `POST /batch-generate`
Generate multiple protein sequences in batch.

**Request:**
```json
[
  {
    "model_name": "protgpt2",
    "length": 100,
    "temperature": 0.8,
    "num_sequences": 1
  },
  {
    "model_name": "protflash",
    "length": 150,
    "temperature": 0.7,
    "num_sequences": 1
  }
]
```

**Response:**
```json
{
  "batch_results": [
    {
      "request_index": 0,
      "success": true,
      "result": {
        "proteins": [{"sequence": "MALWMRLL...", "confidence": 0.85}],
        "generation_time": 2.1
      }
    }
  ],
  "total_requests": 2,
  "successful_requests": 2,
  "failed_requests": 0,
  "batch_metadata": {
    "processing_time": 4.5,
    "timestamp": 1640995200
  }
}
```

#### `POST /batch-process`
Process multiple sequences with multiple operations.

**Request:**
```json
{
  "sequences": ["MALWMRLL...", "ACDEFGHI..."],
  "operations": ["validate", "analyze_properties", "predict_function"]
}
```

**Response:**
```json
{
  "batch_id": "batch_1640995200",
  "total_sequences": 2,
  "operations_performed": ["validate", "analyze_properties"],
  "results": [
    {
      "sequence_id": 0,
      "sequence": "MALWMRLL...",
      "results": {
        "validation": {"valid": true, "score": 0.95},
        "properties": {"length": 110, "molecular_weight": 12100.0}
      }
    }
  ],
  "status": "completed"
}
```

### Model Management

#### `POST /models/{model_name}/load`
Load a specific AI model.

**Response:**
```json
{
  "message": "Model protgpt2 loaded successfully"
}
```

#### `POST /models/{model_name}/unload`
Unload a specific AI model to free memory.

**Response:**
```json
{
  "message": "Model protgpt2 unloaded successfully"
}
```

## Error Responses

All endpoints return standard HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (invalid model name)
- `500`: Internal Server Error

Error response format:
```json
{
  "detail": "Error message describing what went wrong"
}
```

## Rate Limits

- Standard endpoints: 100 requests/minute
- Batch processing: 10 requests/minute
- Structure prediction: 20 requests/minute

## Authentication

Currently, no authentication is required for the mock service. In production, API keys would be required.

## Examples

### Generate a protein sequence
```bash
curl -X POST http://localhost:8001/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "protgpt2",
    "length": 100,
    "temperature": 0.8,
    "num_sequences": 1
  }'
```

### Analyze protein properties
```bash
curl -X POST http://localhost:8001/analyze-properties \
  -H "Content-Type: application/json" \
  -d '"MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"'
```

### Predict protein function
```bash
curl -X POST http://localhost:8001/predict-function \
  -H "Content-Type: application/json" \
  -d '"MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"'
```