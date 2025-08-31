import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import { 
  ExpandMore, 
  Psychology, 
  Storage, 
  Science,
  Computer,
  AutoAwesome,
  Refresh
} from '@mui/icons-material';
import { externalAIAPI } from '../../services/api';

interface Model {
  name: string;
  status?: string;
  available: boolean;
  size: number;
  type: string;
  source?: string;
  description?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EnhancedAIGenerator: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [maxLength, setMaxLength] = useState(500);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [ollamaRunning, setOllamaRunning] = useState(false);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    try {
      setLoadingModels(true);
      const [modelsResponse, statusResponse] = await Promise.all([
        externalAIAPI.getAvailableModels(),
        externalAIAPI.getModelsStatus()
      ]);
      
      const availableModels = modelsResponse.data.filter((model: Model) => 
        model.available
      );
      setModels(availableModels);
      setOllamaRunning(statusResponse.data.ollama_running);
      
      // Auto-select first loaded model
      const loadedModel = availableModels.find((model: Model) => model.status === 'loaded');
      if (loadedModel) {
        setSelectedModel(loadedModel.name);
      }
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setError('Failed to load available models');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleStartOllama = async () => {
    try {
      setError(null);
      await externalAIAPI.startOllamaService();
      setTimeout(loadAvailableModels, 3000);
    } catch (err: any) {
      setError(`Failed to start Ollama: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (!ollamaRunning) {
      setError('Ollama service is not running. Please start it first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await externalAIAPI.generateProteinWithAI({
        prompt: prompt.trim(),
        model_name: selectedModel || undefined,
        max_length: maxLength
      });

      setResult(response.data);
    } catch (err: any) {
      setError(`Generation failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getModelIcon = (model: Model) => {
    if (model.source === 'protein-models') return <Science />;
    if (model.type === 'ollama') return <Computer />;
    return <AutoAwesome />;
  };

  const ollamaModels = models.filter(m => m.type === 'ollama');
  const proteinModels = models.filter(m => m.source === 'protein-models');

  const promptExamples = [
    "A small enzyme that binds ATP and catalyzes phosphorylation reactions",
    "An antimicrobial peptide with alpha-helical structure",
    "A membrane protein with 7 transmembrane domains",
    "A zinc finger transcription factor",
    "A collagen-like structural protein with triple helix"
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Enhanced AI Protein Generator
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Generate protein sequences using external AI models from storage
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="AI Generation" icon={<Psychology />} />
          <Tab label="Model Manager" icon={<Storage />} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* AI Generation Tab */}
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generation Parameters
                </Typography>

                {!ollamaRunning && (
                  <Alert 
                    severity="warning" 
                    sx={{ mb: 2 }}
                    action={
                      <Button color="inherit" size="small" onClick={handleStartOllama}>
                        Start Ollama
                      </Button>
                    }
                  >
                    Ollama service is not running. Please start it to use external AI models.
                  </Alert>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Protein Description"
                  placeholder="Describe the protein you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  margin="normal"
                />

                {/* Example Prompts */}
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Example Prompts:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {promptExamples.map((example, index) => (
                      <Chip
                        key={index}
                        label={example}
                        onClick={() => setPrompt(example)}
                        variant="outlined"
                        size="small"
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>AI Model</InputLabel>
                      <Select
                        value={selectedModel}
                        label="AI Model"
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={loadingModels || !ollamaRunning}
                      >
                        {ollamaModels.map((model) => (
                          <MenuItem key={model.name} value={model.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              {getModelIcon(model)}
                              <Typography sx={{ ml: 1 }}>{model.name}</Typography>
                              <Box sx={{ ml: 'auto' }}>
                                <Chip
                                  label={model.status}
                                  color={model.status === 'loaded' ? 'success' : 'info'}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Length"
                      value={maxLength}
                      onChange={(e) => setMaxLength(parseInt(e.target.value) || 500)}
                      inputProps={{ min: 50, max: 2000 }}
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim() || !ollamaRunning}
                  startIcon={loading ? <CircularProgress size={20} /> : <Psychology />}
                  sx={{ mt: 3 }}
                  fullWidth
                  size="large"
                >
                  {loading ? 'Generating...' : 'Generate Protein'}
                </Button>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </CardContent>
            </Card>

            {result && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generated Protein Sequence
                  </Typography>

                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>Sequence Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        value={result.sequence}
                        InputProps={{ readOnly: true }}
                        sx={{ fontFamily: 'monospace', mb: 2 }}
                      />
                      
                      <Typography variant="body2" color="textSecondary">
                        Length: {result.sequence.length} amino acids
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Model: {result.model_used}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>

                  {result.raw_response && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>Full AI Response</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {result.raw_response}
                          </Typography>
                        </Paper>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {result.metadata && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Generation Metadata:
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="textSecondary">
                            Prompt Tokens: {result.metadata.prompt_tokens}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="textSecondary">
                            Completion: {result.metadata.completion_tokens}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="textSecondary">
                            Source: {result.generated_by}
                          </Typography>
                        </Grid>
                        {result.metadata.total_time && (
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" color="textSecondary">
                              Time: {(result.metadata.total_time / 1000000).toFixed(2)}ms
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  )}

                  {result.warning && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      {result.warning}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Available Models
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Refresh />}
                    onClick={loadAvailableModels}
                    disabled={loadingModels}
                  >
                    Refresh
                  </Button>
                </Box>

                {loadingModels ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {ollamaModels.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Ollama Models
                        </Typography>
                        {ollamaModels.map((model) => (
                          <Box
                            key={model.name}
                            sx={{
                              p: 2,
                              border: '1px solid',
                              borderColor: selectedModel === model.name ? 'primary.main' : 'divider',
                              borderRadius: 1,
                              mb: 1,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                            onClick={() => setSelectedModel(model.name)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              {getModelIcon(model)}
                              <Typography variant="subtitle2" noWrap sx={{ ml: 1 }}>
                                {model.name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="textSecondary">
                                {formatFileSize(model.size)}
                              </Typography>
                              <Chip
                                label={model.status}
                                color={model.status === 'loaded' ? 'success' : 'info'}
                                size="small"
                              />
                            </Box>
                            {model.description && (
                              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                {model.description}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}

                    {proteinModels.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Protein Models (Direct Integration)
                        </Typography>
                        {proteinModels.map((model) => (
                          <Box
                            key={model.name}
                            sx={{
                              p: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              opacity: 0.7
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              {getModelIcon(model)}
                              <Typography variant="subtitle2" noWrap sx={{ ml: 1 }}>
                                {model.name}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="textSecondary">
                              {formatFileSize(model.size)} • Requires direct integration
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {models.length === 0 && (
                      <Alert severity="info">
                        No models available. Please check the Model Manager tab.
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Model Manager Tab - This will be imported separately */}
        <Alert severity="info" sx={{ mb: 3 }}>
          Use the dedicated Model Manager page to load and manage external AI models.
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.open('/model-manager', '_blank')}
          startIcon={<Storage />}
        >
          Open Model Manager
        </Button>
      </TabPanel>
    </Box>
  );
};

export default EnhancedAIGenerator;
