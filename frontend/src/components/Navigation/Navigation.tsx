import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
} from '@mui/material'
import {
  Home as HomeIcon,
  ThreeDRotation as VisualizationIcon,
  Analytics as AnalysisIcon,
  Psychology as AIIcon,
  Compare as CompareIcon,
  AutoAwesome as ShowcaseIcon,
  Person as ProfileIcon,
  AdminPanelSettings as AdminIcon,
  Storage as StorageIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material'
import { useAppSelector } from '../../store/hooks'
import { UserRole } from '../../types/auth'

const drawerWidth = 240

const Navigation: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppSelector(state => state.auth)

  const navigationItems = [
    { path: '/', label: 'Home', icon: <HomeIcon /> },
    { path: '/showcase', label: 'Feature Showcase', icon: <ShowcaseIcon /> },
    { path: '/visualization', label: '3D Visualization', icon: <VisualizationIcon /> },
    { path: '/analysis', label: 'Chemical Analysis', icon: <AnalysisIcon /> },
    { path: '/ai-generation', label: 'AI Generation', icon: <AIIcon /> },
    { path: '/enhanced-ai', label: 'Enhanced AI', icon: <ComputerIcon /> },
    { path: '/model-manager', label: 'Model Manager', icon: <StorageIcon /> },
    { path: '/comparison', label: 'Comparison', icon: <CompareIcon /> },
  ]

  const userItems = [
    { path: '/profile', label: 'Profile', icon: <ProfileIcon /> },
  ]

  const adminItems = user?.role === UserRole.ADMIN 
    ? [{ path: '/admin', label: 'Admin Dashboard', icon: <AdminIcon /> }]
    : []

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 1 }}>
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        <Divider />
        
        <List>
          {userItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
          
          {adminItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  )
}

export default Navigation