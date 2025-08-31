/**
 * Type definitions for protein data structures
 * Based on the Protein Synthesis Web Application design specification
 */

// ============================================================================
// BASIC GEOMETRIC TYPES
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
  center: Vector3;
  size: Vector3;
}

// ============================================================================
// AMINO ACID TYPES
// ============================================================================

export enum AminoAcidType {
  ALA = 'A', // Alanine
  ARG = 'R', // Arginine
  ASN = 'N', // Asparagine
  ASP = 'D', // Aspartic acid
  CYS = 'C', // Cysteine
  GLN = 'Q', // Glutamine
  GLU = 'E', // Glutamic acid
  GLY = 'G', // Glycine
  HIS = 'H', // Histidine
  ILE = 'I', // Isoleucine
  LEU = 'L', // Leucine
  LYS = 'K', // Lysine
  MET = 'M', // Methionine
  PHE = 'F', // Phenylalanine
  PRO = 'P', // Proline
  SER = 'S', // Serine
  THR = 'T', // Threonine
  TRP = 'W', // Tryptophan
  TYR = 'Y', // Tyrosine
  VAL = 'V', // Valine
  UNK = 'X', // Unknown
}

export enum SecondaryStructureType {
  HELIX = 'helix',
  SHEET = 'sheet',
  LOOP = 'loop',
  TURN = 'turn',
  COIL = 'coil',
  BRIDGE = 'bridge',
  BEND = 'bend',
}



export interface ComparisonDomain {
  name: string;
  start1: number;
  end1: number;
  start2: number;
  end2: number;
  confidence?: number;
}

export interface AminoAcidProperties {
  name: string;
  threeLetterCode: string;
  oneLetterCode: AminoAcidType;
  molecularWeight: number;
  hydrophobicity: number;
  charge: number;
  polarity: 'polar' | 'nonpolar' | 'charged';
  category: 'aliphatic' | 'aromatic' | 'basic' | 'acidic' | 'hydroxyl' | 'sulfur' | 'amide';
}

// ============================================================================
// ATOMIC STRUCTURE TYPES
// ============================================================================

export interface Atom {
  id: number;
  name: string;
  element: string;
  position: Vector3;
  residueId: string;
  chainId: string;
  bFactor?: number;
  occupancy?: number;
  altLoc?: string;
  atomType: 'backbone' | 'sidechain' | 'hetero';
}

export interface Bond {
  id: string;
  atom1Id: number;
  atom2Id: number;
  bondType: 'single' | 'double' | 'triple' | 'aromatic';
  length: number;
}

// ============================================================================
// RESIDUE AND CHAIN TYPES
// ============================================================================

export interface Residue {
  id: string;
  name: string;
  type: AminoAcidType;
  position: number;
  atoms: Atom[];
  chainId: string;
  insertionCode?: string;
  properties: AminoAcidProperties;
  secondaryStructure?: SecondaryStructureType;
  phi?: number; // Phi dihedral angle
  psi?: number; // Psi dihedral angle
}

export interface Chain {
  id: string;
  name?: string;
  residues: Residue[];
  sequence: string;
  type: 'protein' | 'dna' | 'rna' | 'ligand' | 'water';
  organism?: string;
}

// ============================================================================
// SECONDARY STRUCTURE TYPES
// ============================================================================

export interface SecondaryStructure {
  id?: string;
  type: SecondaryStructureType;
  chainId?: string;
  start: number;
  end: number;
  startResidue?: number; // Keep for backward compatibility
  endResidue?: number; // Keep for backward compatibility
  confidence?: number;
  helixClass?: number; // For helices
  strandId?: string; // For sheets
}

// ============================================================================
// PROTEIN STRUCTURE TYPES
// ============================================================================

export interface ProteinMetadata {
  pdbId?: string;
  title?: string;
  source?: string;
  resolution?: number;
  method?: 'X-RAY DIFFRACTION' | 'NMR' | 'ELECTRON MICROSCOPY' | 'CRYO-EM' | 'OTHER';
  organism?: string;
  classification?: string;
  depositionDate?: string;
  releaseDate?: string;
  authors?: string[];
  journal?: string;
  doi?: string;
  keywords?: string[];
  molecularWeight?: number;
  experimentalData?: {
    rFactor?: number;
    rFree?: number;
    spaceGroup?: string;
    unitCell?: number[];
  };
}

export interface ProteinStructure {
  id: string;
  name: string;
  sequence: string;
  atoms: Atom[];
  residues: Residue[];
  chains: Chain[];
  bonds?: Bond[];
  metadata: ProteinMetadata;
  secondaryStructure: SecondaryStructure[];
  boundingBox: BoundingBox;
  centerOfMass: Vector3;
  radiusOfGyration?: number;
  surfaceArea?: number;
  volume?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChemicalProperties {
  molecularWeight: number
  molecular_weight: number // Keep both for backward compatibility
  hydrophobicity: number[]
  chargeDistribution: number[]
  charge_distribution: number[] // Keep both for backward compatibility
  isoelectricPoint: number
  isoelectric_point: number // Keep both for backward compatibility
  stability?: number // Optional stability score
}

export interface AminoAcidComposition {
  composition: Record<string, number>
  percentages: Record<string, number>
  total_residues: number
}

export interface SequenceAnalysis {
  composition: AminoAcidComposition
  properties: ChemicalProperties
  domains: any[]
  motifs: any[]
  secondaryStructure: SecondaryStructure[]
  timestamp: string
}

export interface ProteinResponse {
  id: string
  name: string
  sequence: string
  molecular_weight?: number
  length: number
  created_at: string
  metadata?: Record<string, any>
}

export interface GenerationConstraints {
  length?: [number, number]
  composition?: Record<string, number>
  properties?: Record<string, number>
  template?: string
  model: 'esm3' | 'esm3_chat' | 'rfdiffusion' | 'protflash'
}

export interface GeneratedProtein {
  sequence: string
  confidence: number
  properties: ChemicalProperties
  validationScore: number
  validation_score: number // Keep both for backward compatibility
  generation_metadata: Record<string, any>
  metadata: {
    model: string
    [key: string]: any
  }
}

export interface RenderOptions {
  colorScheme: 'cpk' | 'hydrophobicity' | 'secondary-structure' | 'chainname' | 'bfactor' | 'residue'
  representation: 'cartoon' | 'surface' | 'ball-stick' | 'spacefill' | 'ribbon'
  levelOfDetail: boolean
  quality: 'low' | 'medium' | 'high'
}

// ============================================================================
// ANALYSIS AND COMPARISON TYPES
// ============================================================================

export interface SequenceAlignment {
  sequence1: string
  sequence2: string
  alignedSequence1: string
  alignedSequence2: string
  matches: string
  score: number
  identity: number
  similarity: number
  gaps: number
  alignmentLength: number
}

export interface StructuralComparison {
  rmsd: number
  alignedResidues: number
  commonDomains: ComparisonDomain[]
  structuralSimilarity: number
  visualizationData: ComparisonVisualization
}

export interface ComparisonResults {
  alignment?: SequenceAlignment
  structuralComparison?: StructuralComparison
  similarity: number
  commonDomains: ComparisonDomain[]
}

export interface Domain {
  id: string
  name: string
  startResidue: number
  endResidue: number
  chainId: string
  type: string
  confidence?: number
}

export interface Motif {
  id: string
  name: string
  pattern: string
  startPosition: number
  endPosition: number
  score: number
}

export interface ComparisonVisualization {
  overlayData: any
  colorMapping: Record<string, string>
  transformationMatrix?: number[]
}

// ============================================================================
// EXPORT AND SESSION TYPES
// ============================================================================

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdb' | 'fasta' | 'json'
  resolution?: number
  quality?: 'low' | 'medium' | 'high'
  includeMetadata?: boolean
  watermark?: boolean
}

export interface AnalysisSession {
  id: string
  name: string
  proteins: string[]
  analyses: AnalysisResult[]
  settings: SessionSettings
  createdAt: Date
  updatedAt: Date
}

export interface SessionSettings {
  renderOptions: RenderOptions
  analysisPreferences: Record<string, any>
  viewState: ViewState
}

export interface ViewState {
  cameraPosition: Vector3
  cameraTarget: Vector3
  zoom: number
  selectedResidues: string[]
  visibleChains: string[]
}

export interface AnalysisResult {
  id: string
  type: 'sequence' | 'structure' | 'comparison' | 'generation'
  proteinId: string
  data: any
  timestamp: Date
  parameters: Record<string, any>
}

// ============================================================================
// ERROR AND STATUS TYPES
// ============================================================================

export interface ProteinError {
  code: string
  message: string
  field?: string
  details?: any
}

export interface LoadingState {
  isLoading: boolean
  progress?: number
  message?: string
  error?: ProteinError
}

export interface OperationStatus {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
  error?: ProteinError
  data?: any
}