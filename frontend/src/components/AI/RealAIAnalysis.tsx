import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as AIIcon,
  Science as AnalysisIcon,
  Biotech as StructureIcon
} from '@mui/icons-material';
import { aiAPI } from '../../services/api';

interface AnalysisResult {
  sequence_analysis?: {
    length: number;
    molecular_weight: number;
    isoelectric_point: number;
    embedding_magnitude: number;
    hydrophobic_fraction: number;
    charged_fraction: number;
  };
  contact_prediction?: {
    total_contacts: number;
    strong_contacts: number;
    top_contacts: Array<{
      position1: number;
      position2: number;
      residue1: string;
      residue2: string;
      probability: number;
    }>;
  };
  variant_generation?: {
    num_variants: number;
    variants: Array<{
      sequence: string;
      mutations: number;
      description: string;
    }>;
  };
  model_info?: {
    model: string;
    parameters: number;
    device: string;
  };
}

const RealAIAnalysis: React.FC = () => {
  const [sequence, setSequence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [analysisType, setAnalysisType] = useState<'comprehensive' | 'contact' | 'variants'>('comprehensive');

  // Example sequences for testing
  const exampleSequences = [
    {
      name: 'Small Test Protein',
      sequence: 'MKLLVLGLPGAGKGTQCKIINVQYETGPSKLIGGMDLNAFKYLGN'
    },
    {
      name: 'Hemoglobin Alpha Chain',
      sequence: 'MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR'
    }
  ];

  const handleAnalyzeSequence = async () => {
    if (!sequence.trim()) {
      setError('Please enter a protein sequence');
      return;
    }

    // Validate sequence (basic check for amino acid letters)
    const validAminoAcids = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
    if (!validAminoAcids.test(sequence.trim())) {
      setError('Invalid protein sequence. Please use only standard amino acid letters.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      let analysisResult: AnalysisResult = {};

      if (analysisType === 'comprehensive' || analysisType === 'contact') {
        // Get sequence analysis and contact prediction
        const response = await aiAPI.analyzeSequence(sequence.trim());
        
        if (response.data) {
          analysisResult = {
            ...analysisResult,
            sequence_analysis: response.data.sequence_analysis,
            contact_prediction: response.data.contact_prediction,
            model_info: response.data.model_info
          };
        }
      }

      if (analysisType === 'comprehensive' || analysisType === 'variants') {
        // Get variant generation
        try {
          const variantResponse = await aiAPI.generateVariants(sequence.trim(), 3);
          if (variantResponse.data) {
            analysisResult.variant_generation = variantResponse.data.variant_generation;
          }
        } catch (variantError) {
          console.warn('Variant generation failed:', variantError);
        }
      }

      setResults(analysisResult);

    } catch (error: any) {
      console.error('Analysis failed:', error);
      setError(error.response?.data?.detail || error.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUseExample = (exampleSequence: string) => {
    setSequence(exampleSequence);
    setError(null);
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return typeof num === 'number' ? num.toFixed(decimals) : 'N/A';
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon color="primary" />
        Real AI Protein Analysis
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Analyze protein sequences using our integrated ESM-2 AI model for comprehensive insights.
      </Typography>

      {/* Input Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Input Protein Sequence
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            label="Protein Sequence"
            value={sequence}
            onChange={(e) => setSequence(e.target.value.toUpperCase())}
            placeholder="Enter amino acid sequence (e.g., MKLLVLGLPGAGKGTQCKIINVQYETGPSKLIGGMDLNAFKYLGN)"
            helperText={`Sequence length: ${sequence.length} residues`}
            sx={{ mb: 2 }}
          />

          {/* Example Sequences */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Example Sequences:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {exampleSequences.map((example, index) => (
                <Chip
                  key={index}
                  label={`${example.name} (${example.sequence.length} aa)`}
                  onClick={() => handleUseExample(example.sequence)}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Box>

          {/* Analysis Options */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Analysis Type:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label="Comprehensive"
                color={analysisType === 'comprehensive' ? 'primary' : 'default'}
                onClick={() => setAnalysisType('comprehensive')}
                icon={<AnalysisIcon />}
              />
              <Chip
                label="Contact Prediction"
                color={analysisType === 'contact' ? 'primary' : 'default'}
                onClick={() => setAnalysisType('contact')}
                icon={<StructureIcon />}
              />
              <Chip
                label="Variant Generation"
                color={analysisType === 'variants' ? 'primary' : 'default'}
                onClick={() => setAnalysisType('variants')}
                icon={<AIIcon />}
              />
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={handleAnalyzeSequence}
            disabled={loading || !sequence.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <AIIcon />}
            size="large"
          >
            {loading ? 'Analyzing...' : 'Analyze with AI'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading Progress */}
      {loading && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analysis in Progress
            </Typography>
            <LinearProgress sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              ESM-2 model is processing your sequence...
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && (
        <Grid container spacing={3}>
          {/* Model Information */}
          {results.model_info && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <AIIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    AI Model Information
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip label={`Model: ${results.model_info.model}`} />
                    <Chip label={`Parameters: ${results.model_info.parameters?.toLocaleString()}`} />
                    <Chip label={`Device: ${results.model_info.device}`} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Sequence Analysis */}
          {results.sequence_analysis && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sequence Properties
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Length</Typography>
                      <Typography variant="h6">{results.sequence_analysis.length} residues</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Molecular Weight</Typography>
                      <Typography variant="h6">{formatNumber(results.sequence_analysis.molecular_weight)} Da</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Isoelectric Point</Typography>
                      <Typography variant="h6">{formatNumber(results.sequence_analysis.isoelectric_point, 1)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">ESM-2 Embedding</Typography>
                      <Typography variant="h6">{formatNumber(results.sequence_analysis.embedding_magnitude, 3)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Hydrophobic %</Typography>
                      <Typography variant="h6">{formatNumber(results.sequence_analysis.hydrophobic_fraction * 100, 1)}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Charged %</Typography>
                      <Typography variant="h6">{formatNumber(results.sequence_analysis.charged_fraction * 100, 1)}%</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Contact Prediction */}
          {results.contact_prediction && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Contact Prediction
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Strong Contacts: {results.contact_prediction.strong_contacts}
                    </Typography>
                  </Box>
                  
                  {results.contact_prediction.top_contacts && results.contact_prediction.top_contacts.length > 0 && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Top Predicted Contacts</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Residues</TableCell>
                                <TableCell>Positions</TableCell>
                                <TableCell align="right">Probability</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {results.contact_prediction.top_contacts.slice(0, 5).map((contact, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {contact.residue1}-{contact.residue2}
                                  </TableCell>
                                  <TableCell>
                                    {contact.position1}-{contact.position2}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatNumber(contact.probability, 3)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Variant Generation */}
          {results.variant_generation && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generated Variants
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {results.variant_generation.num_variants} variants generated with intelligent mutations
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {results.variant_generation.variants.map((variant, index) => (
                      <Grid item xs={12} key={index}>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Variant {index + 1} ({variant.mutations} mutations)
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace', 
                              wordBreak: 'break-all',
                              mb: 1
                            }}
                          >
                            {variant.sequence}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {variant.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default RealAIAnalysis;
