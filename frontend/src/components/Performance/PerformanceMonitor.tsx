/**
 * Performance Monitor Component
 * Displays real-time performance metrics and memory usage
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  IconButton,
  Collapse,
  Alert
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { memoryManager } from '../../utils/memoryManager';

interface PerformanceMetrics {
  memoryUsage: number;
  memoryLimit: number;
  fps: number;
  renderTime: number;
  cacheSize: number;
  isMemoryPressure: boolean;
}

interface PerformanceMonitorProps {
  visible?: boolean;
  onMemoryPressure?: () => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  visible = false,
  onMemoryPressure
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    memoryLimit: 0,
    fps: 0,
    renderTime: 0,
    cacheSize: 0,
    isMemoryPressure: false
  });
  const [expanded, setExpanded] = useState(false);
  const [lastFrameTime, setLastFrameTime] = useState(performance.now());
  const [frameCount, setFrameCount] = useState(0);

  // FPS calculation
  const calculateFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTime;
    
    if (delta >= 1000) { // Update every second
      const fps = Math.round((frameCount * 1000) / delta);
      setMetrics(prev => ({ ...prev, fps }));
      setFrameCount(0);
      setLastFrameTime(now);
    } else {
      setFrameCount(prev => prev + 1);
    }
    
    requestAnimationFrame(calculateFPS);
  }, [lastFrameTime, frameCount]);

  // Update performance metrics
  const updateMetrics = useCallback(() => {
    const memoryStats = memoryManager.getMemoryStats();
    const isMemoryPressure = memoryManager.isMemoryPressure();
    
    if (memoryStats) {
      const memoryUsage = memoryStats.usedJSHeapSize / (1024 * 1024); // MB
      const memoryLimit = memoryStats.jsHeapSizeLimit / (1024 * 1024); // MB
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage,
        memoryLimit,
        isMemoryPressure
      }));
      
      // Trigger memory pressure callback
      if (isMemoryPressure && onMemoryPressure) {
        onMemoryPressure();
      }
    }
  }, [onMemoryPressure]);

  // Performance observer for render timing
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const renderEntries = entries.filter(entry => 
          entry.entryType === 'measure' && entry.name.includes('render')
        );
        
        if (renderEntries.length > 0) {
          const avgRenderTime = renderEntries.reduce((sum, entry) => 
            sum + entry.duration, 0) / renderEntries.length;
          
          setMetrics(prev => ({ ...prev, renderTime: avgRenderTime }));
        }
      });
      
      try {
        observer.observe({ entryTypes: ['measure'] });
      } catch (e) {
        console.warn('Performance observer not supported');
      }
      
      return () => observer.disconnect();
    }
  }, []);

  // Start FPS calculation and metric updates
  useEffect(() => {
    const fpsAnimation = requestAnimationFrame(calculateFPS);
    const metricsInterval = setInterval(updateMetrics, 2000);
    
    return () => {
      cancelAnimationFrame(fpsAnimation);
      clearInterval(metricsInterval);
    };
  }, [calculateFPS, updateMetrics]);

  const formatBytes = (bytes: number): string => {
    return `${bytes.toFixed(1)} MB`;
  };

  const getMemoryUsageColor = (usage: number, limit: number): string => {
    const ratio = usage / limit;
    if (ratio > 0.8) return 'error';
    if (ratio > 0.6) return 'warning';
    return 'success';
  };

  const getFPSColor = (fps: number): string => {
    if (fps >= 50) return 'success';
    if (fps >= 30) return 'warning';
    return 'error';
  };

  if (!visible) return null;

  return (
    <Card 
      sx={{ 
        position: 'fixed',
        top: 16,
        right: 16,
        minWidth: 300,
        zIndex: 1300,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <SpeedIcon sx={{ mr: 1 }} />
            Performance
          </Typography>
          <IconButton
            onClick={() => setExpanded(!expanded)}
            sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        {/* Memory Pressure Alert */}
        {metrics.isMemoryPressure && (
          <Alert 
            severity="warning" 
            sx={{ mt: 1, mb: 1 }}
            icon={<WarningIcon />}
          >
            High memory usage detected
          </Alert>
        )}

        {/* Basic Metrics */}
        <Grid container spacing={1} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <Chip
              icon={<MemoryIcon />}
              label={`${formatBytes(metrics.memoryUsage)} / ${formatBytes(metrics.memoryLimit)}`}
              color={getMemoryUsageColor(metrics.memoryUsage, metrics.memoryLimit) as any}
              size="small"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={6}>
            <Chip
              icon={<SpeedIcon />}
              label={`${metrics.fps} FPS`}
              color={getFPSColor(metrics.fps) as any}
              size="small"
              variant="outlined"
            />
          </Grid>
        </Grid>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            {/* Memory Usage Bar */}
            <Typography variant="body2" gutterBottom>
              Memory Usage
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(metrics.memoryUsage / metrics.memoryLimit) * 100}
              color={getMemoryUsageColor(metrics.memoryUsage, metrics.memoryLimit) as any}
              sx={{ mb: 2 }}
            />

            {/* Detailed Metrics */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Render Time: {metrics.renderTime.toFixed(2)}ms
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Cache Size: {formatBytes(metrics.cacheSize)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Memory Pressure: {metrics.isMemoryPressure ? 'Yes' : 'No'}
                </Typography>
              </Grid>
            </Grid>

            {/* Performance Tips */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Performance Tips:
              </Typography>
              <Typography variant="caption" display="block">
                • Reduce protein complexity for better performance
              </Typography>
              <Typography variant="caption" display="block">
                • Enable level-of-detail rendering
              </Typography>
              <Typography variant="caption" display="block">
                • Clear cache if memory usage is high
              </Typography>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;