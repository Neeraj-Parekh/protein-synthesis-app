import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { User, LoginRequest, RegisterRequest } from '../../types/auth'
import { authAPI } from '../../services/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  isInitialized: boolean
  sessionExpiry: number | null
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isInitialized: false,
  sessionExpiry: null,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials)
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Login failed'
      return rejectWithValue(message)
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData)
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Registration failed'
      return rejectWithValue(message)
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState }
    if (state.auth.token) {
      await authAPI.logout()
    }
  }
)

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    const response = await authAPI.getCurrentUser()
    return response.data
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: Partial<User>) => {
    const response = await authAPI.updateProfile(userData)
    return response.data
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData: { currentPassword: string; newPassword: string }) => {
    await authAPI.changePassword({
      current_password: passwordData.currentPassword,
      new_password: passwordData.newPassword
    })
  }
)

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string) => {
    await authAPI.forgotPassword({ email })
  }
)

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data: { token: string; newPassword: string }) => {
    await authAPI.resetPassword({
      token: data.token,
      new_password: data.newPassword
    })
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setInitialized: (state) => {
      state.isInitialized = true
    },
    initializeAuth: (state) => {
      const token = localStorage.getItem('auth_token')
      const user = localStorage.getItem('auth_user')
      const sessionExpiry = localStorage.getItem('session_expiry')

      if (token && user && sessionExpiry) {
        const expiryTime = parseInt(sessionExpiry)
        const currentTime = Date.now()
        
        if (currentTime < expiryTime) {
          // Session is still valid
          state.token = token
          state.user = JSON.parse(user)
          state.isAuthenticated = true
          state.sessionExpiry = expiryTime
        } else {
          // Session expired, clear data
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          localStorage.removeItem('session_expiry')
        }
      }
      state.isInitialized = true
    },
    checkSessionExpiry: (state) => {
      if (state.sessionExpiry && Date.now() >= state.sessionExpiry) {
        // Session expired
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.sessionExpiry = null
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('session_expiry')
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.access_token
        state.isAuthenticated = true
        state.error = null

        // Set session expiry to 2 hours from now
        const expiryTime = Date.now() + (2 * 60 * 60 * 1000) // 2 hours
        state.sessionExpiry = expiryTime

        // Store in localStorage
        localStorage.setItem('auth_token', action.payload.access_token)
        localStorage.setItem('auth_user', JSON.stringify(action.payload.user))
        localStorage.setItem('session_expiry', expiryTime.toString())
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string || action.error.message || 'Login failed'
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string || action.error.message || 'Registration failed'
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = null
        state.sessionExpiry = null

        // Clear localStorage
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('session_expiry')
      })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(getCurrentUser.rejected, (state) => {
        // Token might be invalid, clear auth state
        state.user = null
        state.token = null
        state.isAuthenticated = false
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload
        localStorage.setItem('auth_user', JSON.stringify(action.payload))
      })
  },
})

export const { clearError, setInitialized, initializeAuth, checkSessionExpiry } = authSlice.actions
export default authSlice.reducer
