import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Divider,
  LinearProgress
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Science as ScienceIcon,
  Memory as MemoryIcon,
  Psychology as PsychologyIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon
} from '@mui/icons-material'
import { largeAiAPI } from '../services/api'

interface ModelInfo {
  name: string
  description: string
  capabilities: string[]
  max_sequence_length: number
  loaded: boolean
  available: boolean
}

interface AnalysisResult {
  success: boolean
  model_used: string
  result: any
  processing_time?: number
  confidence?: number
}

const LargeAIModels: React.FC = () => {
  // State management
  const [models, setModels] = useState<Record<string, ModelInfo>>({})
  const [ollamaStatus, setOllamaStatus] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [analyzing, setAnalyzing] = useState<boolean>(false)
  const [selectedModel, setSelectedModel] = useState<string>('esm3')
  const [sequence, setSequence] = useState<string>('')
  const [targetFunction, setTargetFunction] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string>('')

  // Load models and status on component mount
  useEffect(() => {
    loadModelsStatus()
  }, [])

  const loadModelsStatus = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check Ollama health
      const healthResponse = await largeAiAPI.checkHealth()
      const healthData = healthResponse.data
      setOllamaStatus(healthData.ollama_running)
      
      // Get available models
      const modelsResponse = await largeAiAPI.listModels()
      const modelsData = modelsResponse.data
      setModels(modelsData.models || {})
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load models status')
    } finally {
      setLoading(false)
    }
  }

  const loadModel = async (modelKey: string) => {
    try {
      setError('')
      await largeAiAPI.loadModel(modelKey)
      
      // Refresh models status
      await loadModelsStatus()
      
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to load model: ${modelKey}`)
    }
  }

  const analyzeSequence = async () => {
    if (!sequence.trim()) {
      setError('Please enter a protein sequence')
      return
    }

    try {
      setAnalyzing(true)
      setError('')
      
      const response = await largeAiAPI.analyzeSequence({
        sequence: sequence.trim(),
        model: selectedModel
      })
      
      setResults(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const predictStructure = async () => {
    if (!sequence.trim()) {
      setError('Please enter a protein sequence')
      return
    }

    try {
      setAnalyzing(true)
      setError('')
      
      const response = await largeAiAPI.predictStructure({
        sequence: sequence.trim(),
        model: selectedModel,
        confidence_threshold: 0.7
      })
      
      setResults(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Structure prediction failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const designProtein = async () => {
    if (!targetFunction.trim()) {
      setError('Please enter a target function')
      return
    }

    try {
      setAnalyzing(true)
      setError('')
      
      const response = await largeAiAPI.designProtein({
        target_function: targetFunction.trim(),
        constraints: {},
        length_range: [50, 300]
      })
      
      setResults(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Protein design failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const sendCustomPrompt = async () => {
    if (!customPrompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    try {
      setAnalyzing(true)
      setError('')
      
      const response = await largeAiAPI.customPrompt(
        selectedModel,
        customPrompt.trim()
      )
      
      setResults({
        success: response.data.success,
        model_used: selectedModel,
        result: { response: response.data.response },
        processing_time: response.data.processing_time
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Custom prompt failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const getModelIcon = (modelKey: string) => {
    switch (modelKey) {
      case 'esm3': return <ScienceIcon />
      case 'openfold': return <MemoryIcon />
      case 'rfdiffusion': return <PsychologyIcon />
      default: return <ScienceIcon />
    }
  }

  const ModelCard: React.FC<{ modelKey: string; model: ModelInfo }> = ({ modelKey, model }) => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {getModelIcon(modelKey)}
            <Typography variant="h6">{model.name}</Typography>
            {model.loaded ? (
              <Chip icon={<CloudDoneIcon />} label="Loaded" color="success" size="small" />
            ) : (
              <Chip icon={<CloudOffIcon />} label="Not Loaded" color="default" size="small" />
            )}
          </Box>
          {!model.loaded && (
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => loadModel(modelKey)}
            >
              Load Model
            </Button>
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {model.description}
        </Typography>
        
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" display="block">
            Max sequence length: {model.max_sequence_length}
          </Typography>
          <Box display="flex" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
            {model.capabilities.map((cap) => (
              <Chip key={cap} label={cap} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading large AI models...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Large AI Models
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Access powerful protein analysis models through Ollama. These models provide advanced 
        sequence analysis, structure prediction, and protein design capabilities.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Service Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="between">
            <Typography variant="h6">Service Status</Typography>
            <Button variant="outlined" onClick={loadModelsStatus}>
              Refresh
            </Button>
          </Box>
          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
            {ollamaStatus ? (
              <Chip icon={<CloudDoneIcon />} label="Ollama Running" color="success" />
            ) : (
              <Chip icon={<CloudOffIcon />} label="Ollama Offline" color="error" />
            )}
            <Typography variant="body2">
              {Object.keys(models).length} models available
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Available Models */}
      <Typography variant="h5" gutterBottom>
        Available Models
      </Typography>
      {Object.entries(models).map(([key, model]) => (
        <ModelCard key={key} modelKey={key} model={model} />
      ))}

      <Divider sx={{ my: 3 }} />

      {/* Analysis Interface */}
      <Typography variant="h5" gutterBottom>
        Analysis Tools
      </Typography>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Sequence Analysis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Model</InputLabel>
                <Select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  label="Model"
                >
                  {Object.entries(models).map(([key, model]) => (
                    <MenuItem key={key} value={key} disabled={!model.loaded}>
                      {model.name} {!model.loaded && '(Not Loaded)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Protein Sequence"
                value={sequence}
                onChange={(e) => setSequence(e.target.value)}
                placeholder="Enter amino acid sequence (e.g., MALWMRLLPLLALLALWGPDPAAAFVN...)"
                sx={{ mb: 2 }}
              />
              
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  onClick={analyzeSequence}
                  disabled={analyzing || !ollamaStatus}
                  startIcon={analyzing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                >
                  Analyze Sequence
                </Button>
                <Button
                  variant="outlined"
                  onClick={predictStructure}
                  disabled={analyzing || !ollamaStatus}
                >
                  Predict Structure
                </Button>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Protein Design</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Target Function"
            value={targetFunction}
            onChange={(e) => setTargetFunction(e.target.value)}
            placeholder="Describe the desired protein function (e.g., 'An enzyme that catalyzes the breakdown of cellulose')"
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            onClick={designProtein}
            disabled={analyzing || !ollamaStatus}
            startIcon={analyzing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          >
            Design Protein
          </Button>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Custom Prompt</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Custom Prompt"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter a custom prompt for the selected model..."
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            onClick={sendCustomPrompt}
            disabled={analyzing || !ollamaStatus}
            startIcon={analyzing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          >
            Send Prompt
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* Results */}
      {results && (
        <Paper sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Analysis Results
          </Typography>
          
          <Box display="flex" gap={2} sx={{ mb: 2 }}>
            <Chip label={`Model: ${results.model_used}`} />
            {results.processing_time && (
              <Chip label={`Time: ${results.processing_time.toFixed(2)}s`} />
            )}
            {results.confidence && (
              <Chip label={`Confidence: ${(results.confidence * 100).toFixed(1)}%`} />
            )}
          </Box>
          
          <Box 
            component="pre" 
            sx={{ 
              backgroundColor: 'grey.100', 
              p: 2, 
              borderRadius: 1, 
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}
          >
            {JSON.stringify(results.result, null, 2)}
          </Box>
        </Paper>
      )}

      {analyzing && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            Processing with {selectedModel}...
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default LargeAIModels
