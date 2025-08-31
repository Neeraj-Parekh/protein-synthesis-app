import '@testing-library/jest-dom';

// Mock NGL viewer for tests
jest.mock('ngl', () => ({
  Stage: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn().mockResolvedValue({}),
    setParameters: jest.fn(),
    dispose: jest.fn(),
  })),
  autoLoad: jest.fn(),
}));

// Mock Three.js for tests
jest.mock('three', () => ({
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
  })),
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(),
  Vector3: jest.fn(),
}));

// Setup global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});