import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { useAppSelector } from '../store/hooks';
import ChemicalAnalysis from '../components/Analysis/ChemicalAnalysis';

const AnalysisPage: React.FC = () => {
  const { proteins, currentProteinId } = useAppSelector(state => state.proteins);
  const currentProtein = currentProteinId ? proteins[currentProteinId] : null;

  if (!currentProtein) {
    return (
      <Card sx={{ m: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Chemical Analysis
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please upload a protein structure to begin analysis.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Chemical Analysis
      </Typography>
      
      <ChemicalAnalysis
        proteinId={currentProteinId!}
        protein={currentProtein}
        onAnalysisComplete={(results) => {
          console.log('Analysis completed:', results);
        }}
      />
    </Box>
  );
};

export default AnalysisPage;