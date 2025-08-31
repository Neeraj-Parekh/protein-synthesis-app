import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAppSelector } from '../store/hooks';
import ModernProteinViewer from '../components/Visualization/ModernProteinViewer';
import PerformanceMonitor from '../components/Performance/PerformanceMonitor';
import { loadSampleProtein } from '@/utils/pdbLoader';

const VisualizationPage: React.FC = () => {
  const { proteins, currentProteinId, loading, error } = useAppSelector(state => state.proteins);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [sampleProtein, setSampleProtein] = useState<any>(null);

  const currentProtein = currentProteinId ? proteins[currentProteinId] : sampleProtein;

  useEffect(() => {
    // Show performance monitor for large proteins
    if (currentProtein && currentProtein.sequence && currentProtein.sequence.length > 1000) {
      setShowPerformanceMonitor(true);
    }
  }, [currentProtein]);

  const handleLoadSample = async (pdbId: string) => {
    try {
      const protein = await loadSampleProtein(pdbId as any);
      setSampleProtein(protein);
    } catch (error) {
      console.error('Failed to load sample protein:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading protein structure...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading protein: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 0, height: '100vh' }}>
      <ModernProteinViewer
        protein={currentProtein}
        onLoadSample={handleLoadSample}
      />

      {showPerformanceMonitor && (
        <PerformanceMonitor
          visible={true}
          onMemoryPressure={() => {
            console.warn('Memory pressure detected in visualization');
          }}
        />
      )}
    </Box>
  );
};

export default VisualizationPage;