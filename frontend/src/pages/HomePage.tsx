import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Paper,
  Tabs,
  Tab,
  Alert,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  ThreeDRotation as VisualizationIcon,
  Analytics as AnalysisIcon,
  Psychology as AIIcon,
  Compare as CompareIcon,
  AutoAwesome as ShowcaseIcon,
  ViewInAr,
} from '@mui/icons-material'
import ProteinViewer from '../components/Visualization/ProteinViewer'
import RealAIAnalysis from '../components/AI/RealAIAnalysis'
import FileUpload from '../components/Upload/FileUpload'
import { ProteinStructure } from '../types'

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

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)
  const [currentProtein, setCurrentProtein] = useState<ProteinStructure | undefined>()
  const [error, setError] = useState<string | null>(null)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleProteinLoad = (protein: ProteinStructure) => {
    setCurrentProtein(protein)
    setError(null)
    // Switch to visualization tab when protein is loaded
    setTabValue(1)
  }

  const handleError = (error: Error) => {
    setError(error.message)
  }

  const features = [
    {
      title: 'Feature Showcase',
      description: '🌟 Explore all visualization features with educational samples and dual viewer demo',
      icon: <ShowcaseIcon sx={{ fontSize: 48 }} />,
      path: '/showcase',
      color: '#e91e63',
    },
    {
      title: '3D Protein Visualization',
      description: 'Interactive 3D visualization of protein structures with multiple representation modes',
      icon: <VisualizationIcon sx={{ fontSize: 48 }} />,
      path: '/visualization',
      color: '#1976d2',
    },
    {
      title: 'Chemical Analysis',
      description: 'Comprehensive analysis of protein sequences and chemical properties',
      icon: <AnalysisIcon sx={{ fontSize: 48 }} />,
      path: '/analysis',
      color: '#388e3c',
    },
    {
      title: 'AI-Powered Generation',
      description: 'Generate and optimize protein sequences using lightweight AI models',
      icon: <AIIcon sx={{ fontSize: 48 }} />,
      path: '/ai-generation',
      color: '#f57c00',
    },
    {
      title: 'Protein Comparison',
      description: 'Compare multiple proteins for sequence and structural similarities',
      icon: <CompareIcon sx={{ fontSize: 48 }} />,
      path: '/comparison',
      color: '#7b1fa2',
    },
  ]

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🧬 Protein Synthesis Web Application
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          A comprehensive platform for protein visualization, analysis, and AI-powered design
        </Typography>
        <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
          <strong>🎉 New Features Available!</strong> Dual viewer system with smart auto-focus, 
          12 educational sample proteins, and advanced representation controls
        </Alert>
        <Button 
          variant="contained" 
          size="large" 
          color="secondary"
          startIcon={<ShowcaseIcon />}
          onClick={() => navigate('/showcase')}
          sx={{ mt: 1 }}
        >
          Explore Feature Showcase
        </Button>
      </Paper>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="protein analysis tabs">
          <Tab 
            label="Overview" 
            icon={<VisualizationIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Upload & Load" 
            icon={<ViewInAr />} 
            iconPosition="start"
          />
          <Tab 
            label="3D Visualization" 
            icon={<ViewInAr />} 
            iconPosition="start"
          />
          <Tab 
            label="AI Analysis" 
            icon={<AIIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid item xs={12} md={6} key={feature.title}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => {
                  if (feature.title === '3D Protein Visualization') {
                    setTabValue(1)
                  } else {
                    navigate(feature.path)
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                  <Box sx={{ color: feature.color, mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {feature.description}
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ mt: 2, backgroundColor: feature.color }}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      if (feature.title === '3D Protein Visualization') {
                        setTabValue(1)
                      } else {
                        navigate(feature.path)
                      }
                    }}
                  >
                    {feature.title === 'Feature Showcase' ? '🌟 Explore Now' : 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            System Requirements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This application is optimized for standard hardware (16GB RAM, multi-core processors)
            and runs efficiently in modern web browsers with WebGL support. The lightweight AI models
            are designed for CPU-based inference without requiring specialized hardware.
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Upload Protein Files
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload PDB, CIF, MOL2, or SDF files, or fetch structures directly from protein databases.
          </Typography>
          <FileUpload
            onUploadComplete={(proteinId) => {
              console.log('Protein uploaded:', proteinId);
              // You could automatically switch to visualization tab here
              setTabValue(2);
            }}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 0, overflow: 'hidden' }}>
          <ProteinViewer
            protein={currentProtein}
            onProteinLoad={handleProteinLoad}
            onError={handleError}
            width={1200}
            height={700}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <RealAIAnalysis />
      </TabPanel>
    </Box>
  )
}

export default HomePage