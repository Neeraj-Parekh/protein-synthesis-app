import * as React from 'react';
import { useState, useEffect } from 'react';
import SessionManager from '../components/Session/SessionManager';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateProfile, changePassword } from '../store/slices/authSlice';
import { UserRole } from '../types/auth';

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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector(state => state.auth);
  
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    username: user?.username || '',
    full_name: user?.full_name || '',
    role: user?.role || UserRole.RESEARCHER
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email,
        username: user.username,
        full_name: user.full_name || '',
        role: user.role
      });
    }
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfileUpdate = async () => {
    try {
      await dispatch(updateProfile(profileData)).unwrap();
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    try {
      await dispatch(changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })).unwrap();
      
      setPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordError('');
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      setPasswordError('Failed to change password. Please check your current password.');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'error';
      case UserRole.RESEARCHER: return 'primary';
      case UserRole.STUDENT: return 'secondary';
      case UserRole.GUEST: return 'default';
      default: return 'default';
    }
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>

      {updateSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {/* Profile Header */}
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar
              sx={{ 
                width: 80, 
                height: 80, 
                mr: 3,
                bgcolor: 'primary.main',
                fontSize: 32
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h5">
                {user.full_name || user.username}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {user.email}
              </Typography>
              <Box mt={1}>
                <Chip 
                  label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  color={getRoleColor(user.role)}
                  size="small"
                />
                <Chip 
                  label={user.is_verified ? 'Verified' : 'Unverified'}
                  color={user.is_verified ? 'success' : 'warning'}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab icon={<PersonIcon />} label="Profile" />
              <Tab icon={<SecurityIcon />} label="Security" />
              <Tab icon={<SettingsIcon />} label="Preferences" />
              <Tab icon={<HistoryIcon />} label="Activity" />
              <Tab icon={<AccessTimeIcon />} label="Session" />
            </Tabs>
          </Box>

          {/* Profile Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={profileData.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  type="email"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={profileData.username}
                  onChange={(e) => handleProfileChange('username', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={profileData.full_name}
                  onChange={(e) => handleProfileChange('full_name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={profileData.role}
                    label="Role"
                    disabled={user.role !== UserRole.ADMIN}
                    onChange={(e) => handleProfileChange('role', e.target.value)}
                  >
                    <MenuItem value={UserRole.RESEARCHER}>Researcher</MenuItem>
                    <MenuItem value={UserRole.STUDENT}>Student</MenuItem>
                    <MenuItem value={UserRole.GUEST}>Guest</MenuItem>
                    {user.role === UserRole.ADMIN && (
                      <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    onClick={handleProfileUpdate}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setProfileData({
                        email: user.email,
                        username: user.username,
                        full_name: user.full_name || '',
                        role: user.role
                      });
                    }}
                  >
                    Reset
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Password Security
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Keep your account secure by using a strong password and changing it regularly.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  Change Password
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Divider />
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Account Information
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Account Created
                      </Typography>
                      <Typography variant="body1">
                        {new Date(user.created_at).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Last Login
                      </Typography>
                      <Typography variant="body1">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Account Status
                      </Typography>
                      <Chip 
                        label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        color={user.status === 'active' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Email Verification
                      </Typography>
                      <Chip 
                        label={user.is_verified ? 'Verified' : 'Pending'}
                        color={user.is_verified ? 'success' : 'warning'}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Preferences Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Application Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Customize your application experience (Coming Soon)
            </Typography>
            <Alert severity="info">
              User preferences and settings will be available in a future update.
            </Alert>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              View your recent actions and analysis history (Coming Soon)
            </Typography>
            <Alert severity="info">
              Activity tracking and history will be available in a future update.
            </Alert>
          </TabPanel>

          {/* Session Management Tab */}
          <TabPanel value={tabValue} index={4}>
            <SessionManager />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            margin="normal"
            helperText="Minimum 8 characters"
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialogOpen(false);
            setPasswordError('');
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handlePasswordChange}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
