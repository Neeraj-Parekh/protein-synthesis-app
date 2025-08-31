## STATE MANAGEMENT THEORY

### Redux Architecture Theory

#### Flux Pattern Implementation
```typescript
// Theory: Unidirectional data flow for predictable state management
// Action → Dispatcher → Store → View → Action (cycle)

/*
FLUX PATTERN FLOW:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ACTION    │───►│ DISPATCHER  │───►│    STORE    │───►│    VIEW     │
│             │    │             │    │             │    │             │
│ User Intent │    │ Redux Thunk │    │ Redux State │    │ React Comp  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                                                         │
       └─────────────────────────────────────────────────────────┘
                           User Interaction
*/

// Action Creators - Pure functions that return action objects
const proteinActions = {
  // Synchronous action
  setCurrentProtein: (proteinId: string) => ({
    type: 'proteins/setCurrentProtein' as const,
    payload: proteinId
  }),
  
  // Asynchronous action (thunk)
  loadProtein: (proteinId: string) => async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch({ type: 'proteins/loadProtein/pending' });
    
    try {
      const protein = await proteinAPI.getProtein(proteinId);
      dispatch({ 
        type: 'proteins/loadProtein/fulfilled', 
        payload: protein 
      });
    } catch (error) {
      dispatch({ 
        type: 'proteins/loadProtein/rejected', 
        payload: error.message 
      });
    }
  }
};
```

#### Reducer Theory - Pure Functions and Immutability
```typescript
// Theory: Reducers are pure functions (same input = same output, no side effects)
// They implement the Command Pattern for state transitions

interface ProteinState {
  proteins: { [id: string]: ProteinStructure };
  currentProteinId: string | null;
  loading: boolean;
  error: string | null;
}

// Pure reducer function - no mutations, no side effects
const proteinReducer = (
  state: ProteinState = initialState, 
  action: AnyAction
): ProteinState => {
  switch (action.type) {
    case 'proteins/setCurrentProtein':
      // Immutable update using spread operator
      return {
        ...state,
        currentProteinId: action.payload
      };
    
    case 'proteins/addProtein':
      // Immutable nested update
      return {
        ...state,
        proteins: {
          ...state.proteins,
          [action.payload.id]: action.payload
        }
      };
    
    case 'proteins/updateProtein':
      // Conditional immutable update
      const { id, updates } = action.payload;
      if (!state.proteins[id]) return state;
      
      return {
        ...state,
        proteins: {
          ...state.proteins,
          [id]: {
            ...state.proteins[id],
            ...updates,
            updatedAt: new Date()
          }
        }
      };
    
    default:
      return state;
  }
};
```

#### Selector Theory - Memoization and Derived State
```typescript
// Theory: Selectors implement the Observer pattern for efficient state access
// They use memoization to prevent unnecessary recalculations

import { createSelector } from '@reduxjs/toolkit';

// Basic selector - direct state access
const selectProteins = (state: RootState) => state.proteins.proteins;
const selectCurrentProteinId = (state: RootState) => state.proteins.currentProteinId;

// Memoized selector - only recalculates when inputs change
const selectCurrentProtein = createSelector(
  [selectProteins, selectCurrentProteinId],
  (proteins, currentId) => {
    // This function only runs when proteins or currentId change
    return currentId ? proteins[currentId] : null;
  }
);

// Complex derived state with multiple dependencies
const selectProteinStatistics = createSelector(
  [selectProteins],
  (proteins) => {
    const proteinArray = Object.values(proteins);
    
    // Expensive calculations only run when proteins change
    return {
      totalProteins: proteinArray.length,
      averageLength: proteinArray.reduce((sum, p) => sum + p.sequence.length, 0) / proteinArray.length,
      methodDistribution: proteinArray.reduce((acc, protein) => {
        const method = protein.metadata.method || 'Unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      // More expensive calculations...
    };
  }
);

// Parameterized selector using closure
const makeSelectProteinsByMethod = () => createSelector(
  [selectProteins, (state: RootState, method: string) => method],
  (proteins, method) => {
    return Object.values(proteins).filter(
      protein => protein.metadata.method === method
    );
  }
);
```

### Async State Management Theory

#### Redux Thunk Pattern for Side Effects
```typescript
// Theory: Thunks handle side effects while keeping reducers pure
// They implement the Command pattern for async operations

// Thunk action creator - returns a function instead of an action object
export const generateProtein = createAsyncThunk(
  'ai/generateProtein',
  async (
    constraints: GenerationConstraints,
    { dispatch, getState, rejectWithValue, signal }
  ) => {
    try {
      // Access current state if needed
      const state = getState() as RootState;
      const currentModel = state.ai.selectedModel;
      
      // Dispatch intermediate actions for UI feedback
      dispatch(updateGenerationProgress(0.1));
      
      // Make API call with abort signal for cancellation
      const response = await aiAPI.generateProtein(constraints, {
        signal,
        onProgress: (progress) => {
          dispatch(updateGenerationProgress(progress));
        }
      });
      
      // Return data for fulfilled action
      return response.data;
      
    } catch (error) {
      // Handle different error types
      if (error.name === 'AbortError') {
        return rejectWithValue('Generation cancelled');
      }
      
      if (error.response?.status === 429) {
        return rejectWithValue('Rate limit exceeded. Please try again later.');
      }
      
      return rejectWithValue(error.message || 'Generation failed');
    }
  }
);

// Reducer handles all async states automatically
const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    updateGenerationProgress: (state, action) => {
      state.generationProgress = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateProtein.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.generationProgress = 0;
      })
      .addCase(generateProtein.fulfilled, (state, action) => {
        state.loading = false;
        state.generatedProteins.push(action.payload);
        state.generationProgress = 1;
      })
      .addCase(generateProtein.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.generationProgress = 0;
      });
  }
});
```

#### Optimistic Updates Pattern
```typescript
// Theory: Update UI immediately, rollback on failure
// Improves perceived performance and user experience

export const updateProteinName = createAsyncThunk(
  'proteins/updateName',
  async (
    { proteinId, newName }: { proteinId: string; newName: string },
    { dispatch, rejectWithValue }
  ) => {
    // Optimistic update - update UI immediately
    const optimisticUpdate = { id: proteinId, name: newName };
    dispatch(proteinSlice.actions.updateProteinOptimistic(optimisticUpdate));
    
    try {
      // Make API call
      const updatedProtein = await proteinAPI.updateProtein(proteinId, { name: newName });
      return updatedProtein;
      
    } catch (error) {
      // Rollback optimistic update on failure
      dispatch(proteinSlice.actions.rollbackOptimisticUpdate(proteinId));
      return rejectWithValue(error.message);
    }
  }
);

// Reducer handles optimistic updates
const proteinSlice = createSlice({
  name: 'proteins',
  initialState,
  reducers: {
    updateProteinOptimistic: (state, action) => {
      const { id, ...updates } = action.payload;
      if (state.proteins[id]) {
        // Store original value for potential rollback
        state.optimisticUpdates[id] = { ...state.proteins[id] };
        // Apply optimistic update
        Object.assign(state.proteins[id], updates);
      }
    },
    rollbackOptimisticUpdate: (state, action) => {
      const proteinId = action.payload;
      if (state.optimisticUpdates[proteinId]) {
        // Restore original value
        state.proteins[proteinId] = state.optimisticUpdates[proteinId];
        delete state.optimisticUpdates[proteinId];
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(updateProteinName.fulfilled, (state, action) => {
      // Confirm optimistic update with server response
      const proteinId = action.payload.id;
      state.proteins[proteinId] = action.payload;
      delete state.optimisticUpdates[proteinId];
    });
  }
});
```

---

## TYPE SYSTEM THEORY

### TypeScript Advanced Type Theory

#### Structural Typing vs Nominal Typing
```typescript
// Theory: TypeScript uses structural typing (duck typing)
// If it walks like a duck and quacks like a duck, it's a duck

interface Atom {
  id: number;
  element: string;
  position: Vector3;
}

interface Particle {
  id: number;
  element: string;
  position: Vector3;
}

// These are structurally identical, so TypeScript considers them compatible
function processAtom(atom: Atom) {
  console.log(atom.element);
}

const particle: Particle = { id: 1, element: 'C', position: { x: 0, y: 0, z: 0 } };
processAtom(particle); // ✅ Valid - structural compatibility

// Nominal typing simulation using branded types
type AtomId = number & { __brand: 'AtomId' };
type ResidueId = number & { __brand: 'ResidueId' };

function createAtomId(id: number): AtomId {
  return id as AtomId;
}

function getAtom(id: AtomId): Atom {
  // Implementation...
}

const atomId = createAtomId(123);
const residueId = 456 as ResidueId;

getAtom(atomId);    // ✅ Valid
getAtom(residueId); // ❌ Type error - different brands
```

#### Generic Type Theory and Variance
```typescript
// Theory: Generics provide type safety while maintaining flexibility
// Variance determines how generic types relate to their type parameters

// Covariance - T extends U implies Container<T> extends Container<U>
interface ReadOnlyContainer<out T> {
  get(): T;
}

// Contravariance - T extends U implies Container<U> extends Container<T>
interface WriteOnlyContainer<in T> {
  set(value: T): void;
}

// Invariance - no relationship between Container<T> and Container<U>
interface Container<T> {
  get(): T;
  set(value: T): void;
}

// Generic constraints for type safety
interface Identifiable {
  id: string;
}

// T must have an id property
function updateEntity<T extends Identifiable>(
  entities: T[],
  id: string,
  updates: Partial<T>
): T[] {
  return entities.map(entity => 
    entity.id === id ? { ...entity, ...updates } : entity
  );
}

// Conditional types for advanced type manipulation
type ApiResponse<T> = T extends string 
  ? { message: T }
  : T extends number
  ? { count: T }
  : { data: T };

// Mapped types for transformations
type Optional<T> = {
  [K in keyof T]?: T[K];
};

type ReadOnly<T> = {
  readonly [K in keyof T]: T[K];
};

// Template literal types for string manipulation
type EventName<T extends string> = `on${Capitalize<T>}`;
type ProteinEvent = EventName<'load' | 'error' | 'analyze'>; // 'onLoad' | 'onError' | 'onAnalyze'
```

#### Type Guards and Runtime Type Checking
```typescript
// Theory: Type guards bridge compile-time and runtime type safety
// They implement the Type State pattern

// User-defined type guard
function isProteinStructure(obj: unknown): obj is ProteinStructure {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).sequence === 'string' &&
    Array.isArray((obj as any).atoms)
  );
}

// Discriminated union with type guards
type AnalysisResult = 
  | { type: 'sequence'; data: SequenceAnalysis }
  | { type: 'structure'; data: StructureAnalysis }
  | { type: 'chemical'; data: ChemicalAnalysis };

function processAnalysisResult(result: AnalysisResult) {
  switch (result.type) {
    case 'sequence':
      // TypeScript knows result.data is SequenceAnalysis
      console.log(result.data.composition);
      break;
    case 'structure':
      // TypeScript knows result.data is StructureAnalysis
      console.log(result.data.secondaryStructure);
      break;
    case 'chemical':
      // TypeScript knows result.data is ChemicalAnalysis
      console.log(result.data.properties);
      break;
  }
}

// Runtime validation with Zod
import { z } from 'zod';

const ProteinSchema = z.object({
  id: z.string(),
  name: z.string(),
  sequence: z.string().regex(/^[ACDEFGHIKLMNPQRSTVWY]+$/),
  atoms: z.array(z.object({
    id: z.number(),
    element: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number()
    })
  }))
});

// Type inference from schema
type Protein = z.infer<typeof ProteinSchema>;

// Runtime validation
function validateProtein(data: unknown): Protein {
  return ProteinSchema.parse(data); // Throws if invalid
}
```

---

## REACTIVE PROGRAMMING CONCEPTS

### Observable Pattern Implementation

#### Custom Observable for Real-time Updates
```typescript
// Theory: Observer pattern for reactive programming
// Subjects notify observers of state changes

class Observable<T> {
  private observers: Array<(value: T) => void> = [];
  
  subscribe(observer: (value: T) => void): () => void {
    this.observers.push(observer);
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }
  
  next(value: T): void {
    this.observers.forEach(observer => observer(value));
  }
}

// Subject for protein generation progress
class ProteinGenerationSubject extends Observable<GenerationProgress> {
  private currentProgress: GenerationProgress = { stage: 'idle', progress: 0 };
  
  updateProgress(stage: string, progress: number) {
    this.currentProgress = { stage, progress };
    this.next(this.currentProgress);
  }
  
  getCurrentProgress(): GenerationProgress {
    return this.currentProgress;
  }
}

// Usage in React component
function ProteinGenerator() {
  const [progress, setProgress] = useState<GenerationProgress>({ stage: 'idle', progress: 0 });
  
  useEffect(() => {
    const unsubscribe = generationSubject.subscribe(setProgress);
    return unsubscribe; // Cleanup on unmount
  }, []);
  
  return (
    <div>
      <div>Stage: {progress.stage}</div>
      <ProgressBar value={progress.progress} />
    </div>
  );
}
```

#### RxJS Integration for Complex Async Flows
```typescript
// Theory: Reactive Extensions for composable async operations
// Functional reactive programming with operators

import { fromEvent, merge, interval } from 'rxjs';
import { map, filter, debounceTime, switchMap, takeUntil } from 'rxjs/operators';

// Search with debouncing and cancellation
function createProteinSearch(searchInput: HTMLInputElement) {
  const searchQuery$ = fromEvent(searchInput, 'input').pipe(
    map((event: Event) => (event.target as HTMLInputElement).value),
    filter(query => query.length > 2), // Only search for 3+ characters
    debounceTime(300), // Wait 300ms after user stops typing
    switchMap(query => 
      // Cancel previous search when new query comes in
      searchProteins(query).pipe(
        takeUntil(fromEvent(searchInput, 'input'))
      )
    )
  );
  
  return searchQuery$;
}

// Real-time protein analysis updates
function createAnalysisStream(proteinId: string) {
  return interval(1000).pipe( // Poll every second
    switchMap(() => getAnalysisStatus(proteinId)),
    filter(status => status.isComplete),
    map(status => status.results)
  );
}

// Combine multiple streams
function createProteinDashboard() {
  const proteinUpdates$ = createProteinStream();
  const analysisUpdates$ = createAnalysisStream();
  const userActions$ = createUserActionStream();
  
  return merge(
    proteinUpdates$.pipe(map(data => ({ type: 'PROTEIN_UPDATE', data }))),
    analysisUpdates$.pipe(map(data => ({ type: 'ANALYSIS_UPDATE', data }))),
    userActions$.pipe(map(data => ({ type: 'USER_ACTION', data })))
  );
}
```

### Event-Driven Architecture Theory

#### Custom Event System
```typescript
// Theory: Publish-Subscribe pattern for loose coupling
// Events decouple producers from consumers

class EventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Array<(data: T[K]) => void> } = {};
  
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners[event];
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }
  
  emit<K extends keyof T>(event: K, data: T[K]): void {
    const listeners = this.listeners[event];
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
  
  off<K extends keyof T>(event: K): void {
    delete this.listeners[event];
  }
}

// Type-safe event definitions
interface ProteinEvents {
  loaded: { protein: ProteinStructure; loadTime: number };
  analyzed: { proteinId: string; results: AnalysisResults };
  error: { error: Error; context: string };
  progress: { stage: string; progress: number };
}

// Global event bus
const proteinEventBus = new EventEmitter<ProteinEvents>();

// Event producers
class ProteinLoader {
  async loadProtein(id: string): Promise<ProteinStructure> {
    const startTime = performance.now();
    
    try {
      const protein = await proteinAPI.getProtein(id);
      const loadTime = performance.now() - startTime;
      
      // Emit success event
      proteinEventBus.emit('loaded', { protein, loadTime });
      
      return protein;
    } catch (error) {
      // Emit error event
      proteinEventBus.emit('error', { 
        error: error as Error, 
        context: `Loading protein ${id}` 
      });
      throw error;
    }
  }
}

// Event consumers
class PerformanceMonitor {
  constructor() {
    proteinEventBus.on('loaded', ({ loadTime }) => {
      if (loadTime > 1000) {
        console.warn(`Slow protein load: ${loadTime}ms`);
      }
    });
  }
}

class ErrorLogger {
  constructor() {
    proteinEventBus.on('error', ({ error, context }) => {
      console.error(`Error in ${context}:`, error);
      // Send to error tracking service
      errorTracker.captureException(error, { context });
    });
  }
}
```