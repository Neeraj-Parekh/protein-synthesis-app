import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RenderOptions } from '../../types/protein'

interface UIState {
  sidebarOpen: boolean
  currentView: 'visualization' | 'analysis' | 'ai-generation' | 'comparison'
  renderOptions: RenderOptions
  notifications: Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    timestamp: number
  }>
}

const initialState: UIState = {
  sidebarOpen: true,
  currentView: 'visualization',
  renderOptions: {
    colorScheme: 'cpk',
    representation: 'cartoon',
    levelOfDetail: true,
    quality: 'medium',
  },
  notifications: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setCurrentView: (state, action: PayloadAction<UIState['currentView']>) => {
      state.currentView = action.payload
    },
    updateRenderOptions: (state, action: PayloadAction<Partial<RenderOptions>>) => {
      state.renderOptions = { ...state.renderOptions, ...action.payload }
    },
    addNotification: (state, action: PayloadAction<Omit<UIState['notifications'][0], 'id' | 'timestamp'>>) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      }
      state.notifications.push(notification)
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
  },
})

export const {
  toggleSidebar,
  setCurrentView,
  updateRenderOptions,
  addNotification,
  removeNotification,
  clearNotifications,
} = uiSlice.actions

export default uiSlice.reducer