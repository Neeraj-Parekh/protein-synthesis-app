import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tab,
  Tabs,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';
import { User, UserRole, UserStatus } from '../types/auth';

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Mock data for demonstration
  const mockUsers: User[] = [
    {
      id: 1,
      email: 'admin@example.com',
      username: 'admin',
      full_name: 'System Administrator',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      is_verified: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-08-30T00:00:00Z',
      last_login: '2024-08-30T10:00:00Z'
    },
    {
      id: 2,
      email: 'researcher@example.com',
      username: 'researcher1',
      full_name: 'Dr. Jane Smith',
      role: UserRole.RESEARCHER,
      status: UserStatus.ACTIVE,
      is_verified: true,
      created_at: '2024-02-15T00:00:00Z',
      updated_at: '2024-08-29T00:00:00Z',
      last_login: '2024-08-29T15:30:00Z'
    },
    {
      id: 3,
      email: 'student@example.com',
      username: 'student1',
      full_name: 'John Doe',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      is_verified: false,
      created_at: '2024-08-20T00:00:00Z',
      updated_at: '2024-08-25T00:00:00Z'
    }
  ];

  const mockSystemStats = {
    totalUsers: 156,
    activeUsers: 142,
    newThisMonth: 23,
    totalProteins: 1247,
    analysesRun: 3456,
    aiGenerations: 789
  };

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== UserRole.ADMIN) {
      setError('Access denied. Admin privileges required.');
      return;
    }

    // Simulate API call to fetch users
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUsers(prev => 
        prev.map(u => 
          u.id === selectedUser.id ? selectedUser : u
        )
      );
      
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      setError('Failed to update user');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      setError('Failed to delete user');
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

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE: return 'success';
      case UserStatus.INACTIVE: return 'default';
      case UserStatus.SUSPENDED: return 'error';
      case UserStatus.PENDING: return 'warning';
      default: return 'default';
    }
  };

  if (user?.role !== UserRole.ADMIN) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Administrator privileges required to view this page.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<AnalyticsIcon />} label="Overview" />
          <Tab icon={<PeopleIcon />} label="User Management" />
          <Tab icon={<SecurityIcon />} label="Security" />
          <Tab icon={<SettingsIcon />} label="Settings" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Total Users
                    </Typography>
                    <Typography variant="h4">
                      {mockSystemStats.totalUsers}
                    </Typography>
                  </Box>
                  <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Active Users
                    </Typography>
                    <Typography variant="h4">
                      {mockSystemStats.activeUsers}
                    </Typography>
                  </Box>
                  <Badge badgeContent="+" color="success">
                    <PeopleIcon color="success" sx={{ fontSize: 40 }} />
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      New This Month
                    </Typography>
                    <Typography variant="h4">
                      {mockSystemStats.newThisMonth}
                    </Typography>
                  </Box>
                  <AddIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Total Proteins
                    </Typography>
                    <Typography variant="h4">
                      {mockSystemStats.totalProteins}
                    </Typography>
                  </Box>
                  <AnalyticsIcon color="secondary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Activity
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="primary">
                        {mockSystemStats.analysesRun}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Analyses Run
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="secondary">
                        {mockSystemStats.aiGenerations}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        AI Generations
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="success.main">
                        99.2%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        System Uptime
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* User Management Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                User Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {/* Handle add user */}}
              >
                Add User
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Verified</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {user.full_name || user.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          color={getStatusColor(user.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_verified ? 'Yes' : 'No'}
                          color={user.is_verified ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.role === UserRole.ADMIN}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Alert severity="info">
              Security settings and audit logs will be available in a future update.
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Settings Tab */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Settings
            </Typography>
            <Alert severity="info">
              System configuration settings will be available in a future update.
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={selectedUser.full_name || ''}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    full_name: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={selectedUser.role}
                    label="Role"
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      role: e.target.value as UserRole
                    })}
                  >
                    <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
                    <MenuItem value={UserRole.RESEARCHER}>Researcher</MenuItem>
                    <MenuItem value={UserRole.STUDENT}>Student</MenuItem>
                    <MenuItem value={UserRole.GUEST}>Guest</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedUser.status}
                    label="Status"
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      status: e.target.value as UserStatus
                    })}
                  >
                    <MenuItem value={UserStatus.ACTIVE}>Active</MenuItem>
                    <MenuItem value={UserStatus.INACTIVE}>Inactive</MenuItem>
                    <MenuItem value={UserStatus.SUSPENDED}>Suspended</MenuItem>
                    <MenuItem value={UserStatus.PENDING}>Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateUser} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.username}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
