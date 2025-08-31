## BUILD SYSTEM AND DEPLOYMENT

### Vite Configuration and Optimization

#### 1. Advanced Vite Configuration
```typescript
// vite.config.ts - Production-optimized build configuration
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // JSX runtime optimization
      jsxRuntime: 'automatic',
      // Babel plugins for optimization
      babel: {
        plugins: [
          // Remove console.log in production
          process.env.NODE_ENV === 'production' && 'babel-plugin-transform-remove-console',
          // Optimize imports
          ['babel-plugin-import', {
            libraryName: '@mui/material',
            libraryDirectory: '',
            camel2DashComponentName: false,
          }, 'core'],
          ['babel-plugin-import', {
            libraryName: '@mui/icons-material',
            libraryDirectory: '',
            camel2DashComponentName: false,
          }, 'icons'],
        ].filter(Boolean),
      },
    }),
    
    // Vendor chunk splitting for better caching
    splitVendorChunkPlugin(),
    
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@services': resolve(__dirname, 'src/services'),
      '@store': resolve(__dirname, 'src/store'),
    },
  },
  
  // Development server configuration
  server: {
    port: 5173,
    host: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  
  // Build optimization
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    
    // Rollup options for advanced bundling
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // State management
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          
          // UI library
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
          ],
          
          // 3D visualization
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          
          // Charts and visualization
          'chart-vendor': ['recharts', 'd3'],
          
          // Utilities
          'utils-vendor': ['axios', 'lodash', 'date-fns'],
        },
        
        // Asset naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().replace(/\.[^.]*$/, '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      
      // External dependencies (for CDN usage)
      external: process.env.USE_CDN ? [
        'react',
        'react-dom',
        'three',
      ] : [],
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Asset inlining threshold
    assetsInlineLimit: 4096,
  },
  
  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: process.env.NODE_ENV === 'production' 
        ? '[hash:base64:5]' 
        : '[name]__[local]__[hash:base64:5]',
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
  
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  
  // Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      '@mui/material',
      'three',
    ],
    exclude: [
      // Large dependencies that should be loaded dynamically
      'ngl',
    ],
  },
  
  // Worker configuration for web workers
  worker: {
    format: 'es',
    plugins: [
      // Worker-specific plugins
    ],
  },
});
```

#### 2. Performance Optimization Techniques

```typescript
// utils/performance.ts - Performance monitoring and optimization
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  
  constructor() {
    this.initializeWebVitals();
    this.initializeCustomMetrics();
  }
  
  private initializeWebVitals() {
    // Core Web Vitals monitoring
    getCLS((metric) => {
      this.recordMetric('CLS', metric.value);
      console.log('Cumulative Layout Shift:', metric.value);
    });
    
    getFID((metric) => {
      this.recordMetric('FID', metric.value);
      console.log('First Input Delay:', metric.value);
    });
    
    getFCP((metric) => {
      this.recordMetric('FCP', metric.value);
      console.log('First Contentful Paint:', metric.value);
    });
    
    getLCP((metric) => {
      this.recordMetric('LCP', metric.value);
      console.log('Largest Contentful Paint:', metric.value);
    });
    
    getTTFB((metric) => {
      this.recordMetric('TTFB', metric.value);
      console.log('Time to First Byte:', metric.value);
    });
  }
  
  private initializeCustomMetrics() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn('Long task detected:', entry.duration, 'ms');
          this.recordMetric('longTask', entry.duration);
        }
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.warn('Long task observer not supported');
      }
      
      // Monitor memory usage
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          this.recordMetric('memoryUsed', memory.usedJSHeapSize);
          this.recordMetric('memoryTotal', memory.totalJSHeapSize);
          this.recordMetric('memoryLimit', memory.jsHeapSizeLimit);
        }, 30000); // Every 30 seconds
      }
    }
  }
  
  recordMetric(name: string, value: number) {
    this.metrics.set(name, value);
    
    // Send to analytics service
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(name, value);
    }
  }
  
  private sendToAnalytics(name: string, value: number) {
    // Send to your analytics service
    fetch('/api/analytics/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric: name, value, timestamp: Date.now() }),
    }).catch(console.error);
  }
  
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
  
  // Measure component render time
  measureRender<T>(componentName: string, renderFn: () => T): T {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    this.recordMetric(`render_${componentName}`, end - start);
    return result;
  }
  
  // Measure async operations
  async measureAsync<T>(operationName: string, asyncFn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const end = performance.now();
      this.recordMetric(`async_${operationName}`, end - start);
      return result;
    } catch (error) {
      const end = performance.now();
      this.recordMetric(`async_${operationName}_error`, end - start);
      throw error;
    }
  }
  
  // Memory leak detection
  detectMemoryLeaks() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      if (usageRatio > 0.9) {
        console.warn('High memory usage detected:', usageRatio);
        this.recordMetric('memoryLeakWarning', usageRatio);
      }
    }
  }
  
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// React performance optimization hooks
export const usePerformanceMonitor = () => {
  const [performanceData, setPerformanceData] = useState({});
  
  useEffect(() => {
    const monitor = new PerformanceMonitor();
    
    const interval = setInterval(() => {
      setPerformanceData(monitor.getMetrics());
      monitor.detectMemoryLeaks();
    }, 5000);
    
    return () => {
      clearInterval(interval);
      monitor.cleanup();
    };
  }, []);
  
  return performanceData;
};

// Debounce hook for performance optimization
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Throttle hook for performance optimization
export const useThrottle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  const [lastCall, setLastCall] = useState(0);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      setLastCall(now);
      return func(...args);
    }
  }, [func, delay, lastCall]) as T;
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  ref: RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    
    observer.observe(ref.current);
    
    return () => observer.disconnect();
  }, [ref, options]);
  
  return isIntersecting;
};
```

### Docker Configuration and Deployment

#### 1. Multi-stage Docker Build
```dockerfile
# frontend/Dockerfile - Optimized multi-stage build
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL
ARG VITE_AI_SERVICE_URL
ARG NODE_ENV=production

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AI_SERVICE_URL=$VITE_AI_SERVICE_URL
ENV NODE_ENV=$NODE_ENV

# Build the application
RUN npm run build

# Production image, copy all the files and run nginx
FROM nginx:alpine AS runner

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# backend/Dockerfile - Python backend with optimization
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM deps AS development
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM deps AS production
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

```dockerfile
# ai-service/Dockerfile - AI service with GPU support
FROM nvidia/cuda:11.8-devel-ubuntu20.04 AS base

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.9 \
    python3.9-dev \
    python3-pip \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.9 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.9 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

WORKDIR /app

# Install PyTorch with CUDA support
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create model cache directory
RUN mkdir -p /app/models && chmod 755 /app/models

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

EXPOSE 8001

# Use GPU-optimized startup
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
```

#### 2. Docker Compose for Development and Production
```yaml
# docker-compose.yml - Complete development environment
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: protein_db
      POSTGRES_USER: protein_user
      POSTGRES_PASSWORD: protein_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U protein_user -d protein_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      target: development
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://protein_user:protein_pass@postgres:5432/protein_db
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=http://ai-service:8001
      - DEBUG=true
    volumes:
      - ./backend:/app
      - backend_cache:/app/.cache
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # AI Service
  ai-service:
    build:
      context: ./ai-service
    ports:
      - "8001:8001"
    environment:
      - MODEL_CACHE_DIR=/app/models
      - CUDA_VISIBLE_DEVICES=0
      - TORCH_HOME=/app/.torch
    volumes:
      - ./ai-service:/app
      - model_cache:/app/models
      - torch_cache:/app/.torch
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 30s
      retries: 3

  # Frontend
  frontend:
    build:
      context: ./frontend
      target: development
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000/api
      - VITE_AI_SERVICE_URL=http://localhost:8001/api
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
      - ai-service

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
      - ai-service

volumes:
  postgres_data:
  redis_data:
  model_cache:
  torch_cache:
  backend_cache:

networks:
  default:
    driver: bridge
```

```yaml
# docker-compose.prod.yml - Production configuration
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  backend:
    build:
      context: ./backend
      target: production
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=http://ai-service:8001
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  ai-service:
    build:
      context: ./ai-service
    environment:
      - MODEL_CACHE_DIR=/app/models
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - model_cache:/app/models
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  frontend:
    build:
      context: ./frontend
      target: runner
      args:
        - VITE_API_BASE_URL=${VITE_API_BASE_URL}
        - VITE_AI_SERVICE_URL=${VITE_AI_SERVICE_URL}
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 256M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - static_files:/var/www/static
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  model_cache:
  static_files:
```

This comprehensive technical documentation covers every aspect of the protein synthesis web application, from frontend React components with advanced TypeScript patterns, to backend FastAPI services with AI model management, to production deployment with Docker. The codebase demonstrates modern web development practices, performance optimization techniques, and scalable architecture patterns.

The key technologies and concepts covered include:

**Frontend**: React 18, TypeScript, Redux Toolkit, Material-UI, Three.js, NGL Viewer, Vite build system
**Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis, Pydantic validation
**AI/ML**: PyTorch, Transformers, ESM models, ProtGPT2, model management
**DevOps**: Docker multi-stage builds, Docker Compose, Nginx, performance monitoring
**Architecture**: Microservices, API design, error handling, caching, optimization

Each component is designed with production-readiness in mind, including comprehensive error handling, performance monitoring, security considerations, and scalability patterns.