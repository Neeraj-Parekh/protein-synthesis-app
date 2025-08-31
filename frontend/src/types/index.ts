/**
 * Main export file for all protein-related types and utilities
 */

// Export all types from protein.ts
export * from './protein';

// Export validation functions
export * from './validation';

// Export utility functions
export * from './utils';

// Re-export commonly used types for convenience
export type {
  Vector3,
  BoundingBox,
  Atom,
  Residue,
  Chain,
  ProteinStructure,
  AminoAcidProperties,
  ChemicalProperties,
  AminoAcidComposition,
  GenerationConstraints,
  GeneratedProtein,
  RenderOptions,
  SequenceAlignment,
  StructuralComparison,
  ComparisonResults,
  ExportOptions,
  AnalysisSession,
  LoadingState,
  OperationStatus,
  ProteinError,
} from './protein';

// Export enums as values, not types
export {
  AminoAcidType,
  SecondaryStructureType,
} from './protein';

// Re-export validation utilities
export {
  ValidationError,
  validateProteinData,
  validateProteinSequence,
  validateChemicalProperties,
  validateGenerationConstraints,
  validateRenderOptions,
} from './validation';

// Re-export utility functions
export {
  AMINO_ACID_PROPERTIES,
  vector3Utils,
  boundingBoxUtils,
  sequenceUtils,
  proteinUtils,
} from './utils';