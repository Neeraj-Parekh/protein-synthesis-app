import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { compareProteins } from '../../store/slices/analysisSlice';
import { ComparisonResults, ProteinStructure } from '../../types/protein';
import SequenceAlignment from './SequenceAlignment';
import StructuralComparison from './StructuralComparison';
import ComparisonSummary from './ComparisonSummary';

interface ProteinComparisonProps {
  proteinIds: string[];
  proteins?: ProteinStructure[];
  onComparisonComplete?: (results: ComparisonResults) => void;
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
      id={`comparison-tabpanel-${index}`}
      aria-labelledby={`comparison-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ProteinComparison: React.FC<ProteinComparisonProps> = ({
  proteinIds,
  proteins = [],
  onComparisonComplete
}) => {
  const dispatch = useAppDispatch();
  const { comparisons, loading, error } = useAppSelector(state => state.analysis);
  const [comparisonType, setComparisonType] = useState<'sequence' | 'structure'>('sequence');
  const [tabValue, setTabValue] = useState(0);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults | null>(null);

  const comparisonKey = proteinIds.sort().join('-');

  useEffect(() => {
    if (proteinIds.length >= 2 && !comparisons[comparisonKey]) {
      handleCompare();
    }
  }, [proteinIds, comparisonType]);

  useEffect(() => {
    const comparison = comparisons[comparisonKey];
    if (comparison) {
      setComparisonResults(comparison.results as ComparisonResults);
      onComparisonComplete?.(comparison.results as ComparisonResults);
    }
  }, [comparisons, comparisonKey, onComparisonComplete]);

  const handleComparisonTypeChange = (event: SelectChangeEvent) => {
    setComparisonType(event.target.value as 'sequence' | 'structure');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCompare = () => {
    if (proteinIds.length < 2) {
      return;
    }

    dispatch(compareProteins({
      proteinIds,
      comparisonType,
      options: {
        alignmentMethod: 'global',
        includeStructural: comparisonType === 'structure'
      }
    }));
  };

  if (proteinIds.length < 2) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Please select at least 2 proteins to compare.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Comparing proteins...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error comparing proteins: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h2">
              Protein Comparison
            </Typography>
            
            <Box display="flex" gap={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Comparison Type</InputLabel>
                <Select
                  value={comparisonType}
                  label="Comparison Type"
                  onChange={handleComparisonTypeChange}
                >
                  <MenuItem value="sequence">Sequence</MenuItem>
                  <MenuItem value="structure">Structure</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                onClick={handleCompare}
                disabled={loading}
              >
                Compare
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Comparing {proteinIds.length} proteins: {proteinIds.join(', ')}
          </Typography>

          {comparisonResults && (
            <>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="comparison tabs">
                  <Tab label="Summary" />
                  <Tab label="Sequence Alignment" />
                  {comparisonType === 'structure' && <Tab label="Structural Analysis" />}
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <ComparisonSummary
                  results={comparisonResults}
                  proteins={proteins}
                  comparisonType={comparisonType}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <SequenceAlignment
                  alignment={comparisonResults.alignment}
                  proteins={proteins}
                />
              </TabPanel>

              {comparisonType === 'structure' && (
                <TabPanel value={tabValue} index={2}>
                  <StructuralComparison
                    structuralComparison={comparisonResults.structuralComparison}
                    proteins={proteins}
                  />
                </TabPanel>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProteinComparison;