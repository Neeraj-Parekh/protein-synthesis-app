import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { GeneratedProtein } from '../../types/protein';

interface GenerationResultsProps {
  results: GeneratedProtein[];
  onSaveProtein?: (protein: GeneratedProtein, name: string) => void;
  onViewStructure?: (sequence: string) => void;
}

const GenerationResults: React.FC<GenerationResultsProps> = ({
  results,
  onSaveProtein,
  onViewStructure
}) => {
  const [selectedResult, setSelectedResult] = useState<GeneratedProtein | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [proteinName, setProteinName] = useState('');

  const handleCopySequence = (sequence: string) => {
    navigator.clipboard.writeText(sequence);
    // Could add a toast notification here
  };

  const handleDownloadFasta = (protein: GeneratedProtein, index: number) => {
    const fastaContent = `>Generated_Protein_${index + 1} | Model: ${protein.metadata.model} | Confidence: ${protein.confidence.toFixed(2)}\n${protein.sequence}`;
    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated_protein_${index + 1}.fasta`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveProtein = (protein: GeneratedProtein) => {
    setSelectedResult(protein);
    setProteinName(`Generated Protein ${new Date().toISOString().split('T')[0]}`);
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = () => {
    if (selectedResult && proteinName.trim()) {
      onSaveProtein?.(selectedResult, proteinName.trim());
      setSaveDialogOpen(false);
      setSelectedResult(null);
      setProteinName('');
    }
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getValidationColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  if (results.length === 0) {
    return (
      <Alert severity="info">
        No generation results to display. Generate some proteins first!
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Generation Results ({results.length})
      </Typography>

      <Grid container spacing={2}>
        {results.map((result, index) => (
          <Grid item xs={12} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6">
                      Generated Protein {index + 1}
                    </Typography>
                    <Box display="flex" gap={1} mt={1}>
                      <Chip
                        size="small"
                        label={`Model: ${result.metadata.model}`}
                        color="primary"
                      />
                      <Chip
                        size="small"
                        label={`Confidence: ${(result.confidence * 100).toFixed(1)}%`}
                        color={getConfidenceColor(result.confidence)}
                      />
                      <Chip
                        size="small"
                        label={`Validation: ${(result.validationScore * 100).toFixed(1)}%`}
                        color={getValidationColor(result.validationScore)}
                      />
                      <Chip
                        size="small"
                        label={`${result.sequence.length} residues`}
                      />
                    </Box>
                  </Box>

                  <Box display="flex" gap={1}>
                    <Tooltip title="Copy Sequence">
                      <IconButton
                        size="small"
                        onClick={() => handleCopySequence(result.sequence)}
                      >
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download FASTA">
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadFasta(result, index)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View 3D Structure">
                      <IconButton
                        size="small"
                        onClick={() => onViewStructure?.(result.sequence)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Save Protein">
                      <IconButton
                        size="small"
                        onClick={() => handleSaveProtein(result)}
                      >
                        <SaveIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {/* Sequence Display */}
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle2" gutterBottom>
                      Amino Acid Sequence
                    </Typography>
                    <Paper
                      sx={{
                        p: 1,
                        backgroundColor: '#f5f5f5',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        maxHeight: 120,
                        overflow: 'auto',
                        wordBreak: 'break-all',
                        lineHeight: 1.4
                      }}
                    >
                      {result.sequence.match(/.{1,50}/g)?.map((chunk, i) => (
                        <div key={i}>
                          <span style={{ color: '#666', marginRight: '8px' }}>
                            {(i * 50 + 1).toString().padStart(3, ' ')}:
                          </span>
                          {chunk}
                        </div>
                      ))}
                    </Paper>
                  </Grid>

                  {/* Properties */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" gutterBottom>
                      Predicted Properties
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 120 }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>Molecular Weight</TableCell>
                            <TableCell align="right">
                              {result.properties.molecularWeight.toFixed(1)} Da
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Isoelectric Point</TableCell>
                            <TableCell align="right">
                              {result.properties.isoelectricPoint.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          {result.properties.stability && (
                            <TableRow>
                              <TableCell>Stability Score</TableCell>
                              <TableCell align="right">
                                {result.properties.stability.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          )}
                          {result.properties.hydrophobicity && (
                            <TableRow>
                              <TableCell>Hydrophobicity</TableCell>
                              <TableCell align="right">
                                {(result.properties.hydrophobicity.reduce((a, b) => a + b, 0) / result.properties.hydrophobicity.length).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>

                {/* Generation Metadata */}
                <Box mt={2} pt={2} borderTop="1px solid #eee">
                  <Typography variant="caption" color="text.secondary">
                    Generated on {new Date(result.metadata.timestamp || Date.now()).toLocaleString()} •
                    Generation time: {result.metadata.generationTime?.toFixed(1)}s •
                    Memory used: {result.metadata.memoryUsed}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Generated Protein</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Protein Name"
            fullWidth
            variant="outlined"
            value={proteinName}
            onChange={(e) => setProteinName(e.target.value)}
            helperText="Enter a descriptive name for this protein"
          />
          {selectedResult && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                Sequence: {selectedResult.sequence.length} residues
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Confidence: {(selectedResult.confidence * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Model: {selectedResult.metadata.model}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveConfirm}
            variant="contained"
            disabled={!proteinName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GenerationResults;