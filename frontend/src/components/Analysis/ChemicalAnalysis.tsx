import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { analyzeProtein } from '../../store/slices/analysisSlice';
import { ProteinStructure, SequenceAnalysis } from '../../types/protein';
import SequenceViewer from './SequenceViewer';
import PropertiesChart from './PropertiesChart';
import SecondaryStructureView from './SecondaryStructureView';

interface ChemicalAnalysisProps {
  proteinId: string;
  protein?: ProteinStructure;
  onAnalysisComplete?: (results: SequenceAnalysis) => void;
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
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ChemicalAnalysis: React.FC<ChemicalAnalysisProps> = ({
  proteinId,
  protein,
  onAnalysisComplete
}) => {
  const dispatch = useAppDispatch();
  const { analyses, loading, error } = useAppSelector(state => state.analysis);
  const [tabValue, setTabValue] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<SequenceAnalysis | null>(null);

  useEffect(() => {
    if (proteinId && !analyses[proteinId]) {
      dispatch(analyzeProtein({
        proteinId,
        analysisType: 'chemical',
        options: {
          includeHydrophobicity: true,
          includeChargeDistribution: true,
          includeSecondaryStructure: true
        }
      }));
    }
  }, [proteinId, dispatch, analyses]);

  useEffect(() => {
    const analysis = analyses[proteinId];
    if (analysis && analysis.analysisType === 'chemical') {
      setAnalysisResults(analysis.results as SequenceAnalysis);
      onAnalysisComplete?.(analysis.results as SequenceAnalysis);
    }
  }, [analyses, proteinId, onAnalysisComplete]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Analyzing protein chemical properties...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error analyzing protein: {error}
      </Alert>
    );
  }

  if (!analysisResults) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No analysis results available. Please upload a protein structure first.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Chemical Analysis
          </Typography>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="analysis tabs">
              <Tab label="Sequence" />
              <Tab label="Properties" />
              <Tab label="Secondary Structure" />
              <Tab label="Composition" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <SequenceViewer
              sequence={protein?.sequence || ''}
              analysisResults={analysisResults}
              onResidueSelect={(position) => {
                // Handle residue selection - could highlight in 3D viewer
                console.log('Selected residue at position:', position);
              }}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <PropertiesChart
              properties={analysisResults.properties}
              sequence={protein?.sequence || ''}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <SecondaryStructureView
              secondaryStructure={analysisResults.secondaryStructure || []}
              sequence={protein?.sequence || ''}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Amino Acid Composition
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {Object.entries(analysisResults.composition).map(([aa, count]) => (
                      <Box key={aa} display="flex" justifyContent="space-between" py={0.5}>
                        <Typography variant="body2">{aa}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {count} ({((count / (protein?.sequence.length || 1)) * 100).toFixed(1)}%)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Physical Properties
                  </Typography>
                  <Box>
                    <Box display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2">Molecular Weight:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {analysisResults.properties.molecularWeight.toFixed(2)} Da
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2">Isoelectric Point:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {analysisResults.properties.isoelectricPoint.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2">Length:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {protein?.sequence.length} residues
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ChemicalAnalysis;