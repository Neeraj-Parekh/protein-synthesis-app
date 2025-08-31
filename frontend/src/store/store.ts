import { configureStore } from '@reduxjs/toolkit'
import proteinReducer from './slices/proteinSlice'
import analysisReducer from './slices/analysisSlice'
import aiReducer from './slices/aiSlice'
import uiReducer from './slices/uiSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    proteins: proteinReducer,
    analysis: analysisReducer,
    ai: aiReducer,
    ui: uiReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['proteins/setCurrentStructure'],
        ignoredPaths: [
          'proteins.currentStructure',
          'proteins.proteins.dummy-protein-1.createdAt',
          'proteins.proteins.dummy-protein-1.updatedAt'
        ],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export auth state type for use in components
export type AuthState = {
  user: any
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  isInitialized: boolean
}