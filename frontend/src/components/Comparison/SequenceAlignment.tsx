import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
  SelectChangeEvent
} from '@mui/material';
import { SequenceAlignment as SequenceAlignmentType, ProteinStructure } from '../../types/protein';

interface SequenceAlignmentProps {
  alignment?: SequenceAlignmentType;
  proteins: ProteinStructure[];
}

type ColorScheme = 'identity' | 'similarity' | 'none';

const SequenceAlignment: React.FC<SequenceAlignmentProps> = ({
  alignment,
  proteins
}) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('identity');
  const [showRuler, setShowRuler] = useState(true);
  const [fontSize, setFontSize] = useState(12);
  const [residuesPerLine, setResiduesPerLine] = useState(60);

  if (!alignment) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No alignment data available.
        </Typography>
      </Paper>
    );
  }

  const handleColorSchemeChange = (event: SelectChangeEvent) => {
    setColorScheme(event.target.value as ColorScheme);
  };

  const getResidueColor = (residue1: string, residue2: string, match: string): string => {
    if (colorScheme === 'none') return 'transparent';
    
    if (match === '|') {
      // Identical residues
      return colorScheme === 'identity' ? '#2ecc71' : '#2ecc71';
    } else if (match === ':') {
      // Similar residues
      return colorScheme === 'similarity' ? '#f39c12' : 'transparent';
    } else if (match === '.') {
      // Weakly similar residues
      return colorScheme === 'similarity' ? '#e67e22' : 'transparent';
    }
    
    return 'transparent';
  };

  const formatAlignment = () => {
    const lines = [];
    const seq1 = alignment.sequence1;
    const seq2 = alignment.sequence2;
    const matches = alignment.matches;
    
    for (let i = 0; i < seq1.length; i += residuesPerLine) {
      const seq1Chunk = seq1.slice(i, i + residuesPerLine);
      const seq2Chunk = seq2.slice(i, i + residuesPerLine);
      const matchChunk = matches.slice(i, i + residuesPerLine);
      
      lines.push({
        start: i + 1,
        seq1: seq1Chunk,
        seq2: seq2Chunk,
        matches: matchChunk
      });
    }
    
    return lines;
  };

  const alignmentLines = formatAlignment();

  return (
    <Box>
      {/* Controls */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={3} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Color Scheme</InputLabel>
          <Select
            value={colorScheme}
            label="Color Scheme"
            onChange={handleColorSchemeChange}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="identity">Identity</MenuItem>
            <MenuItem value="similarity">Similarity</MenuItem>
          </Select>
        </FormControl>
        
        <FormControlLabel
          control={
            <Switch
              checked={showRuler}
              onChange={(e) => setShowRuler(e.target.checked)}
            />
          }
          label="Show Ruler"
        />
        
        <Box sx={{ width: 150 }}>
          <Typography variant="caption" gutterBottom>
            Font Size: {fontSize}px
          </Typography>
          <Slider
            value={fontSize}
            onChange={(_, value) => setFontSize(value as number)}
            min={8}
            max={16}
            step={1}
            size="small"
          />
        </Box>
        
        <Box sx={{ width: 150 }}>
          <Typography variant="caption" gutterBottom>
            Residues per line: {residuesPerLine}
          </Typography>
          <Slider
            value={residuesPerLine}
            onChange={(_, value) => setResiduesPerLine(value as number)}
            min={40}
            max={100}
            step={10}
            size="small"
          />
        </Box>
      </Box>

      {/* Alignment Statistics */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Alignment Statistics
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Score
            </Typography>
            <Typography variant="h6">
              {alignment.score.toFixed(2)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Identity
            </Typography>
            <Typography variant="h6">
              {alignment.identity.toFixed(1)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Similarity
            </Typography>
            <Typography variant="h6">
              {alignment.similarity.toFixed(1)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Length
            </Typography>
            <Typography variant="h6">
              {alignment.sequence1.length}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Alignment Display */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Sequence Alignment
        </Typography>
        
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            lineHeight: 1.4,
            maxHeight: 600,
            overflow: 'auto',
            backgroundColor: '#f9f9f9',
            p: 2,
            borderRadius: 1
          }}
        >
          {alignmentLines.map((line, lineIndex) => (
            <Box key={lineIndex} mb={2}>
              {/* Ruler */}
              {showRuler && (
                <Box mb={0.5}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: `${fontSize - 2}px`,
                      color: 'text.secondary'
                    }}
                  >
                    {Array.from({ length: line.seq1.length }, (_, i) => {
                      const pos = line.start + i;
                      return pos % 10 === 0 ? '|' : pos % 5 === 0 ? ':' : ' ';
                    }).join('')}
                  </Typography>
                </Box>
              )}
              
              {/* Sequence 1 */}
              <Box display="flex" alignItems="center" mb={0.5}>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: `${fontSize}px`,
                    minWidth: 80,
                    mr: 1
                  }}
                >
                  {proteins[0]?.name || 'Seq1'}:
                </Typography>
                <Box>
                  {line.seq1.split('').map((residue, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: getResidueColor(
                          residue,
                          line.seq2[i],
                          line.matches[i]
                        ),
                        color: colorScheme !== 'none' && line.matches[i] === '|' ? 'white' : 'inherit',
                        padding: '1px',
                        borderRadius: '2px'
                      }}
                    >
                      {residue}
                    </span>
                  ))}
                </Box>
              </Box>
              
              {/* Match line */}
              <Box display="flex" alignItems="center" mb={0.5}>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: `${fontSize}px`,
                    minWidth: 80,
                    mr: 1,
                    color: 'text.secondary'
                  }}
                >
                  
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: `${fontSize}px`,
                    color: 'text.secondary'
                  }}
                >
                  {line.matches}
                </Typography>
              </Box>
              
              {/* Sequence 2 */}
              <Box display="flex" alignItems="center">
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: `${fontSize}px`,
                    minWidth: 80,
                    mr: 1
                  }}
                >
                  {proteins[1]?.name || 'Seq2'}:
                </Typography>
                <Box>
                  {line.seq2.split('').map((residue, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: getResidueColor(
                          line.seq1[i],
                          residue,
                          line.matches[i]
                        ),
                        color: colorScheme !== 'none' && line.matches[i] === '|' ? 'white' : 'inherit',
                        padding: '1px',
                        borderRadius: '2px'
                      }}
                    >
                      {residue}
                    </span>
                  ))}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Legend */}
      {colorScheme !== 'none' && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Legend
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  backgroundColor: '#2ecc71',
                  borderRadius: '2px'
                }}
              />
              <Typography variant="caption">
                Identical (|)
              </Typography>
            </Box>
            {colorScheme === 'similarity' && (
              <>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: '#f39c12',
                      borderRadius: '2px'
                    }}
                  />
                  <Typography variant="caption">
                    Similar (:)
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: '#e67e22',
                      borderRadius: '2px'
                    }}
                  />
                  <Typography variant="caption">
                    Weakly Similar (.)
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default SequenceAlignment;