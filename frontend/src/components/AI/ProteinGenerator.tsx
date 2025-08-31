import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Slider,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SelectChangeEvent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { generateProtein } from '../../store/slices/aiSlice';
import { GenerationConstraints, GeneratedProtein } from '../../types/protein';

interface ProteinGeneratorProps {
  onGenerationComplete?: (result: GeneratedProtein) => void;
}

const ProteinGenerator: React.FC<ProteinGeneratorProps> = ({
  onGenerationComplete
}) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.ai);
  
  // Form state
  const [model, setModel] = useState<'esm3' | 'esm3_chat' | 'rfdiffusion' | 'protflash'>('esm3');
  const [lengthRange, setLengthRange] = useState<[number, number]>([50, 200]);
  const [targetMW, setTargetMW] = useState<number>(15000);
  const [targetPI, setTargetPI] = useState<number>(7.0);
  const [temperature, setTemperature] = useState<number>(0.8);
  const [numSamples, setNumSamples] = useState<number>(1);
  const [useConstraints, setUseConstraints] = useState<boolean>(false);
  const [hydrophobic, setHydrophobic] = useState<number>(0.4);
  const [polar, setPolar] = useState<number>(0.3);
  const [charged, setCharged] = useState<number>(0.3);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  const handleModelChange = (event: SelectChangeEvent) => {
    setModel(event.target.value as 'esm3' | 'esm3_chat' | 'rfdiffusion' | 'protflash');
  };

  const handleLengthChange = (event: Event, newValue: number | number[]) => {
    setLengthRange(newValue as [number, number]);
  };

  const handleGenerate = async () => {
    const constraints: GenerationConstraints = {
      length: lengthRange,
      model
    };

    if (useConstraints) {
      constraints.composition = {
        hydrophobic,
        polar,
        charged
      };
      constraints.properties = {
        targetMW,
        targetPI
      };
    }

    try {
      const result = await dispatch(generateProtein(constraints)).unwrap();
      onGenerationComplete?.(result);
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  const resetForm = () => {
    setLengthRange([50, 200]);
    setTargetMW(15000);
    setTargetPI(7.0);
    setTemperature(0.8);
    setNumSamples(1);
    setUseConstraints(false);
    setHydrophobic(0.4);
    setPolar(0.3);
    setCharged(0.3);
    setCustomPrompt('');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            AI Protein Generator
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Generate novel protein sequences using state-of-the-art AI models. 
            Specify constraints to guide the generation process.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Model Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>AI Model</InputLabel>
                <Select
                  value={model}
                  label="AI Model"
                  onChange={handleModelChange}
                >
                  <MenuItem value="esm3">
                    ESM3 (Advanced, Comprehensive Analysis)
                  </MenuItem>
                  <MenuItem value="esm3_chat">
                    ESM3 Chat (Interactive Design)
                  </MenuItem>
                  <MenuItem value="rfdiffusion">
                    RFdiffusion (Structure Generation)
                  </MenuItem>
                  <MenuItem value="protflash">
                    ProtFlash (Fast, Lightweight)
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Number of Samples */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Number of Samples"
                type="number"
                value={numSamples}
                onChange={(e) => setNumSamples(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                inputProps={{ min: 1, max: 5 }}
                helperText="Generate 1-5 protein sequences"
              />
            </Grid>

            {/* Length Range */}
            <Grid item xs={12}>
              <Typography gutterBottom>
                Protein Length: {lengthRange[0]} - {lengthRange[1]} residues
              </Typography>
              <Slider
                value={lengthRange}
                onChange={handleLengthChange}
                valueLabelDisplay="auto"
                min={20}
                max={1000}
                step={10}
                marks={[
                  { value: 50, label: '50' },
                  { value: 200, label: '200' },
                  { value: 500, label: '500' },
                  { value: 1000, label: '1000' }
                ]}
              />
            </Grid>

            {/* Advanced Constraints */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useConstraints}
                    onChange={(e) => setUseConstraints(e.target.checked)}
                  />
                }
                label="Use Advanced Constraints"
              />
            </Grid>

            {useConstraints && (
              <>
                {/* Composition Constraints */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Amino Acid Composition</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Typography gutterBottom>
                            Hydrophobic: {(hydrophobic * 100).toFixed(0)}%
                          </Typography>
                          <Slider
                            value={hydrophobic}
                            onChange={(_, value) => setHydrophobic(value as number)}
                            min={0}
                            max={1}
                            step={0.05}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography gutterBottom>
                            Polar: {(polar * 100).toFixed(0)}%
                          </Typography>
                          <Slider
                            value={polar}
                            onChange={(_, value) => setPolar(value as number)}
                            min={0}
                            max={1}
                            step={0.05}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography gutterBottom>
                            Charged: {(charged * 100).toFixed(0)}%
                          </Typography>
                          <Slider
                            value={charged}
                            onChange={(_, value) => setCharged(value as number)}
                            min={0}
                            max={1}
                            step={0.05}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Physical Properties */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Physical Properties</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Target Molecular Weight (Da)"
                            type="number"
                            value={targetMW}
                            onChange={(e) => setTargetMW(parseFloat(e.target.value) || 15000)}
                            helperText="Approximate molecular weight"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Target Isoelectric Point"
                            type="number"
                            value={targetPI}
                            onChange={(e) => setTargetPI(parseFloat(e.target.value) || 7.0)}
                            inputProps={{ min: 3, max: 12, step: 0.1 }}
                            helperText="pH at which protein has no net charge"
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </>
            )}

            {/* Generation Parameters */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Generation Parameters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography gutterBottom>
                        Temperature: {temperature.toFixed(2)}
                      </Typography>
                      <Slider
                        value={temperature}
                        onChange={(_, value) => setTemperature(value as number)}
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        valueLabelDisplay="auto"
                        marks={[
                          { value: 0.5, label: 'Conservative' },
                          { value: 1.0, label: 'Balanced' },
                          { value: 1.5, label: 'Creative' }
                        ]}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Higher values produce more diverse sequences
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Custom Prompt (Optional)"
                        multiline
                        rows={3}
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="e.g., 'Generate a membrane protein with alpha helices'"
                        helperText="Provide additional context for generation"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : undefined}
                >
                  {loading ? 'Generating...' : 'Generate Protein'}
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Model Information */}
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Model Information
            </Typography>
            {model === 'esm3' && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>ESM3:</strong> State-of-the-art protein language model from Meta. 
                  Provides comprehensive analysis including structure prediction, function annotation, and high-quality sequence generation.
                </Typography>
              </Alert>
            )}
            {model === 'esm3_chat' && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>ESM3 Chat:</strong> Interactive version of ESM3 optimized for conversational protein design. 
                  Allows for iterative refinement and detailed explanations of design choices.
                </Typography>
              </Alert>
            )}
            {model === 'rfdiffusion' && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>RFdiffusion:</strong> Advanced protein structure generation model from the Baker lab. 
                  Specialized in creating novel protein folds and designing proteins with specific structural motifs.
                </Typography>
              </Alert>
            )}
            {model === 'protflash' && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>ProtFlash:</strong> Lightweight protein language model optimized for speed. 
                  Best for quick generation of diverse protein sequences with basic constraints.
                </Typography>
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProteinGenerator;