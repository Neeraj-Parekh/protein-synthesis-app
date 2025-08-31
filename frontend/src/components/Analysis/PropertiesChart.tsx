import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ChemicalProperties } from '../../types/protein';

interface PropertiesChartProps {
  properties: ChemicalProperties;
  sequence: string;
}

const AMINO_ACID_GROUPS = {
  'Hydrophobic': ['A', 'V', 'I', 'L', 'M', 'F', 'Y', 'W'],
  'Polar': ['S', 'T', 'N', 'Q'],
  'Charged+': ['K', 'R', 'H'],
  'Charged-': ['D', 'E'],
  'Special': ['C', 'G', 'P']
};

const GROUP_COLORS = {
  'Hydrophobic': '#3498db',
  'Polar': '#2ecc71',
  'Charged+': '#e74c3c',
  'Charged-': '#f39c12',
  'Special': '#9b59b6'
};

const PropertiesChart: React.FC<PropertiesChartProps> = ({
  properties,
  sequence
}) => {
  // Prepare hydrophobicity plot data
  const hydrophobicityData = properties.hydrophobicity.map((value, index) => ({
    position: index + 1,
    hydrophobicity: value,
    residue: sequence[index]
  }));

  // Prepare charge distribution data
  const chargeData = properties.chargeDistribution.map((value, index) => ({
    position: index + 1,
    charge: value,
    residue: sequence[index]
  }));

  // Calculate amino acid group composition
  const groupComposition = Object.entries(AMINO_ACID_GROUPS).map(([group, residues]) => {
    const count = sequence.split('').filter(aa => residues.includes(aa)).length;
    return {
      name: group,
      count,
      percentage: (count / sequence.length) * 100
    };
  });

  // Calculate individual amino acid frequencies
  const aaFrequency = Array.from(new Set(sequence.split('')))
    .map(aa => ({
      aa,
      count: sequence.split('').filter(residue => residue === aa).length,
      percentage: (sequence.split('').filter(residue => residue === aa).length / sequence.length) * 100
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <Grid container spacing={3}>
      {/* Hydrophobicity Plot */}
      <Grid item xs={12} lg={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Hydrophobicity Profile
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hydrophobicityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="position" 
                label={{ value: 'Residue Position', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Hydrophobicity', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, _name, _props) => [
                  `${typeof value === 'number' ? value.toFixed(2) : value}`,
                  'Hydrophobicity'
                ]}
                labelFormatter={(position) => `${hydrophobicityData[position - 1]?.residue}${position}`}
              />
              <Line 
                type="monotone" 
                dataKey="hydrophobicity" 
                stroke="#3498db" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Charge Distribution Plot */}
      <Grid item xs={12} lg={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Charge Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chargeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="position"
                label={{ value: 'Residue Position', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Charge', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, _name, _props) => [
                  `${typeof value === 'number' && value > 0 ? '+' : ''}${value}`,
                  'Charge'
                ]}
                labelFormatter={(position) => `${chargeData[position - 1]?.residue}${position}`}
              />
              <Line 
                type="stepAfter" 
                dataKey="charge" 
                stroke="#e74c3c" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Amino Acid Group Composition */}
      <Grid item xs={12} lg={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Amino Acid Groups
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={groupComposition}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {groupComposition.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={GROUP_COLORS[entry.name as keyof typeof GROUP_COLORS]} 
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} residues`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Amino Acid Frequency */}
      <Grid item xs={12} lg={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Amino Acid Frequency
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aaFrequency.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="aa" />
              <YAxis />
              <Tooltip 
                formatter={(value, _name) => [`${value} (${aaFrequency.find(item => item.count === value)?.percentage.toFixed(1)}%)`, 'Count']}
              />
              <Bar dataKey="count" fill="#2ecc71" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Physical Properties Summary */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Physical Properties Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={1}>
                <Typography variant="h4" color="primary.contrastText">
                  {properties.molecularWeight.toFixed(0)}
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  Molecular Weight (Da)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2} bgcolor="secondary.light" borderRadius={1}>
                <Typography variant="h4" color="secondary.contrastText">
                  {properties.isoelectricPoint.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="secondary.contrastText">
                  Isoelectric Point
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={1}>
                <Typography variant="h4" color="success.contrastText">
                  {sequence.length}
                </Typography>
                <Typography variant="body2" color="success.contrastText">
                  Length (residues)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={1}>
                <Typography variant="h4" color="warning.contrastText">
                  {(properties.hydrophobicity.reduce((sum, val) => sum + val, 0) / properties.hydrophobicity.length).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="warning.contrastText">
                  Avg. Hydrophobicity
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default PropertiesChart;