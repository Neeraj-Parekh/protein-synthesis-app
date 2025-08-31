import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider
} from '@mui/material';
import { ComparisonResults, ProteinStructure } from '../../types/protein';

interface ComparisonSummaryProps {
  results: ComparisonResults;
  proteins: ProteinStructure[];
  comparisonType: 'sequence' | 'structure';
}

const ComparisonSummary: React.FC<ComparisonSummaryProps> = ({
  results,
  proteins,
  comparisonType
}) => {
  const getScoreColor = (score: number, type: 'identity' | 'similarity' | 'rmsd'): string => {
    if (type === 'rmsd') {
      // Lower RMSD is better
      if (score < 1.0) return 'success';
      if (score < 2.0) return 'warning';
      return 'error';
    } else {
      // Higher percentage is better
      if (score > 80) return 'success';
      if (score > 60) return 'warning';
      return 'error';
    }
  };

  const getOverallAssessment = (): { level: string; color: string; description: string } => {
    if (comparisonType === 'sequence') {
      const identity = results.alignment?.identity || 0;
      if (identity > 80) {
        return {
          level: 'Very High Similarity',
          color: '#2ecc71',
          description: 'These proteins are highly similar and likely have the same or very similar functions.'
        };
      } else if (identity > 60) {
        return {
          level: 'High Similarity',
          color: '#f39c12',
          description: 'These proteins show significant similarity and may have related functions.'
        };
      } else if (identity > 40) {
        return {
          level: 'Moderate Similarity',
          color: '#e67e22',
          description: 'These proteins have some similarity, suggesting possible evolutionary relationship.'
        };
      } else {
        return {
          level: 'Low Similarity',
          color: '#e74c3c',
          description: 'These proteins have limited similarity and likely have different functions.'
        };
      }
    } else {
      const rmsd = results.structuralComparison?.rmsd || Infinity;
      const similarity = results.structuralComparison?.structuralSimilarity || 0;
      
      if (rmsd < 1.0 && similarity > 0.8) {
        return {
          level: 'Very High Structural Similarity',
          color: '#2ecc71',
          description: 'These proteins have nearly identical 3D structures.'
        };
      } else if (rmsd < 2.0 && similarity > 0.6) {
        return {
          level: 'High Structural Similarity',
          color: '#f39c12',
          description: 'These proteins have similar 3D structures with minor differences.'
        };
      } else if (rmsd < 3.0 && similarity > 0.4) {
        return {
          level: 'Moderate Structural Similarity',
          color: '#e67e22',
          description: 'These proteins have some structural similarity but notable differences.'
        };
      } else {
        return {
          level: 'Low Structural Similarity',
          color: '#e74c3c',
          description: 'These proteins have significantly different 3D structures.'
        };
      }
    }
  };

  const assessment = getOverallAssessment();

  return (
    <Box>
      {/* Overall Assessment */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: assessment.color + '10' }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h5" sx={{ color: assessment.color, mr: 2 }}>
            {assessment.level}
          </Typography>
          <Chip
            label={comparisonType === 'sequence' ? 'Sequence Analysis' : 'Structural Analysis'}
            color="primary"
            size="small"
          />
        </Box>
        <Typography variant="body1">
          {assessment.description}
        </Typography>
      </Paper>

      {/* Comparison Metrics */}
      <Grid container spacing={3} mb={3}>
        {/* Sequence Metrics */}
        {results.alignment && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color={`${getScoreColor(results.alignment.identity, 'identity')}.main`}>
                    {results.alignment.identity.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sequence Identity
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={results.alignment.identity}
                    color={getScoreColor(results.alignment.identity, 'identity') as 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color={`${getScoreColor(results.alignment.similarity, 'similarity')}.main`}>
                    {results.alignment.similarity.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sequence Similarity
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={results.alignment.similarity}
                    color={getScoreColor(results.alignment.similarity, 'similarity') as 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {results.alignment.score.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Alignment Score
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Structural Metrics */}
        {results.structuralComparison && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color={`${getScoreColor(results.structuralComparison.rmsd, 'rmsd')}.main`}>
                    {results.structuralComparison.rmsd.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    RMSD (Å)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color={`${getScoreColor(results.structuralComparison.structuralSimilarity * 100, 'similarity')}.main`}>
                    {(results.structuralComparison.structuralSimilarity * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Structural Similarity
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={results.structuralComparison.structuralSimilarity * 100}
                    color={getScoreColor(results.structuralComparison.structuralSimilarity * 100, 'similarity') as 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {results.structuralComparison.alignedResidues}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aligned Residues
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Protein Information */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Compared Proteins
        </Typography>
        <Grid container spacing={2}>
          {proteins.map((protein, index) => (
            <Grid item xs={12} md={6} key={protein.id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Protein {index + 1}: {protein.name}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    <Chip size="small" label={`${protein.sequence.length} residues`} />
                    <Chip size="small" label={`MW: ${protein.metadata?.molecularWeight?.toFixed(1) || 'N/A'} kDa`} />
                    {protein.chains && (
                      <Chip size="small" label={`${protein.chains.length} chain(s)`} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {protein.sequence.length > 50 
                      ? `${protein.sequence.substring(0, 50)}...`
                      : protein.sequence
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Common Domains */}
      {results.commonDomains && results.commonDomains.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Common Domains ({results.commonDomains.length})
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {results.commonDomains.map((domain, index) => (
              <Chip
                key={index}
                label={domain.name}
                color="secondary"
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Recommendations */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Analysis Recommendations
        </Typography>
        <Box>
          {comparisonType === 'sequence' && results.alignment && (
            <>
              {results.alignment.identity > 90 && (
                <Typography variant="body2" paragraph>
                  • These proteins are nearly identical and likely represent the same protein or very close homologs.
                </Typography>
              )}
              {results.alignment.identity > 70 && results.alignment.identity <= 90 && (
                <Typography variant="body2" paragraph>
                  • Consider functional analysis to understand any differences in activity or regulation.
                </Typography>
              )}
              {results.alignment.identity > 40 && results.alignment.identity <= 70 && (
                <Typography variant="body2" paragraph>
                  • These proteins may belong to the same family but have diverged functionally.
                  • Structural comparison is recommended to understand 3D similarities.
                </Typography>
              )}
              {results.alignment.identity <= 40 && (
                <Typography variant="body2" paragraph>
                  • Low sequence similarity suggests different functions or distant evolutionary relationship.
                  • Consider domain analysis to identify any conserved functional regions.
                </Typography>
              )}
            </>
          )}
          
          {comparisonType === 'structure' && results.structuralComparison && (
            <>
              {results.structuralComparison.rmsd < 1.0 && (
                <Typography variant="body2" paragraph>
                  • Excellent structural match - these proteins likely have very similar functions.
                </Typography>
              )}
              {results.structuralComparison.rmsd >= 1.0 && results.structuralComparison.rmsd < 2.0 && (
                <Typography variant="body2" paragraph>
                  • Good structural similarity - minor differences may reflect functional specialization.
                </Typography>
              )}
              {results.structuralComparison.rmsd >= 2.0 && (
                <Typography variant="body2" paragraph>
                  • Significant structural differences detected - functional analysis recommended.
                </Typography>
              )}
              {results.structuralComparison.commonDomains.length > 0 && (
                <Typography variant="body2" paragraph>
                  • Shared domains suggest conserved functional regions despite overall differences.
                </Typography>
              )}
            </>
          )}
          
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" color="text.secondary">
            For more detailed analysis, explore the individual alignment and structural comparison tabs.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ComparisonSummary;