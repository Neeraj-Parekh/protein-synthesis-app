import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControlLabel,
  Switch
} from '@mui/material';
import { SecondaryStructure } from '../../types/protein';

interface SecondaryStructureViewProps {
  secondaryStructure: SecondaryStructure[];
  sequence: string;
}

const STRUCTURE_COLORS = {
  helix: '#e74c3c',
  sheet: '#3498db',
  loop: '#95a5a6',
  turn: '#f39c12',
  coil: '#9b59b6'
};

const STRUCTURE_SYMBOLS = {
  helix: '⍺',
  sheet: 'β',
  loop: '~',
  turn: '↻',
  coil: '○'
};

const SecondaryStructureView: React.FC<SecondaryStructureViewProps> = ({
  secondaryStructure,
  sequence
}) => {
  const [showVisualization, setShowVisualization] = useState(true);

  // Create a visual representation of the secondary structure
  const createStructureVisualization = () => {
    const visualization = new Array(sequence.length).fill('loop');
    
    secondaryStructure.forEach(structure => {
      for (let i = structure.start; i <= structure.end; i++) {
        if (i < sequence.length) {
          visualization[i] = structure.type;
        }
      }
    });
    
    return visualization;
  };

  const structureVisualization = createStructureVisualization();

  // Group consecutive residues of the same structure type
  const createStructureBlocks = () => {
    const blocks = [];
    let currentBlock = null;
    
    structureVisualization.forEach((structureType, index) => {
      if (!currentBlock || currentBlock.type !== structureType) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: structureType,
          start: index,
          end: index,
          length: 1
        };
      } else {
        currentBlock.end = index;
        currentBlock.length++;
      }
    });
    
    if (currentBlock) {
      blocks.push(currentBlock);
    }
    
    return blocks;
  };

  const structureBlocks = createStructureBlocks();

  // Calculate statistics
  const statistics = {
    helix: structureVisualization.filter(s => s === 'helix').length,
    sheet: structureVisualization.filter(s => s === 'sheet').length,
    loop: structureVisualization.filter(s => s === 'loop').length,
    turn: structureVisualization.filter(s => s === 'turn').length,
    coil: structureVisualization.filter(s => s === 'coil').length
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Secondary Structure Analysis
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={showVisualization}
              onChange={(e) => setShowVisualization(e.target.checked)}
            />
          }
          label="Show Visualization"
        />
      </Box>

      {/* Statistics */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Structure Composition
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {Object.entries(statistics).map(([type, count]) => (
            <Chip
              key={type}
              label={`${STRUCTURE_SYMBOLS[type as keyof typeof STRUCTURE_SYMBOLS]} ${type}: ${count} (${((count / sequence.length) * 100).toFixed(1)}%)`}
              sx={{
                backgroundColor: STRUCTURE_COLORS[type as keyof typeof STRUCTURE_COLORS],
                color: 'white'
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Visual Representation */}
      {showVisualization && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Structure Visualization
          </Typography>
          <Box
            sx={{
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.5,
              maxHeight: 200,
              overflow: 'auto',
              border: '1px solid #ddd',
              borderRadius: 1,
              p: 1,
              backgroundColor: '#f9f9f9'
            }}
          >
            {structureBlocks.map((block, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: STRUCTURE_COLORS[block.type as keyof typeof STRUCTURE_COLORS],
                  color: 'white',
                  padding: '1px 2px',
                  margin: '0 1px',
                  borderRadius: '2px',
                  fontSize: '10px'
                }}
                title={`${block.type}: ${block.start + 1}-${block.end + 1} (${block.length} residues)`}
              >
                {STRUCTURE_SYMBOLS[block.type as keyof typeof STRUCTURE_SYMBOLS].repeat(Math.max(1, Math.floor(block.length / 5)))}
              </span>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Each symbol represents approximately 5 residues. Hover for details.
          </Typography>
        </Paper>
      )}

      {/* Detailed Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Length</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Sequence</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {secondaryStructure
              .sort((a, b) => a.start - b.start)
              .map((structure, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip
                      size="small"
                      label={`${STRUCTURE_SYMBOLS[structure.type as keyof typeof STRUCTURE_SYMBOLS]} ${structure.type}`}
                      sx={{
                        backgroundColor: STRUCTURE_COLORS[structure.type as keyof typeof STRUCTURE_COLORS],
                        color: 'white',
                        fontSize: '11px'
                      }}
                    />
                  </TableCell>
                  <TableCell>{structure.start + 1}</TableCell>
                  <TableCell>{structure.end + 1}</TableCell>
                  <TableCell>{structure.end - structure.start + 1}</TableCell>
                  <TableCell>
                    {structure.confidence ? 
                      `${(structure.confidence * 100).toFixed(1)}%` : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={sequence.slice(structure.start, structure.end + 1)}
                    >
                      {sequence.slice(structure.start, structure.end + 1)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {secondaryStructure.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No secondary structure data available. 
            This may be because the structure hasn't been analyzed yet or the protein is too small.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SecondaryStructureView;