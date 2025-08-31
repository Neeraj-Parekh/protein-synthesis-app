import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout, checkSessionExpiry } from '@/store/slices/authSlice';

const SessionManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, sessionExpiry, isAuthenticated } = useAppSelector(state => state.auth);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showExpiryDialog, setShowExpiryDialog] = useState<boolean>(false);

  // Calculate time remaining in session
  useEffect(() => {
    const updateTimeRemaining = () => {
      if (sessionExpiry) {
        const remaining = Math.max(0, sessionExpiry - Date.now());
        setTimeRemaining(remaining);
        
        // Show warning dialog when 5 minutes remaining
        if (remaining <= 5 * 60 * 1000 && remaining > 0) {
          setShowExpiryDialog(true);
        }
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000); // Update every second

    return () => clearInterval(interval);
  }, [sessionExpiry]);

  // Auto-check session expiry
  useEffect(() => {
    const checkInterval = setInterval(() => {
      dispatch(checkSessionExpiry());
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [dispatch]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getProgressValue = (): number => {
    if (!sessionExpiry) return 0;
    const totalDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    return Math.max(0, (timeRemaining / totalDuration) * 100);
  };

  const getStatusColor = (): 'success' | 'warning' | 'error' => {
    const progressValue = getProgressValue();
    if (progressValue > 50) return 'success';
    if (progressValue > 20) return 'warning';
    return 'error';
  };

  const handleExtendSession = () => {
    // In a real app, this would call an API to extend the session
    // For now, we'll just close the dialog
    setShowExpiryDialog(false);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          🕒 Session Management
        </Typography>

        <Grid container spacing={3}>
          {/* Session Status Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Current Session
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>User:</strong> {user?.username || user?.email}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Session Duration:</strong> 2 hours
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Time Remaining:</strong> {formatTime(timeRemaining)}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Session Progress
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressValue()}
                    color={getStatusColor()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={timeRemaining > 0 ? 'Active' : 'Expired'}
                    color={timeRemaining > 0 ? 'success' : 'error'}
                    variant="filled"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Session Details Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Session Details
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Started:</strong>{' '}
                  {sessionExpiry 
                    ? new Date(sessionExpiry - 2 * 60 * 60 * 1000).toLocaleString()
                    : 'Unknown'
                  }
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Expires:</strong>{' '}
                  {sessionExpiry 
                    ? new Date(sessionExpiry).toLocaleString()
                    : 'Unknown'
                  }
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Auto-logout:</strong> When session expires
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Session Storage:</strong> Browser localStorage
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleLogout}
                    fullWidth
                  >
                    Logout Now
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Security Features */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🔒 Security Features
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Alert severity="success" variant="outlined">
                    <Typography variant="subtitle2">2-Hour Session</Typography>
                    <Typography variant="body2">
                      Automatic logout after 2 hours for security
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Alert severity="info" variant="outlined">
                    <Typography variant="subtitle2">Local Storage</Typography>
                    <Typography variant="body2">
                      Session data stored securely in browser
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Alert severity="warning" variant="outlined">
                    <Typography variant="subtitle2">Auto-Check</Typography>
                    <Typography variant="body2">
                      Session validity checked every minute
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Alert severity="error" variant="outlined">
                    <Typography variant="subtitle2">Instant Logout</Typography>
                    <Typography variant="body2">
                      Immediate logout when session expires
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Session Expiry Warning Dialog */}
      <Dialog open={showExpiryDialog} onClose={() => setShowExpiryDialog(false)}>
        <DialogTitle>⚠️ Session Expiring Soon</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Your session will expire in less than 5 minutes.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Time remaining: {formatTime(timeRemaining)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExtendSession} color="primary">
            Extend Session
          </Button>
          <Button onClick={handleLogout} color="error">
            Logout Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SessionManager;
