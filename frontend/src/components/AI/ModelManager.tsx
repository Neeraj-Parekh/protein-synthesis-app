import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Download,
  CheckCircle,
  Error,
  Info,
  Refresh,
  Storage,
  Memory,
  PlayArrow,
  ExpandMore,
  Computer,
  Science
} from '@mui/icons-material';
import { externalAIAPI } from '../../services/api';

interface Model {
  name: string;
  path: string;
  size: number;
  type: string;
  available: boolean;
  status?: 'loaded' | 'available' | 'loading';
  description?: string;
  source?: string;
}

interface StorageInfo {
  path: string;
  exists: boolean;
  accessible: boolean;
  total_size: number;
  model_count: number;
  model_types: Record<string, number>;
  protein_models: Array<{name: string; path: string; size: number}>;
  ollama_models: Array<{name: string; path: string; size: number}>;
}

interface ModelsStatus {
  ollama_running: boolean;
  total_models: number;
  available_models: number;
  loaded_models: string[];
  external_storage_path: string;
  external_storage_accessible: boolean;
}

const ModelManager: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [modelsStatus, setModelsStatus] = useState<ModelsStatus | null>(null);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [startingOllama, setStartingOllama] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadModels(),
      loadStorageInfo(),
      loadStatus()
    ]);
  };

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await externalAIAPI.getAvailableModels();
      setModels(response.data);
    } catch (err: any) {
      setError(`Failed to load models: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const response = await externalAIAPI.getExternalStorageInfo();
      setStorageInfo(response.data);
    } catch (err: any) {
      console.error('Failed to load storage info:', err);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await externalAIAPI.getModelsStatus();
      setModelsStatus(response.data);
    } catch (err: any) {
      console.error('Failed to load status:', err);
    }
  };

  const handleStartOllama = async () => {
    try {
      setStartingOllama(true);
      setError(null);
      const response = await externalAIAPI.startOllamaService();
      setSuccess(response.data.message);
      
      // Refresh status after starting
      setTimeout(() => {
        loadStatus();
        loadModels();
      }, 3000);
      
    } catch (err: any) {
      setError(`Failed to start Ollama: ${err.response?.data?.detail || err.message}`);
    } finally {
      setStartingOllama(false);
    }
  };

  const handleLoadModel = async (modelName: string) => {
    try {
      setLoadingModel(modelName);
      setError(null);
      setSuccess(null);
      
      const response = await externalAIAPI.loadModel(modelName);
      setSuccess(response.data.message);
      
      // Update model status
      setModels(prev => prev.map(model => 
        model.name === modelName 
          ? { ...model, status: 'loading' }
          : model
      ));
      
      // Refresh status after a delay
      setTimeout(() => {
        loadModels();
        loadStatus();
        setLoadingModel(null);
      }, 5000);
      
    } catch (err: any) {
      setError(`Failed to load model ${modelName}: ${err.response?.data?.detail || err.message}`);
      setLoadingModel(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'loaded': return 'success';
      case 'loading': return 'warning';
      case 'available': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'loaded': return <CheckCircle />;
      case 'loading': return <CircularProgress size={20} />;
      case 'available': return <Info />;
      default: return <Error />;
    }
  };

  const getModelTypeIcon = (type: string, source?: string) => {
    if (source === 'protein-models') return <Science />;
    if (type === 'ollama') return <Computer />;
    return <Memory />;
  };

  const ollamaModels = models.filter(m => m.type === 'ollama');
  const proteinModels = models.filter(m => m.source === 'protein-models');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          External AI Models Manager
        </Typography>
        <Box>
          {!modelsStatus?.ollama_running && (
            <Button
              variant="contained"
              color="primary"
              startIcon={startingOllama ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
              onClick={handleStartOllama}
              disabled={startingOllama}
              sx={{ mr: 2 }}
            >
              {startingOllama ? 'Starting...' : 'Start Ollama'}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Storage />}
            onClick={() => setStatusDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Storage Info
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Status Overview */}
      {modelsStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color={modelsStatus.ollama_running ? 'success.main' : 'error.main'}>
                    {modelsStatus.ollama_running ? '✅' : '❌'}
                  </Typography>
                  <Typography variant="body2">
                    Ollama Service
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {modelsStatus.total_models}
                  </Typography>
                  <Typography variant="body2">
                    Total Models
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {modelsStatus.available_models}
                  </Typography>
                  <Typography variant="body2">
                    Available
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {modelsStatus.loaded_models.length}
                  </Typography>
                  <Typography variant="body2">
                    Loaded
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Ollama Models */}
      {ollamaModels.length > 0 && (
        <Accordion defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Computer sx={{ mr: 1 }} />
              <Typography variant="h6">
                Ollama Models ({ollamaModels.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {ollamaModels.map((model) => (
                <Grid item xs={12} md={6} lg={4} key={model.name}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      border: model.status === 'loaded' ? '2px solid #4caf50' : 'none'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getModelTypeIcon(model.type, model.source)}
                          <Typography variant="h6" component="h3" noWrap sx={{ ml: 1 }}>
                            {model.name}
                          </Typography>
                        </Box>
                        <Chip
                          icon={getStatusIcon(model.status)}
                          label={model.status || 'unknown'}
                          color={getStatusColor(model.status)}
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Type: {model.type.toUpperCase()}
                      </Typography>
                      
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Size: {formatFileSize(model.size)}
                      </Typography>

                      {model.description && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {model.description}
                        </Typography>
                      )}

                      <Box sx={{ mt: 2 }}>
                        {model.available ? (
                          <Button
                            variant={model.status === 'loaded' ? 'outlined' : 'contained'}
                            color={model.status === 'loaded' ? 'success' : 'primary'}
                            fullWidth
                            disabled={loadingModel === model.name || model.status === 'loaded' || !modelsStatus?.ollama_running}
                            onClick={() => handleLoadModel(model.name)}
                            startIcon={loadingModel === model.name ? <CircularProgress size={20} /> : getStatusIcon(model.status)}
                          >
                            {loadingModel === model.name 
                              ? 'Loading...' 
                              : model.status === 'loaded' 
                                ? 'Loaded' 
                                : !modelsStatus?.ollama_running
                                  ? 'Start Ollama First'
                                  : 'Load Model'
                            }
                          </Button>
                        ) : (
                          <Button variant="outlined" fullWidth disabled>
                            Not Available
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Protein Models */}
      {proteinModels.length > 0 && (
        <Accordion defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Science sx={{ mr: 1 }} />
              <Typography variant="h6">
                Protein Models ({proteinModels.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {proteinModels.map((model) => (
                <Grid item xs={12} md={6} lg={4} key={model.name}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getModelTypeIcon(model.type, model.source)}
                          <Typography variant="h6" component="h3" noWrap sx={{ ml: 1 }}>
                            {model.name}
                          </Typography>
                        </Box>
                        <Chip
                          label="Python"
                          color="info"
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Size: {formatFileSize(model.size)}
                      </Typography>

                      {model.description && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {model.description}
                        </Typography>
                      )}

                      <Button variant="outlined" fullWidth disabled>
                        Direct Integration Required
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {models.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 3 }}>
          No models found in external storage. Please check if the storage path is accessible and contains supported model files.
        </Alert>
      )}

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Storage & System Status</DialogTitle>
        <DialogContent>
          {storageInfo && (
            <Box>
              <Typography variant="h6" gutterBottom>External Storage</Typography>
              <Typography variant="body2">Path: {storageInfo.path}</Typography>
              <Typography variant="body2" color={storageInfo.accessible ? 'success.main' : 'error.main'}>
                Status: {storageInfo.accessible ? '✅ Accessible' : '❌ Not Accessible'}
              </Typography>
              <Typography variant="body2">Total Size: {formatFileSize(storageInfo.total_size)}</Typography>
              <Typography variant="body2">Model Count: {storageInfo.model_count}</Typography>
              
              {storageInfo.protein_models.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Protein Models</Typography>
                  <List dense>
                    {storageInfo.protein_models.map((model) => (
                      <ListItem key={model.name}>
                        <ListItemText 
                          primary={model.name} 
                          secondary={formatFileSize(model.size)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {storageInfo.ollama_models.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Ollama Models</Typography>
                  <List dense>
                    {storageInfo.ollama_models.map((model) => (
                      <ListItem key={model.name}>
                        <ListItemText 
                          primary={model.name}
                          secondary={formatFileSize(model.size)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}

          {modelsStatus && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Ollama Service</Typography>
              <Typography variant="body2" color={modelsStatus.ollama_running ? 'success.main' : 'error.main'}>
                Status: {modelsStatus.ollama_running ? '✅ Running' : '❌ Not Running'}
              </Typography>
              <Typography variant="body2">External Storage: {modelsStatus.external_storage_accessible ? '✅ Accessible' : '❌ Not Accessible'}</Typography>
              
              {modelsStatus.loaded_models.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Currently Loaded Models</Typography>
                  <List dense>
                    {modelsStatus.loaded_models.map((modelName: string) => (
                      <ListItem key={modelName}>
                        <ListItemText primary={modelName} />
                        <ListItemSecondaryAction>
                          <CheckCircle color="success" />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModelManager;
