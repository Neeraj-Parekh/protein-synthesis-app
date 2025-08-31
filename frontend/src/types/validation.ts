/**
 * Validation functions for protein data structures
 * Ensures data integrity and type safety for protein-related data
 */

import {
  Vector3,
  BoundingBox,
  Atom,
  Residue,
  Chain,
  ProteinStructure,
  AminoAcidType,
  SecondaryStructureType,
  ChemicalProperties,
  AminoAcidComposition,
  GenerationConstraints,
  RenderOptions,
} from './protein';

// ============================================================================
// BASIC VALIDATION UTILITIES
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

export const isValidString = (value: any, minLength = 0): value is string => {
  return typeof value === 'string' && value.length >= minLength;
};

export const isValidDate = (value: any): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isValidArray = <T>(value: any, validator?: (item: T) => boolean): value is T[] => {
  if (!Array.isArray(value)) return false;
  if (validator) {
    return value.every(validator);
  }
  return true;
};

// ============================================================================
// GEOMETRIC VALIDATION
// ============================================================================

export const validateVector3 = (vector: any): vector is Vector3 => {
  if (!vector || typeof vector !== 'object') {
    throw new ValidationError('Vector3 must be an object');
  }
  
  if (!isValidNumber(vector.x)) {
    throw new ValidationError('Vector3.x must be a valid number', 'x');
  }
  
  if (!isValidNumber(vector.y)) {
    throw new ValidationError('Vector3.y must be a valid number', 'y');
  }
  
  if (!isValidNumber(vector.z)) {
    throw new ValidationError('Vector3.z must be a valid number', 'z');
  }
  
  return true;
};

export const validateBoundingBox = (bbox: any): bbox is BoundingBox => {
  if (!bbox || typeof bbox !== 'object') {
    throw new ValidationError('BoundingBox must be an object');
  }
  
  validateVector3(bbox.min);
  validateVector3(bbox.max);
  validateVector3(bbox.center);
  validateVector3(bbox.size);
  
  // Validate logical constraints
  if (bbox.min.x > bbox.max.x || bbox.min.y > bbox.max.y || bbox.min.z > bbox.max.z) {
    throw new ValidationError('BoundingBox min values must be less than max values');
  }
  
  return true;
};

// ============================================================================
// AMINO ACID VALIDATION
// ============================================================================

export const validateAminoAcidType = (type: any): type is AminoAcidType => {
  if (!isValidString(type, 1)) {
    throw new ValidationError('AminoAcidType must be a non-empty string');
  }
  
  const validTypes = Object.values(AminoAcidType);
  if (!validTypes.includes(type as AminoAcidType)) {
    throw new ValidationError(`Invalid amino acid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }
  
  return true;
};

export const validateAminoAcidComposition = (composition: any): composition is AminoAcidComposition => {
  if (!composition || typeof composition !== 'object') {
    throw new ValidationError('AminoAcidComposition must be an object');
  }
  
  if (!composition.composition || typeof composition.composition !== 'object') {
    throw new ValidationError('AminoAcidComposition.composition must be an object');
  }
  
  if (!composition.percentages || typeof composition.percentages !== 'object') {
    throw new ValidationError('AminoAcidComposition.percentages must be an object');
  }
  
  if (!isValidNumber(composition.total_residues) || composition.total_residues < 0) {
    throw new ValidationError('AminoAcidComposition.total_residues must be a non-negative number');
  }
  
  // Validate that percentages sum to approximately 100
  const percentageSum = Object.values(composition.percentages).reduce((sum: number, val: any) => {
    if (!isValidNumber(val)) {
      throw new ValidationError('All percentage values must be valid numbers');
    }
    return sum + val;
  }, 0);
  
  if (Math.abs(Number(percentageSum) - 100) > 0.1) {
    throw new ValidationError(`Percentages must sum to 100, got ${percentageSum}`);
  }
  
  return true;
};

// ============================================================================
// ATOMIC STRUCTURE VALIDATION
// ============================================================================

export const validateAtom = (atom: any): atom is Atom => {
  if (!atom || typeof atom !== 'object') {
    throw new ValidationError('Atom must be an object');
  }
  
  if (!isValidNumber(atom.id)) {
    throw new ValidationError('Atom.id must be a valid number', 'id');
  }
  
  if (!isValidString(atom.name, 1)) {
    throw new ValidationError('Atom.name must be a non-empty string', 'name');
  }
  
  if (!isValidString(atom.element, 1)) {
    throw new ValidationError('Atom.element must be a non-empty string', 'element');
  }
  
  validateVector3(atom.position);
  
  if (!isValidString(atom.residueId, 1)) {
    throw new ValidationError('Atom.residueId must be a non-empty string', 'residueId');
  }
  
  if (!isValidString(atom.chainId, 1)) {
    throw new ValidationError('Atom.chainId must be a non-empty string', 'chainId');
  }
  
  const validAtomTypes = ['backbone', 'sidechain', 'hetero'];
  if (!validAtomTypes.includes(atom.atomType)) {
    throw new ValidationError(`Atom.atomType must be one of: ${validAtomTypes.join(', ')}`, 'atomType');
  }
  
  // Optional fields validation
  if (atom.bFactor !== undefined && !isValidNumber(atom.bFactor)) {
    throw new ValidationError('Atom.bFactor must be a valid number if provided', 'bFactor');
  }
  
  if (atom.occupancy !== undefined && (!isValidNumber(atom.occupancy) || atom.occupancy < 0 || atom.occupancy > 1)) {
    throw new ValidationError('Atom.occupancy must be a number between 0 and 1 if provided', 'occupancy');
  }
  
  return true;
};

// ============================================================================
// RESIDUE AND CHAIN VALIDATION
// ============================================================================

export const validateResidue = (residue: any): residue is Residue => {
  if (!residue || typeof residue !== 'object') {
    throw new ValidationError('Residue must be an object');
  }
  
  if (!isValidString(residue.id, 1)) {
    throw new ValidationError('Residue.id must be a non-empty string', 'id');
  }
  
  if (!isValidString(residue.name, 1)) {
    throw new ValidationError('Residue.name must be a non-empty string', 'name');
  }
  
  validateAminoAcidType(residue.type);
  
  if (!isValidNumber(residue.position) || residue.position < 1) {
    throw new ValidationError('Residue.position must be a positive number', 'position');
  }
  
  if (!isValidArray(residue.atoms)) {
    throw new ValidationError('Residue.atoms must be an array', 'atoms');
  }
  
  // Validate each atom
  residue.atoms.forEach((atom: any, index: number) => {
    try {
      validateAtom(atom);
    } catch (error) {
      throw new ValidationError(`Invalid atom at index ${index}: ${error.message}`, `atoms[${index}]`);
    }
  });
  
  if (!isValidString(residue.chainId, 1)) {
    throw new ValidationError('Residue.chainId must be a non-empty string', 'chainId');
  }
  
  // Optional angle validation
  if (residue.phi !== undefined && (!isValidNumber(residue.phi) || residue.phi < -180 || residue.phi > 180)) {
    throw new ValidationError('Residue.phi must be a number between -180 and 180 if provided', 'phi');
  }
  
  if (residue.psi !== undefined && (!isValidNumber(residue.psi) || residue.psi < -180 || residue.psi > 180)) {
    throw new ValidationError('Residue.psi must be a number between -180 and 180 if provided', 'psi');
  }
  
  return true;
};

export const validateChain = (chain: any): chain is Chain => {
  if (!chain || typeof chain !== 'object') {
    throw new ValidationError('Chain must be an object');
  }
  
  if (!isValidString(chain.id, 1)) {
    throw new ValidationError('Chain.id must be a non-empty string', 'id');
  }
  
  if (!isValidArray(chain.residues)) {
    throw new ValidationError('Chain.residues must be an array', 'residues');
  }
  
  // Validate each residue
  chain.residues.forEach((residue: any, index: number) => {
    try {
      validateResidue(residue);
    } catch (error) {
      throw new ValidationError(`Invalid residue at index ${index}: ${error.message}`, `residues[${index}]`);
    }
  });
  
  if (!isValidString(chain.sequence)) {
    throw new ValidationError('Chain.sequence must be a string', 'sequence');
  }
  
  // Validate sequence matches residues
  if (chain.sequence.length !== chain.residues.length) {
    throw new ValidationError('Chain.sequence length must match number of residues');
  }
  
  const validChainTypes = ['protein', 'dna', 'rna', 'ligand', 'water'];
  if (!validChainTypes.includes(chain.type)) {
    throw new ValidationError(`Chain.type must be one of: ${validChainTypes.join(', ')}`, 'type');
  }
  
  return true;
};

// ============================================================================
// PROTEIN STRUCTURE VALIDATION
// ============================================================================

export const validateProteinStructure = (protein: any): protein is ProteinStructure => {
  if (!protein || typeof protein !== 'object') {
    throw new ValidationError('ProteinStructure must be an object');
  }
  
  if (!isValidString(protein.id, 1)) {
    throw new ValidationError('ProteinStructure.id must be a non-empty string', 'id');
  }
  
  if (!isValidString(protein.name, 1)) {
    throw new ValidationError('ProteinStructure.name must be a non-empty string', 'name');
  }
  
  if (!isValidString(protein.sequence)) {
    throw new ValidationError('ProteinStructure.sequence must be a string', 'sequence');
  }
  
  if (!isValidArray(protein.atoms)) {
    throw new ValidationError('ProteinStructure.atoms must be an array', 'atoms');
  }
  
  if (!isValidArray(protein.residues)) {
    throw new ValidationError('ProteinStructure.residues must be an array', 'residues');
  }
  
  if (!isValidArray(protein.chains)) {
    throw new ValidationError('ProteinStructure.chains must be an array', 'chains');
  }
  
  if (!isValidArray(protein.secondaryStructure)) {
    throw new ValidationError('ProteinStructure.secondaryStructure must be an array', 'secondaryStructure');
  }
  
  // Validate structural components
  validateBoundingBox(protein.boundingBox);
  validateVector3(protein.centerOfMass);
  
  if (!isValidDate(protein.createdAt)) {
    throw new ValidationError('ProteinStructure.createdAt must be a valid Date', 'createdAt');
  }
  
  if (!isValidDate(protein.updatedAt)) {
    throw new ValidationError('ProteinStructure.updatedAt must be a valid Date', 'updatedAt');
  }
  
  // Validate consistency between components
  const totalResidues = protein.chains.reduce((sum: number, chain: any) => sum + chain.residues.length, 0);
  if (protein.residues.length !== totalResidues) {
    throw new ValidationError('Total residues in chains must match ProteinStructure.residues length');
  }
  
  return true;
};

// ============================================================================
// CHEMICAL PROPERTIES VALIDATION
// ============================================================================

export const validateChemicalProperties = (properties: any): properties is ChemicalProperties => {
  if (!properties || typeof properties !== 'object') {
    throw new ValidationError('ChemicalProperties must be an object');
  }
  
  if (!isValidNumber(properties.molecular_weight) || properties.molecular_weight <= 0) {
    throw new ValidationError('ChemicalProperties.molecular_weight must be a positive number');
  }
  
  if (!isValidArray(properties.hydrophobicity, isValidNumber)) {
    throw new ValidationError('ChemicalProperties.hydrophobicity must be an array of numbers');
  }
  
  if (!isValidArray(properties.charge_distribution, isValidNumber)) {
    throw new ValidationError('ChemicalProperties.charge_distribution must be an array of numbers');
  }
  
  if (!isValidNumber(properties.isoelectric_point) || properties.isoelectric_point < 0 || properties.isoelectric_point > 14) {
    throw new ValidationError('ChemicalProperties.isoelectric_point must be a number between 0 and 14');
  }
  
  return true;
};

// ============================================================================
// AI GENERATION VALIDATION
// ============================================================================

export const validateGenerationConstraints = (constraints: any): constraints is GenerationConstraints => {
  if (!constraints || typeof constraints !== 'object') {
    throw new ValidationError('GenerationConstraints must be an object');
  }
  
  const validModels = ['esm3', 'esm3_chat', 'rfdiffusion', 'protflash'];
  if (!validModels.includes(constraints.model)) {
    throw new ValidationError(`GenerationConstraints.model must be one of: ${validModels.join(', ')}`);
  }
  
  if (constraints.length !== undefined) {
    if (!Array.isArray(constraints.length) || constraints.length.length !== 2) {
      throw new ValidationError('GenerationConstraints.length must be a tuple of two numbers');
    }
    
    const [min, max] = constraints.length;
    if (!isValidNumber(min) || !isValidNumber(max) || min < 1 || max < min) {
      throw new ValidationError('GenerationConstraints.length must be [min, max] where min >= 1 and max >= min');
    }
  }
  
  if (constraints.composition !== undefined) {
    if (typeof constraints.composition !== 'object') {
      throw new ValidationError('GenerationConstraints.composition must be an object');
    }
    
    // Validate composition values are between 0 and 1
    Object.entries(constraints.composition).forEach(([key, value]) => {
      if (!isValidNumber(value as number) || (value as number) < 0 || (value as number) > 1) {
        throw new ValidationError(`GenerationConstraints.composition.${key} must be a number between 0 and 1`);
      }
    });
  }
  
  return true;
};

// ============================================================================
// RENDER OPTIONS VALIDATION
// ============================================================================

export const validateRenderOptions = (options: any): options is RenderOptions => {
  if (!options || typeof options !== 'object') {
    throw new ValidationError('RenderOptions must be an object');
  }
  
  const validColorSchemes = ['cpk', 'hydrophobicity', 'secondary-structure'];
  if (!validColorSchemes.includes(options.colorScheme)) {
    throw new ValidationError(`RenderOptions.colorScheme must be one of: ${validColorSchemes.join(', ')}`);
  }
  
  const validRepresentations = ['cartoon', 'surface', 'ball-stick'];
  if (!validRepresentations.includes(options.representation)) {
    throw new ValidationError(`RenderOptions.representation must be one of: ${validRepresentations.join(', ')}`);
  }
  
  if (typeof options.levelOfDetail !== 'boolean') {
    throw new ValidationError('RenderOptions.levelOfDetail must be a boolean');
  }
  
  const validQualities = ['low', 'medium', 'high'];
  if (!validQualities.includes(options.quality)) {
    throw new ValidationError(`RenderOptions.quality must be one of: ${validQualities.join(', ')}`);
  }
  
  return true;
};

// ============================================================================
// SEQUENCE VALIDATION
// ============================================================================

export const validateProteinSequence = (sequence: string): boolean => {
  if (!isValidString(sequence, 1)) {
    throw new ValidationError('Protein sequence must be a non-empty string');
  }
  
  // Check for valid amino acid characters
  const validChars = Object.values(AminoAcidType).join('');
  const invalidChars = sequence.split('').filter(char => !validChars.includes(char.toUpperCase()));
  
  if (invalidChars.length > 0) {
    throw new ValidationError(`Invalid amino acid characters found: ${[...new Set(invalidChars)].join(', ')}`);
  }
  
  // Check sequence length constraints
  if (sequence.length > 10000) {
    throw new ValidationError('Protein sequence too long (maximum 10,000 residues)');
  }
  
  return true;
};

// ============================================================================
// COMPREHENSIVE VALIDATION FUNCTIONS
// ============================================================================

export const validateProteinData = (data: any): void => {
  try {
    if (data.structure) {
      validateProteinStructure(data.structure);
    }
    
    if (data.sequence) {
      validateProteinSequence(data.sequence);
    }
    
    if (data.properties) {
      validateChemicalProperties(data.properties);
    }
    
    if (data.composition) {
      validateAminoAcidComposition(data.composition);
    }
    
    if (data.constraints) {
      validateGenerationConstraints(data.constraints);
    }
    
    if (data.renderOptions) {
      validateRenderOptions(data.renderOptions);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Validation failed: ${error.message}`);
  }
};

export default {
  ValidationError,
  validateVector3,
  validateBoundingBox,
  validateAminoAcidType,
  validateAminoAcidComposition,
  validateAtom,
  validateResidue,
  validateChain,
  validateProteinStructure,
  validateChemicalProperties,
  validateGenerationConstraints,
  validateRenderOptions,
  validateProteinSequence,
  validateProteinData,
};