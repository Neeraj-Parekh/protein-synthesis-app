import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { useAppSelector } from '../store/hooks';
import ProteinComparison from '../components/Comparison/ProteinComparison';
import { ComparisonResults } from '../types/protein';

const ComparisonPage: React.FC = () => {
  const { proteins } = useAppSelector(state => state.proteins);
  const [selectedProteinIds, setSelectedProteinIds] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults | null>(null);

  const proteinList = Object.values(proteins);

  const handleProteinSelection = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedProteinIds(typeof value === 'string' ? value.split(',') : value);
  };

  const handleRemoveProtein = (proteinId: string) => {
    setSelectedProteinIds(prev => prev.filter(id => id !== proteinId));
  };

  const handleComparisonComplete = (results: ComparisonResults) => {
    setComparisonResults(results);
  };

  const clearSelection = () => {
    setSelectedProteinIds([]);
    setComparisonResults(null);
  };

  if (proteinList.length === 0) {
    return (
      <Card sx={{ m: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Protein Comparison
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please upload at least two protein structures to begin comparison.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Protein Comparison
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Compare multiple protein structures to analyze similarities, differences, 
        and evolutionary relationships.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Proteins for Comparison
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Proteins</InputLabel>
                    <Select
                      multiple
                      value={selectedProteinIds}
                      onChange={handleProteinSelection}
                      label="Select Proteins"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const protein = proteins[value];
                            return (
                              <Chip
                                key={value}
                                label={protein?.name || value}
                                size="small"
                                onDelete={() => handleRemoveProtein(value)}
                                onMouseDown={(event) => {
                                  event.stopPropagation();
                                }}
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {proteinList.map((protein) => (
                        <MenuItem key={protein.id} value={protein.id}>
                          {protein.name} ({protein.sequence.length} residues)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Button
                    variant="outlined"
                    onClick={clearSelection}
                    disabled={selectedProteinIds.length === 0}
                  >
                    Clear Selection
                  </Button>
                </Grid>
              </Grid>

              {selectedProteinIds.length > 0 && selectedProteinIds.length < 2 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Please select at least 2 proteins for comparison.
                </Alert>
              )}

              {selectedProteinIds.length > 5 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Comparing more than 5 proteins may take longer to process.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {selectedProteinIds.length >= 2 && (
          <Grid item xs={12}>
            <ProteinComparison
              proteinIds={selectedProteinIds}
              proteins={selectedProteinIds.map(id => proteins[id]).filter(Boolean)}
              onComparisonComplete={handleComparisonComplete}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ComparisonPage;