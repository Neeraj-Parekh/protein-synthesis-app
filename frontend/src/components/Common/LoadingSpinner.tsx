import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  LinearProgress
} from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  progress?: number;
  size?: number;
  variant?: 'circular' | 'linear';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  progress,
  size = 40,
  variant = 'circular',
  fullScreen = false
}) => {
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      p={3}
    >
      {variant === 'circular' ? (
        <CircularProgress
          size={size}
          variant={progress !== undefined ? 'determinate' : 'indeterminate'}
          value={progress}
        />
      ) : (
        <Box sx={{ width: '100%', maxWidth: 300 }}>
          <LinearProgress
            variant={progress !== undefined ? 'determinate' : 'indeterminate'}
            value={progress}
          />
        </Box>
      )}
      
      <Typography variant="body1" color="text.secondary" textAlign="center">
        {message}
      </Typography>
      
      {progress !== undefined && (
        <Typography variant="body2" color="text.secondary">
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="rgba(255, 255, 255, 0.8)"
        zIndex={9999}
      >
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner;