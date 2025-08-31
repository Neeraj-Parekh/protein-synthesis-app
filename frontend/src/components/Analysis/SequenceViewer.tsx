import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { SequenceAnalysis } from '../../types/protein';

interface SequenceViewerProps {
  sequence: string;
  analysisResults?: SequenceAnalysis;
  onResidueSelect?: (position: number) => void;
}

type ColorScheme = 'hydrophobicity' | 'charge' | 'secondary' | 'none';

const AMINO_ACID_PROPERTIES = {
  hydrophobicity: {
    A: 0.62, R: -2.53, N: -0.78, D: -0.90, C: 0.29,
    Q: -0.85, E: -0.74, G: 0.48, H: -0.40, I: 1.38,
    L: 1.06, K: -1.50, M: 0.64, F: 1.19, P: 0.12,
    S: -0.18, T: -0.05, W: 0.81, Y: 0.26, V: 1.08
  },
  charge: {
    R: 1, K: 1, H: 0.5, D: -1, E: -1,
    // All others are neutral (0)
  }
};

const getHydrophobicityColor = (value: number): string => {
  // Normalize to 0-1 range and create color gradient
  const normalized = (value + 3) / 6; // Rough normalization
  const red = Math.floor(255 * (1 - normalized));
  const blue = Math.floor(255 * normalized);
  return `rgb(${red}, 100, ${blue})`;
};

const getChargeColor = (charge: number): string => {
  if (charge > 0) return '#ff6b6b'; // Positive - red
  if (charge < 0) return '#4ecdc4'; // Negative - cyan
  return '#95a5a6'; // Neutral - gray
};

const getSecondaryStructureColor = (type: string): string => {
  switch (type) {
    case 'helix': return '#e74c3c';
    case 'sheet': return '#3498db';
    case 'loop': return '#95a5a6';
    default: return '#ecf0f1';
  }
};

const SequenceViewer: React.FC<SequenceViewerProps> = ({
  sequence,
  analysisResults,
  onResidueSelect
}) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('none');
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const handleColorSchemeChange = (event: SelectChangeEvent) => {
    setColorScheme(event.target.value as ColorScheme);
  };

  const handleResidueClick = (position: number) => {
    setSelectedPosition(position);
    onResidueSelect?.(position);
  };

  const getResidueColor = (residue: string, position: number): string => {
    switch (colorScheme) {
      case 'hydrophobicity': {
        const hydrophobicity = AMINO_ACID_PROPERTIES.hydrophobicity[residue as keyof typeof AMINO_ACID_PROPERTIES.hydrophobicity] || 0;
        return getHydrophobicityColor(hydrophobicity);
      }
      
      case 'charge': {
        const charge = AMINO_ACID_PROPERTIES.charge[residue as keyof typeof AMINO_ACID_PROPERTIES.charge] || 0;
        return getChargeColor(charge);
      }
      
      case 'secondary':
        if (analysisResults?.secondaryStructure) {
          const structure = analysisResults.secondaryStructure.find(
            s => position >= s.start && position <= s.end
          );
          return getSecondaryStructureColor(structure?.type || 'loop');
        }
        return '#ecf0f1';
      
      default:
        return '#ecf0f1';
    }
  };

  const getResidueTooltip = (residue: string, position: number): string => {
    let tooltip = `${residue}${position + 1}`;
    
    if (colorScheme === 'hydrophobicity') {
      const hydrophobicity = AMINO_ACID_PROPERTIES.hydrophobicity[residue as keyof typeof AMINO_ACID_PROPERTIES.hydrophobicity];
      if (hydrophobicity !== undefined) {
        tooltip += `\nHydrophobicity: ${hydrophobicity.toFixed(2)}`;
      }
    }
    
    if (colorScheme === 'charge') {
      const charge = AMINO_ACID_PROPERTIES.charge[residue as keyof typeof AMINO_ACID_PROPERTIES.charge] || 0;
      tooltip += `\nCharge: ${charge > 0 ? '+' : ''}${charge}`;
    }
    
    if (colorScheme === 'secondary' && analysisResults?.secondaryStructure) {
      const structure = analysisResults.secondaryStructure.find(
        s => position >= s.start && position <= s.end
      );
      tooltip += `\nSecondary Structure: ${structure?.type || 'loop'}`;
    }
    
    return tooltip;
  };

  const sequenceRows = useMemo(() => {
    const rows = [];
    const residuesPerRow = 50;
    
    for (let i = 0; i < sequence.length; i += residuesPerRow) {
      const rowSequence = sequence.slice(i, i + residuesPerRow);
      rows.push({
        start: i,
        sequence: rowSequence
      });
    }
    
    return rows;
  }, [sequence]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Protein Sequence ({sequence.length} residues)
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Color Scheme</InputLabel>
          <Select
            value={colorScheme}
            label="Color Scheme"
            onChange={handleColorSchemeChange}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="hydrophobicity">Hydrophobicity</MenuItem>
            <MenuItem value="charge">Charge</MenuItem>
            <MenuItem value="secondary">Secondary Structure</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
        {sequenceRows.map((row, rowIndex) => (
          <Box key={rowIndex} mb={2}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 0.5 }}
            >
              {row.start + 1}-{row.start + row.sequence.length}
            </Typography>
            
            <Box
              sx={{
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: 1.2,
                letterSpacing: '1px'
              }}
            >
              {row.sequence.split('').map((residue, index) => {
                const globalPosition = row.start + index;
                const isSelected = selectedPosition === globalPosition;
                
                return (
                  <Tooltip
                    key={globalPosition}
                    title={getResidueTooltip(residue, globalPosition)}
                    arrow
                  >
                    <span
                      style={{
                        backgroundColor: getResidueColor(residue, globalPosition),
                        color: colorScheme === 'none' ? '#333' : '#fff',
                        padding: '2px 1px',
                        margin: '0 1px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #333' : 'none',
                        borderRadius: '2px',
                        fontWeight: isSelected ? 'bold' : 'normal'
                      }}
                      onClick={() => handleResidueClick(globalPosition)}
                    >
                      {residue}
                    </span>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>
        ))}
      </Paper>

      {colorScheme !== 'none' && (
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            Color Legend:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
            {colorScheme === 'hydrophobicity' && (
              <>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: getHydrophobicityColor(-2),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="caption">Hydrophilic</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: getHydrophobicityColor(2),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="caption">Hydrophobic</Typography>
                </Box>
              </>
            )}
            
            {colorScheme === 'charge' && (
              <>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: getChargeColor(1),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="caption">Positive</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: getChargeColor(-1),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="caption">Negative</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: getChargeColor(0),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="caption">Neutral</Typography>
                </Box>
              </>
            )}
            
            {colorScheme === 'secondary' && (
              <>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: getSecondaryStructureColor('helix'),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="caption">Helix</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: getSecondaryStructureColor('sheet'),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="caption">Sheet</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: getSecondaryStructureColor('loop'),
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="caption">Loop</Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SequenceViewer;