import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { StructuralComparison as StructuralComparisonType, ProteinStructure, ComparisonDomain } from '../../types/protein';

interface StructuralComparisonProps {
  structuralComparison?: StructuralComparisonType;
  proteins: ProteinStructure[];
}

const StructuralComparison: React.FC<StructuralComparisonProps> = ({
  structuralComparison,
  proteins
}) => {
  if (!structuralComparison) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No structural comparison data available.
        </Typography>
      </Paper>
    );
  }

  const getRMSDColor = (rmsd: number): string => {
    if (rmsd < 1.0) return '#2ecc71'; // Very similar - green
    if (rmsd < 2.0) return '#f39c12'; // Moderately similar - orange
    if (rmsd < 3.0) return '#e67e22'; // Somewhat similar - dark orange
    return '#e74c3c'; // Different - red
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity > 0.8) return '#2ecc71'; // High similarity - green
    if (similarity > 0.6) return '#f39c12'; // Moderate similarity - orange
    if (similarity > 0.4) return '#e67e22'; // Low similarity - dark orange
    return '#e74c3c'; // Very low similarity - red
  };

  return (
    <Box>
      {/* Structural Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: getRMSDColor(structuralComparison.rmsd) }}>
              {structuralComparison.rmsd.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              RMSD (Å)
            </Typography>
            <Typography variant="caption" display="block" mt={1}>
              {structuralComparison.rmsd < 1.0 ? 'Very Similar' :
               structuralComparison.rmsd < 2.0 ? 'Similar' :
               structuralComparison.rmsd < 3.0 ? 'Moderately Similar' : 'Different'}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: getSimilarityColor(structuralComparison.structuralSimilarity) }}>
              {(structuralComparison.structuralSimilarity * 100).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Structural Similarity
            </Typography>
            <Typography variant="caption" display="block" mt={1}>
              {structuralComparison.structuralSimilarity > 0.8 ? 'High' :
               structuralComparison.structuralSimilarity > 0.6 ? 'Moderate' :
               structuralComparison.structuralSimilarity > 0.4 ? 'Low' : 'Very Low'}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {structuralComparison.alignedResidues}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aligned Residues
            </Typography>
            <Typography variant="caption" display="block" mt={1}>
              {proteins.length > 0 && 
                `${((structuralComparison.alignedResidues / Math.min(proteins[0]?.sequence?.length || 0, proteins[1]?.sequence?.length || 0)) * 100).toFixed(1)}% coverage`
              }
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary">
              {structuralComparison.commonDomains.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Common Domains
            </Typography>
            <Typography variant="caption" display="block" mt={1}>
              Shared structural domains
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* RMSD Interpretation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          RMSD Interpretation
        </Typography>
        <Typography variant="body2" paragraph>
          Root Mean Square Deviation (RMSD) measures the average distance between aligned atoms. 
          Lower values indicate more similar structures.
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          <Chip
            size="small"
            label="< 1.0 Å: Very Similar"
            sx={{ backgroundColor: '#2ecc71', color: 'white' }}
          />
          <Chip
            size="small"
            label="1.0-2.0 Å: Similar"
            sx={{ backgroundColor: '#f39c12', color: 'white' }}
          />
          <Chip
            size="small"
            label="2.0-3.0 Å: Moderately Similar"
            sx={{ backgroundColor: '#e67e22', color: 'white' }}
          />
          <Chip
            size="small"
            label="> 3.0 Å: Different"
            sx={{ backgroundColor: '#e74c3c', color: 'white' }}
          />
        </Box>
      </Paper>

      {/* Common Domains */}
      {structuralComparison.commonDomains.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Common Structural Domains
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Domain Name</TableCell>
                  <TableCell>Protein 1 Region</TableCell>
                  <TableCell>Protein 2 Region</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {structuralComparison.commonDomains.map((domain, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {domain.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {domain.start1 + 1}-{domain.end1 + 1}
                    </TableCell>
                    <TableCell>
                      {domain.start2 + 1}-{domain.end2 + 1}
                    </TableCell>
                    <TableCell>
                      {domain.end1 - domain.start1 + 1} / {domain.end2 - domain.start2 + 1}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${(domain.confidence * 100).toFixed(1)}%`}
                        color={domain.confidence > 0.8 ? 'success' : domain.confidence > 0.6 ? 'warning' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Structural Analysis Summary */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Analysis Summary
        </Typography>
        <Box>
          <Typography variant="body2" paragraph>
            <strong>Overall Assessment:</strong> {' '}
            {structuralComparison.rmsd < 1.0 && structuralComparison.structuralSimilarity > 0.8
              ? 'The proteins have very similar 3D structures, suggesting they may have similar functions or evolutionary origins.'
              : structuralComparison.rmsd < 2.0 && structuralComparison.structuralSimilarity > 0.6
              ? 'The proteins show significant structural similarity, with some differences that may reflect functional variations.'
              : structuralComparison.rmsd < 3.0 && structuralComparison.structuralSimilarity > 0.4
              ? 'The proteins have moderate structural similarity, suggesting possible distant evolutionary relationship or similar fold families.'
              : 'The proteins have significantly different structures, indicating different functions or evolutionary origins.'
            }
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Alignment Quality:</strong> {' '}
            {structuralComparison.alignedResidues} residues were successfully aligned, representing{' '}
            {proteins.length > 0 && 
              `${((structuralComparison.alignedResidues / Math.min(proteins[0]?.sequence?.length || 0, proteins[1]?.sequence?.length || 0)) * 100).toFixed(1)}%`
            } coverage of the shorter protein.
          </Typography>
          
          {structuralComparison.commonDomains.length > 0 && (
            <Typography variant="body2" paragraph>
              <strong>Shared Domains:</strong> {' '}
              {structuralComparison.commonDomains.length} common structural domain(s) were identified, 
              indicating conserved functional regions between the proteins.
            </Typography>
          )}
          
          <Typography variant="body2">
            <strong>Recommendations:</strong> {' '}
            {structuralComparison.structuralSimilarity > 0.7
              ? 'These proteins likely share similar functions and could be used interchangeably in some contexts.'
              : structuralComparison.structuralSimilarity > 0.5
              ? 'Further functional analysis is recommended to understand the significance of structural differences.'
              : 'These proteins appear to have distinct structures and likely different functions.'
            }
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default StructuralComparison;