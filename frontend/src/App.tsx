import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Container, AppBar, Toolbar, Typography, Box, Button, CircularProgress } from '@mui/material'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { initializeAuth, logout, checkSessionExpiry } from './store/slices/authSlice'

import HomePage from './pages/HomePage'
import VisualizationPage from './pages/VisualizationPage'
import ModernVisualizationPage from './pages/ModernVisualizationPage'
import AnalysisPage from './pages/AnalysisPage'
import AIGenerationPage from './pages/AIGenerationPage'
import ComparisonPage from './pages/ComparisonPage'
import ShowcasePage from './pages/ShowcasePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboard from './pages/AdminDashboard'
import Navigation from './components/Navigation/Navigation'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import ModelManager from './components/AI/ModelManager'
import EnhancedAIGenerator from './components/AI/EnhancedAIGenerator'

function App() {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, isInitialized } = useAppSelector(state => state.auth)

  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  useEffect(() => {
    // Check session expiry every minute
    const interval = setInterval(() => {
      dispatch(checkSessionExpiry())
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout())
  }

  // Show loading while initializing auth
  if (!isInitialized) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Protein Synthesis App...
        </Typography>
      </Box>
    )
  }

  // If not authenticated, show only login/register pages
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <AppBar position="static" elevation={0}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                🧬 Protein Synthesis App
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Container maxWidth="md" sx={{ mt: 4 }}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Container>
        </Box>
      </ErrorBoundary>
    )
  }

  // Authenticated user interface
  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              🧬 Protein Synthesis Web Application
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                Welcome, {user?.username || user?.email}
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <Navigation />
          
          <Container 
            maxWidth={false} 
            sx={{ 
              flexGrow: 1, 
              padding: 2, 
              height: 'calc(100vh - 64px)',
              overflow: 'auto'
            }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/visualization" element={<VisualizationPage />} />
              <Route path="/modern-visualization" element={<ModernVisualizationPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/ai-generation" element={<AIGenerationPage />} />
              <Route path="/enhanced-ai" element={<EnhancedAIGenerator />} />
              <Route path="/model-manager" element={<ModelManager />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="/showcase" element={<ShowcasePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </ErrorBoundary>
  )
}

export default App