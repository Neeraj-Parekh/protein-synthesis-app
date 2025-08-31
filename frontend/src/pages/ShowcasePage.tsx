/**
 * Protein Viewer Showcase - Demonstrates all visualization features
 */
import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Science,
  ViewInAr,
  Biotech,
  Psychology,
  School,
  ExpandMore,
  PlayArrow,
  AutoAwesome,
  Memory,
  Speed,
  Visibility,
} from '@mui/icons-material';
import ProteinViewer from '../components/Visualization/ProteinViewer';
import { SAMPLE_PROTEINS, SampleProteinInfo } from '../utils/pdbLoader';
import { ProteinStructure } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ShowcasePage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [currentProtein, setCurrentProtein] = useState<ProteinStructure | undefined>();
  const [showcaseViewer, setShowcaseViewer] = useState<'ngl' | 'threejs'>('ngl');

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleProteinLoad = useCallback((protein: ProteinStructure) => {
    setCurrentProtein(protein);
  }, []);

  const getFeatureCards = () => {
    const features = [
      {
        title: '🎭 Dual Viewer System',
        description: 'Switch between NGL Viewer (advanced) and Three.js (lightweight)',
        icon: <ViewInAr />,
        benefits: ['Fallback support', 'Performance optimization', 'Best of both worlds']
      },
      {
        title: '🌈 Advanced Representations',
        description: 'Multiple visualization modes for different analysis needs',
        icon: <Visibility />,
        benefits: ['Cartoon (structure)', 'Surface (binding sites)', 'Ball-stick (atomic detail)', 'Spacefill (volume)']
      },
      {
        title: '🎨 Smart Color Schemes',
        description: 'Intelligent coloring based on chemical and structural properties',
        icon: <AutoAwesome />,
        benefits: ['CPK elements', 'Hydrophobicity', 'Secondary structure', 'Chain identification']
      },
      {
        title: '⚡ Auto-Focus & Controls',
        description: 'Smooth auto-centering with professional-grade controls',
        icon: <Speed />,
        benefits: ['Smooth transitions', 'Smart framing', 'Interactive controls', 'Reset functionality']
      },
      {
        title: '🧠 Smart Defaults',
        description: 'Automatically applies optimal settings based on protein type',
        icon: <Psychology />,
        benefits: ['Representation suggestions', 'Color scheme matching', 'Viewer selection', 'Quality optimization']
      },
      {
        title: '📚 Educational Samples',
        description: 'Curated protein collection from beginner to advanced',
        icon: <School />,
        benefits: ['Difficulty levels', 'Educational descriptions', 'Feature highlights', 'Learning progression']
      }
    ];

    return features.map((feature, index) => (
      <Grid item xs={12} md={6} lg={4} key={index}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {feature.icon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {feature.title}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              {feature.description}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {feature.benefits.map((benefit, idx) => (
                <Chip 
                  key={idx} 
                  label={benefit} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ));
  };

  const getSamplesByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
    return Object.entries(SAMPLE_PROTEINS)
      .filter(([_, info]) => info.difficulty === difficulty)
      .map(([pdbId, info]) => ({ pdbId, ...info }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🧬 Protein Viewer Showcase
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Explore our comprehensive protein visualization platform with dual viewers,
          smart representations, and educational samples
        </Typography>
        <Alert severity="info" sx={{ mt: 2, maxWidth: 800, mx: 'auto' }}>
          <strong>Interactive Demo:</strong> Use the tabs below to explore features, 
          try different viewers, and load sample proteins to see the system in action!
        </Alert>
      </Box>

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab icon={<AutoAwesome />} label="Features Overview" />
          <Tab icon={<Science />} label="Live Demo" />
          <Tab icon={<School />} label="Educational Samples" />
          <Tab icon={<Memory />} label="Technical Details" />
        </Tabs>
      </Box>

      {/* Features Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h4" gutterBottom align="center">
          🚀 Platform Features
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {getFeatureCards()}
        </Grid>
      </TabPanel>

      {/* Live Demo Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h4" gutterBottom align="center">
          🎮 Interactive Demo
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <ProteinViewer
                width={700}
                height={500}
                showAdvancedControls={true}
                defaultViewerType={showcaseViewer}
                onProteinLoad={handleProteinLoad}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom>
                🎛️ Demo Controls
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><PlayArrow /></ListItemIcon>
                  <ListItemText 
                    primary="Load Sample Proteins" 
                    secondary="Try different protein types and observe auto-optimization"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ViewInAr /></ListItemIcon>
                  <ListItemText 
                    primary="Switch Viewers" 
                    secondary="Compare NGL and Three.js performance and features"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><AutoAwesome /></ListItemIcon>
                  <ListItemText 
                    primary="Try Representations" 
                    secondary="Experiment with cartoon, surface, and ball-stick modes"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Speed /></ListItemIcon>
                  <ListItemText 
                    primary="Test Auto-Focus" 
                    secondary="Notice smooth auto-centering when changing representations"
                  />
                </ListItem>
              </List>
              
              {currentProtein && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success">
                    <strong>Loaded:</strong> {currentProtein.name}<br/>
                    <small>{currentProtein.atoms.length} atoms • {currentProtein.residues.length} residues</small>
                  </Alert>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Educational Samples Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h4" gutterBottom align="center">
          📚 Educational Sample Collection
        </Typography>
        
        {/* Beginner Samples */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ color: 'success.main' }}>
              🟢 Beginner Level - Small & Clear Structure
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {getSamplesByDifficulty('beginner').map((sample) => (
                <Grid item xs={12} sm={6} md={3} key={sample.pdbId}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {sample.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {sample.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        <Chip label={sample.pdbId} size="small" color="primary" />
                        <Chip label={`${sample.residueCount} residues`} size="small" />
                        <Chip label={sample.category} size="small" variant="outlined" />
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        {sample.features.slice(0, 2).map((feature, idx) => (
                          <Chip 
                            key={idx} 
                            label={feature} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Intermediate Samples */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ color: 'warning.main' }}>
              🟡 Intermediate Level - Multi-chain & Complex
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {getSamplesByDifficulty('intermediate').map((sample) => (
                <Grid item xs={12} sm={6} md={3} key={sample.pdbId}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {sample.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {sample.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        <Chip label={sample.pdbId} size="small" color="primary" />
                        <Chip label={`${sample.residueCount} residues`} size="small" />
                        <Chip label={sample.category} size="small" variant="outlined" />
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        {sample.features.slice(0, 2).map((feature, idx) => (
                          <Chip 
                            key={idx} 
                            label={feature} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Advanced Samples */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ color: 'error.main' }}>
              🔴 Advanced Level - Large & Specialized
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {getSamplesByDifficulty('advanced').map((sample) => (
                <Grid item xs={12} sm={6} md={3} key={sample.pdbId}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {sample.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {sample.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        <Chip label={sample.pdbId} size="small" color="primary" />
                        <Chip label={`${sample.residueCount} residues`} size="small" />
                        <Chip label={sample.category} size="small" variant="outlined" />
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        {sample.features.slice(0, 2).map((feature, idx) => (
                          <Chip 
                            key={idx} 
                            label={feature} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </TabPanel>

      {/* Technical Details Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h4" gutterBottom align="center">
          ⚙️ Technical Implementation
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🎭 Hybrid Viewer Architecture
              </Typography>
              <Typography variant="body2" paragraph>
                Our system intelligently switches between NGL Viewer and Three.js based on use case:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="NGL Viewer" 
                    secondary="Advanced features, large proteins, specialized representations"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Three.js" 
                    secondary="Lightweight, fast rendering, educational use cases"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Auto-Selection" 
                    secondary="System chooses optimal viewer based on protein complexity"
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🌈 Representation Types
              </Typography>
              <Typography variant="body2" paragraph>
                Essential visualization modes for different analysis needs:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Cartoon" 
                    secondary="Best for overall structure understanding and secondary structure"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Surface" 
                    secondary="Best for cavities, binding sites, and protein-protein interfaces"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Ball & Stick" 
                    secondary="Best for atomic detail, active sites, and bond visualization"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Spacefill" 
                    secondary="Best for molecular volume and steric interactions"
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🎨 Smart Color Schemes
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>CPK (Elements)</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Carbon=gray, Nitrogen=blue, Oxygen=red, Sulfur=yellow
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Hydrophobicity</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Hydrophobic=yellow/orange, Hydrophilic=blue/cyan
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Secondary Structure</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Helix=red, Sheet=yellow, Coil=gray
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Chain ID</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Different colors for each protein chain
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default ShowcasePage;
