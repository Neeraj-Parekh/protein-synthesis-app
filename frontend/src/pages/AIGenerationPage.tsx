import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import ProteinGenerator from '../components/AI/ProteinGenerator';
import GenerationResults from '../components/AI/GenerationResults';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { addProtein } from '../store/slices/proteinSlice';
import { GeneratedProtein } from '../types/protein';

const AIGenerationPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { generations } = useAppSelector(state => state.ai);
  const [generationResults, setGenerationResults] = useState<GeneratedProtein[]>([]);

  const handleGenerationComplete = (result: GeneratedProtein) => {
    setGenerationResults(prev => [...prev, result]);
  };

  const handleSaveProtein = async (protein: GeneratedProtein, name: string) => {
    try {
      // Convert generated protein to protein structure format
      const proteinStructure = {
        id: `generated_${Date.now()}`,
        name,
        sequence: protein.sequence,
        atoms: [], // Would be populated by structure prediction
        residues: [], // Would be populated by structure prediction
        chains: [], // Would be populated by structure prediction
        secondaryStructure: [], // Would be populated by structure prediction
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
          center: { x: 0, y: 0, z: 0 },
          size: { x: 0, y: 0, z: 0 }
        },
        centerOfMass: { x: 0, y: 0, z: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          molecularWeight: protein.properties.molecularWeight,
          length: protein.sequence.length,
          source: 'AI Generated',
          model: protein.metadata.model,
          confidence: protein.confidence
        }
      };

      await dispatch(addProtein(proteinStructure));
      console.log('Generated protein saved successfully');
    } catch (error) {
      console.error('Failed to save generated protein:', error);
    }
  };

  const handleViewStructure = (sequence: string) => {
    // This would trigger structure prediction and visualization
    console.log('Viewing structure for sequence:', sequence.substring(0, 50) + '...');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        AI Protein Generation
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Generate novel protein sequences using state-of-the-art AI models. 
        Specify constraints to guide the generation process.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generation Parameters
              </Typography>
              <ProteinGenerator
                onGenerationComplete={handleGenerationComplete}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generation Results
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <GenerationResults
                results={generationResults}
                onSaveProtein={handleSaveProtein}
                onViewStructure={handleViewStructure}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIGenerationPage;