/**
 * Unit tests for protein data validation functions
 */

import {
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
} from '../validation';

import {
  AminoAcidType,
  Vector3,
  BoundingBox,
  Atom,
  Residue,
  Chain,
  ProteinStructure,
  ChemicalProperties,
  AminoAcidComposition,
  GenerationConstraints,
  RenderOptions,
} from '../protein';

describe('Protein Data Validation', () => {
  
  // ============================================================================
  // GEOMETRIC VALIDATION TESTS
  // ============================================================================
  
  describe('validateVector3', () => {
    it('should validate a correct Vector3', () => {
      const vector: Vector3 = { x: 1.0, y: 2.0, z: 3.0 };
      expect(() => validateVector3(vector)).not.toThrow();
    });
    
    it('should reject invalid Vector3 objects', () => {
      expect(() => validateVector3(null)).toThrow(ValidationError);
      expect(() => validateVector3({})).toThrow(ValidationError);
      expect(() => validateVector3({ x: 1, y: 2 })).toThrow(ValidationError);
      expect(() => validateVector3({ x: 'invalid', y: 2, z: 3 })).toThrow(ValidationError);
      expect(() => validateVector3({ x: NaN, y: 2, z: 3 })).toThrow(ValidationError);
      expect(() => validateVector3({ x: Infinity, y: 2, z: 3 })).toThrow(ValidationError);
    });
  });
  
  describe('validateBoundingBox', () => {
    it('should validate a correct BoundingBox', () => {
      const bbox: BoundingBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 10 },
        center: { x: 5, y: 5, z: 5 },
        size: { x: 10, y: 10, z: 10 },
      };
      expect(() => validateBoundingBox(bbox)).not.toThrow();
    });
    
    it('should reject BoundingBox with min > max', () => {
      const bbox = {
        min: { x: 10, y: 0, z: 0 },
        max: { x: 0, y: 10, z: 10 },
        center: { x: 5, y: 5, z: 5 },
        size: { x: 10, y: 10, z: 10 },
      };
      expect(() => validateBoundingBox(bbox)).toThrow(ValidationError);
    });
  });
  
  // ============================================================================
  // AMINO ACID VALIDATION TESTS
  // ============================================================================
  
  describe('validateAminoAcidType', () => {
    it('should validate correct amino acid types', () => {
      expect(() => validateAminoAcidType(AminoAcidType.ALA)).not.toThrow();
      expect(() => validateAminoAcidType('A')).not.toThrow();
      expect(() => validateAminoAcidType('G')).not.toThrow();
    });
    
    it('should reject invalid amino acid types', () => {
      expect(() => validateAminoAcidType('Z')).toThrow(ValidationError);
      expect(() => validateAminoAcidType('')).toThrow(ValidationError);
      expect(() => validateAminoAcidType(null)).toThrow(ValidationError);
      expect(() => validateAminoAcidType(123)).toThrow(ValidationError);
    });
  });
  
  describe('validateAminoAcidComposition', () => {
    it('should validate correct amino acid composition', () => {
      const composition: AminoAcidComposition = {
        composition: { A: 10, G: 5, L: 15 },
        percentages: { A: 33.33, G: 16.67, L: 50.0 },
        total_residues: 30,
      };
      expect(() => validateAminoAcidComposition(composition)).not.toThrow();
    });
    
    it('should reject composition with invalid percentage sum', () => {
      const composition = {
        composition: { A: 10, G: 5 },
        percentages: { A: 60, G: 30 }, // Sum = 90, not 100
        total_residues: 15,
      };
      expect(() => validateAminoAcidComposition(composition)).toThrow(ValidationError);
    });
    
    it('should reject composition with negative total_residues', () => {
      const composition = {
        composition: { A: 10 },
        percentages: { A: 100 },
        total_residues: -5,
      };
      expect(() => validateAminoAcidComposition(composition)).toThrow(ValidationError);
    });
  });
  
  // ============================================================================
  // ATOMIC STRUCTURE VALIDATION TESTS
  // ============================================================================
  
  describe('validateAtom', () => {
    it('should validate a correct Atom', () => {
      const atom: Atom = {
        id: 1,
        name: 'CA',
        element: 'C',
        position: { x: 1.0, y: 2.0, z: 3.0 },
        residueId: 'A1',
        chainId: 'A',
        atomType: 'backbone',
      };
      expect(() => validateAtom(atom)).not.toThrow();
    });
    
    it('should reject Atom with invalid atomType', () => {
      const atom = {
        id: 1,
        name: 'CA',
        element: 'C',
        position: { x: 1.0, y: 2.0, z: 3.0 },
        residueId: 'A1',
        chainId: 'A',
        atomType: 'invalid',
      };
      expect(() => validateAtom(atom)).toThrow(ValidationError);
    });
    
    it('should reject Atom with invalid occupancy', () => {
      const atom = {
        id: 1,
        name: 'CA',
        element: 'C',
        position: { x: 1.0, y: 2.0, z: 3.0 },
        residueId: 'A1',
        chainId: 'A',
        atomType: 'backbone',
        occupancy: 1.5, // Invalid: > 1
      };
      expect(() => validateAtom(atom)).toThrow(ValidationError);
    });
  });
  
  // ============================================================================
  // CHEMICAL PROPERTIES VALIDATION TESTS
  // ============================================================================
  
  describe('validateChemicalProperties', () => {
    it('should validate correct chemical properties', () => {
      const properties: ChemicalProperties = {
        molecularWeight: 15000.5,
        molecular_weight: 15000.5,
        hydrophobicity: [0.1, 0.2, -0.3, 0.4],
        chargeDistribution: [1, -1, 0, 0.5],
        charge_distribution: [1, -1, 0, 0.5],
        isoelectricPoint: 7.4,
        isoelectric_point: 7.4,
      };
      expect(() => validateChemicalProperties(properties)).not.toThrow();
    });
    
    it('should reject properties with invalid molecular weight', () => {
      const properties = {
        molecular_weight: -100, // Invalid: negative
        hydrophobicity: [0.1, 0.2],
        charge_distribution: [1, -1],
        isoelectric_point: 7.4,
      };
      expect(() => validateChemicalProperties(properties)).toThrow(ValidationError);
    });
    
    it('should reject properties with invalid isoelectric point', () => {
      const properties = {
        molecular_weight: 15000,
        hydrophobicity: [0.1, 0.2],
        charge_distribution: [1, -1],
        isoelectric_point: 15, // Invalid: > 14
      };
      expect(() => validateChemicalProperties(properties)).toThrow(ValidationError);
    });
    
    it('should reject properties with non-array hydrophobicity', () => {
      const properties = {
        molecular_weight: 15000,
        hydrophobicity: 'invalid', // Should be array
        charge_distribution: [1, -1],
        isoelectric_point: 7.4,
      };
      expect(() => validateChemicalProperties(properties)).toThrow(ValidationError);
    });
  });
  
  // ============================================================================
  // AI GENERATION VALIDATION TESTS
  // ============================================================================
  
  describe('validateGenerationConstraints', () => {
    it('should validate correct generation constraints', () => {
      const constraints: GenerationConstraints = {
        length: [50, 200],
        composition: { A: 0.1, G: 0.2 },
        model: 'protflash',
      };
      expect(() => validateGenerationConstraints(constraints)).not.toThrow();
    });
    
    it('should reject constraints with invalid model', () => {
      const constraints = {
        model: 'invalid-model',
      };
      expect(() => validateGenerationConstraints(constraints)).toThrow(ValidationError);
    });
    
    it('should reject constraints with invalid length range', () => {
      const constraints = {
        length: [200, 50], // Invalid: min > max
        model: 'protflash',
      };
      expect(() => validateGenerationConstraints(constraints)).toThrow(ValidationError);
    });
    
    it('should reject constraints with invalid composition values', () => {
      const constraints = {
        composition: { A: 1.5 }, // Invalid: > 1
        model: 'protflash',
      };
      expect(() => validateGenerationConstraints(constraints)).toThrow(ValidationError);
    });
  });
  
  // ============================================================================
  // RENDER OPTIONS VALIDATION TESTS
  // ============================================================================
  
  describe('validateRenderOptions', () => {
    it('should validate correct render options', () => {
      const options: RenderOptions = {
        colorScheme: 'cpk',
        representation: 'cartoon',
        levelOfDetail: true,
        quality: 'high',
      };
      expect(() => validateRenderOptions(options)).not.toThrow();
    });
    
    it('should reject options with invalid color scheme', () => {
      const options = {
        colorScheme: 'invalid',
        representation: 'cartoon',
        levelOfDetail: true,
        quality: 'high',
      };
      expect(() => validateRenderOptions(options)).toThrow(ValidationError);
    });
    
    it('should reject options with invalid representation', () => {
      const options = {
        colorScheme: 'cpk',
        representation: 'invalid',
        levelOfDetail: true,
        quality: 'high',
      };
      expect(() => validateRenderOptions(options)).toThrow(ValidationError);
    });
    
    it('should reject options with non-boolean levelOfDetail', () => {
      const options = {
        colorScheme: 'cpk',
        representation: 'cartoon',
        levelOfDetail: 'true', // Should be boolean
        quality: 'high',
      };
      expect(() => validateRenderOptions(options)).toThrow(ValidationError);
    });
  });
  
  // ============================================================================
  // SEQUENCE VALIDATION TESTS
  // ============================================================================
  
  describe('validateProteinSequence', () => {
    it('should validate correct protein sequences', () => {
      expect(() => validateProteinSequence('ACDEFGHIKLMNPQRSTVWY')).not.toThrow();
      expect(() => validateProteinSequence('MGKV')).not.toThrow();
      expect(() => validateProteinSequence('acdefg')).not.toThrow(); // Should handle lowercase
    });
    
    it('should reject sequences with invalid characters', () => {
      expect(() => validateProteinSequence('ACDEFZ')).toThrow(ValidationError);
      expect(() => validateProteinSequence('ACG123')).toThrow(ValidationError);
      expect(() => validateProteinSequence('AC-DEF')).toThrow(ValidationError);
    });
    
    it('should reject empty sequences', () => {
      expect(() => validateProteinSequence('')).toThrow(ValidationError);
    });
    
    it('should reject extremely long sequences', () => {
      const longSequence = 'A'.repeat(10001);
      expect(() => validateProteinSequence(longSequence)).toThrow(ValidationError);
    });
  });
  
  // ============================================================================
  // COMPREHENSIVE VALIDATION TESTS
  // ============================================================================
  
  describe('validateProteinData', () => {
    it('should validate complete protein data', () => {
      const data = {
        sequence: 'MGKV',
        properties: {
          molecular_weight: 1000,
          hydrophobicity: [0.1, 0.2],
          charge_distribution: [1, -1],
          isoelectric_point: 7.0,
        },
        composition: {
          composition: { M: 1, G: 1, K: 1, V: 1 },
          percentages: { M: 25, G: 25, K: 25, V: 25 },
          total_residues: 4,
        },
        constraints: {
          model: 'protflash' as const,
          length: [10, 100] as [number, number],
        },
        renderOptions: {
          colorScheme: 'cpk' as const,
          representation: 'cartoon' as const,
          levelOfDetail: true,
          quality: 'high' as const,
        },
      };
      
      expect(() => validateProteinData(data)).not.toThrow();
    });
    
    it('should handle partial data validation', () => {
      const data = {
        sequence: 'MGKV',
        properties: {
          molecular_weight: 1000,
          hydrophobicity: [0.1, 0.2],
          charge_distribution: [1, -1],
          isoelectric_point: 7.0,
        },
      };
      
      expect(() => validateProteinData(data)).not.toThrow();
    });
    
    it('should reject data with invalid components', () => {
      const data = {
        sequence: 'INVALID123',
        properties: {
          molecular_weight: -100, // Invalid
          hydrophobicity: [0.1, 0.2],
          charge_distribution: [1, -1],
          isoelectric_point: 7.0,
        },
      };
      
      expect(() => validateProteinData(data)).toThrow(ValidationError);
    });
  });
  
  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  
  describe('ValidationError', () => {
    it('should create ValidationError with message and field', () => {
      const error = new ValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.name).toBe('ValidationError');
    });
    
    it('should create ValidationError with just message', () => {
      const error = new ValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.field).toBeUndefined();
    });
  });
});