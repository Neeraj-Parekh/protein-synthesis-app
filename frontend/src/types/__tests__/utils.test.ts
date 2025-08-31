/**
 * Unit tests for protein utility functions
 */

import {
  AMINO_ACID_PROPERTIES,
  vector3Utils,
  boundingBoxUtils,
  sequenceUtils,
  proteinUtils,
} from '../utils';

import { AminoAcidType, Vector3, Atom } from '../protein';

describe('Protein Utilities', () => {
  
  // ============================================================================
  // VECTOR3 UTILITIES TESTS
  // ============================================================================
  
  describe('vector3Utils', () => {
    const v1: Vector3 = { x: 1, y: 2, z: 3 };
    const v2: Vector3 = { x: 4, y: 5, z: 6 };
    
    it('should create vectors correctly', () => {
      const v = vector3Utils.create(1, 2, 3);
      expect(v).toEqual({ x: 1, y: 2, z: 3 });
    });
    
    it('should add vectors correctly', () => {
      const result = vector3Utils.add(v1, v2);
      expect(result).toEqual({ x: 5, y: 7, z: 9 });
    });
    
    it('should subtract vectors correctly', () => {
      const result = vector3Utils.subtract(v2, v1);
      expect(result).toEqual({ x: 3, y: 3, z: 3 });
    });
    
    it('should multiply vector by scalar correctly', () => {
      const result = vector3Utils.multiply(v1, 2);
      expect(result).toEqual({ x: 2, y: 4, z: 6 });
    });
    
    it('should calculate dot product correctly', () => {
      const result = vector3Utils.dot(v1, v2);
      expect(result).toBe(32); // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    });
    
    it('should calculate cross product correctly', () => {
      const result = vector3Utils.cross(v1, v2);
      expect(result).toEqual({ x: -3, y: 6, z: -3 });
    });
    
    it('should calculate magnitude correctly', () => {
      const result = vector3Utils.magnitude(v1);
      expect(result).toBeCloseTo(Math.sqrt(14), 5);
    });
    
    it('should normalize vectors correctly', () => {
      const result = vector3Utils.normalize(v1);
      const magnitude = vector3Utils.magnitude(result);
      expect(magnitude).toBeCloseTo(1, 5);
    });
    
    it('should calculate distance correctly', () => {
      const result = vector3Utils.distance(v1, v2);
      expect(result).toBeCloseTo(Math.sqrt(27), 5);
    });
    
    it('should calculate center of vectors correctly', () => {
      const vectors = [v1, v2, { x: 7, y: 8, z: 9 }];
      const result = vector3Utils.center(vectors);
      expect(result).toEqual({ x: 4, y: 5, z: 6 });
    });
    
    it('should handle empty array for center calculation', () => {
      const result = vector3Utils.center([]);
      expect(result).toEqual({ x: 0, y: 0, z: 0 });
    });
  });
  
  // ============================================================================
  // BOUNDING BOX UTILITIES TESTS
  // ============================================================================
  
  describe('boundingBoxUtils', () => {
    const points: Vector3[] = [
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 },
      { x: -1, y: 0, z: 2 },
    ];
    
    it('should create bounding box from points correctly', () => {
      const bbox = boundingBoxUtils.fromPoints(points);
      
      expect(bbox.min).toEqual({ x: -1, y: 0, z: 2 });
      expect(bbox.max).toEqual({ x: 4, y: 5, z: 6 });
      expect(bbox.center).toEqual({ x: 1.5, y: 2.5, z: 4 });
      expect(bbox.size).toEqual({ x: 5, y: 5, z: 4 });
    });
    
    it('should handle empty points array', () => {
      const bbox = boundingBoxUtils.fromPoints([]);
      const zero = { x: 0, y: 0, z: 0 };
      
      expect(bbox.min).toEqual(zero);
      expect(bbox.max).toEqual(zero);
      expect(bbox.center).toEqual(zero);
      expect(bbox.size).toEqual(zero);
    });
    
    it('should check if point is inside bounding box', () => {
      const bbox = boundingBoxUtils.fromPoints(points);
      
      expect(boundingBoxUtils.containsPoint(bbox, { x: 2, y: 3, z: 4 })).toBe(true);
      expect(boundingBoxUtils.containsPoint(bbox, { x: 5, y: 3, z: 4 })).toBe(false);
      expect(boundingBoxUtils.containsPoint(bbox, { x: 2, y: -1, z: 4 })).toBe(false);
    });
    
    it('should expand bounding box correctly', () => {
      const bbox = boundingBoxUtils.fromPoints(points);
      const expanded = boundingBoxUtils.expand(bbox, 1);
      
      expect(expanded.min).toEqual({ x: -2, y: -1, z: 1 });
      expect(expanded.max).toEqual({ x: 5, y: 6, z: 7 });
    });
  });
  
  // ============================================================================
  // SEQUENCE UTILITIES TESTS
  // ============================================================================
  
  describe('sequenceUtils', () => {
    const testSequence = 'MGKV';
    
    it('should convert three-letter codes to one-letter codes', () => {
      const threeLetter = ['MET', 'GLY', 'LYS', 'VAL'];
      const result = sequenceUtils.threeToOne(threeLetter);
      expect(result).toBe('MGKV');
    });
    
    it('should convert one-letter codes to three-letter codes', () => {
      const result = sequenceUtils.oneToThree(testSequence);
      expect(result).toEqual(['MET', 'GLY', 'LYS', 'VAL']);
    });
    
    it('should handle unknown amino acids in conversion', () => {
      const result = sequenceUtils.oneToThree('XZ');
      expect(result).toEqual(['UNK', 'UNK']);
    });
    
    it('should calculate amino acid composition correctly', () => {
      const composition = sequenceUtils.calculateComposition('AAAG');
      
      expect(composition.composition).toEqual({ A: 3, G: 1 });
      expect(composition.percentages).toEqual({ A: 75, G: 25 });
      expect(composition.total_residues).toBe(4);
    });
    
    it('should calculate molecular weight correctly', () => {
      const weight = sequenceUtils.calculateMolecularWeight('AA');
      // 2 * Alanine (89.09) + H2O (18.015) - 1 * H2O (peptide bond) = 178.18 + 18.015 - 18.015 = 178.18
      expect(weight).toBeCloseTo(178.18, 1);
    });
    
    it('should calculate hydrophobicity profile', () => {
      const profile = sequenceUtils.calculateHydrophobicity('AG', 1);
      const expectedA = AMINO_ACID_PROPERTIES[AminoAcidType.ALA].hydrophobicity;
      const expectedG = AMINO_ACID_PROPERTIES[AminoAcidType.GLY].hydrophobicity;
      
      expect(profile).toEqual([expectedA, expectedG]);
    });
    
    it('should calculate hydrophobicity profile with window size', () => {
      const profile = sequenceUtils.calculateHydrophobicity('AAG', 2);
      const expectedA = AMINO_ACID_PROPERTIES[AminoAcidType.ALA].hydrophobicity;
      const expectedG = AMINO_ACID_PROPERTIES[AminoAcidType.GLY].hydrophobicity;
      const avgAA = expectedA; // A + A / 2
      const avgAG = (expectedA + expectedG) / 2; // A + G / 2
      
      expect(profile).toEqual([avgAA, avgAG]);
    });
    
    it('should calculate charge distribution correctly', () => {
      const charges = sequenceUtils.calculateChargeDistribution('RD');
      const expectedR = AMINO_ACID_PROPERTIES[AminoAcidType.ARG].charge;
      const expectedD = AMINO_ACID_PROPERTIES[AminoAcidType.ASP].charge;
      
      expect(charges).toEqual([expectedR, expectedD]);
    });
    
    it('should calculate isoelectric point', () => {
      const pI = sequenceUtils.calculateIsoelectricPoint('RD');
      expect(typeof pI).toBe('number');
      expect(pI).toBeGreaterThan(0);
      expect(pI).toBeLessThan(14);
    });
  });
  
  // ============================================================================
  // PROTEIN UTILITIES TESTS
  // ============================================================================
  
  describe('proteinUtils', () => {
    const mockAtoms: Atom[] = [
      {
        id: 1,
        name: 'CA',
        element: 'C',
        position: { x: 1, y: 2, z: 3 },
        residueId: 'A1',
        chainId: 'A',
        atomType: 'backbone',
      },
      {
        id: 2,
        name: 'CB',
        element: 'C',
        position: { x: 4, y: 5, z: 6 },
        residueId: 'A1',
        chainId: 'A',
        atomType: 'sidechain',
      },
      {
        id: 3,
        name: 'CA',
        element: 'C',
        position: { x: 7, y: 8, z: 9 },
        residueId: 'B2',
        chainId: 'B',
        atomType: 'backbone',
      },
    ];
    
    it('should calculate center of mass correctly', () => {
      const center = proteinUtils.calculateCenterOfMass(mockAtoms);
      expect(center).toEqual({ x: 4, y: 5, z: 6 });
    });
    
    it('should handle empty atoms array for center of mass', () => {
      const center = proteinUtils.calculateCenterOfMass([]);
      expect(center).toEqual({ x: 0, y: 0, z: 0 });
    });
    
    it('should calculate radius of gyration', () => {
      const radius = proteinUtils.calculateRadiusOfGyration(mockAtoms);
      expect(typeof radius).toBe('number');
      expect(radius).toBeGreaterThan(0);
    });
    
    it('should filter atoms by chain ID', () => {
      const chainAAtoms = proteinUtils.getAtomsByChain(mockAtoms, 'A');
      expect(chainAAtoms).toHaveLength(2);
      expect(chainAAtoms.every(atom => atom.chainId === 'A')).toBe(true);
    });
    
    it('should filter atoms by residue ID', () => {
      const residueA1Atoms = proteinUtils.getAtomsByResidue(mockAtoms, 'A1');
      expect(residueA1Atoms).toHaveLength(2);
      expect(residueA1Atoms.every(atom => atom.residueId === 'A1')).toBe(true);
    });
    
    it('should filter backbone atoms', () => {
      const backboneAtoms = proteinUtils.getBackboneAtoms(mockAtoms);
      expect(backboneAtoms).toHaveLength(2);
      expect(backboneAtoms.every(atom => atom.atomType === 'backbone')).toBe(true);
    });
    
    it('should filter sidechain atoms', () => {
      const sidechainAtoms = proteinUtils.getSidechainAtoms(mockAtoms);
      expect(sidechainAtoms).toHaveLength(1);
      expect(sidechainAtoms.every(atom => atom.atomType === 'sidechain')).toBe(true);
    });
    
    it('should calculate chemical properties from sequence', () => {
      const properties = proteinUtils.calculateChemicalProperties('MGKV');
      
      expect(properties.molecular_weight).toBeGreaterThan(0);
      expect(Array.isArray(properties.hydrophobicity)).toBe(true);
      expect(Array.isArray(properties.charge_distribution)).toBe(true);
      expect(typeof properties.isoelectric_point).toBe('number');
    });
    
    it('should create protein structure from sequence', () => {
      const protein = proteinUtils.createFromSequence('test-1', 'Test Protein', 'MGKV');
      
      expect(protein.id).toBe('test-1');
      expect(protein.name).toBe('Test Protein');
      expect(protein.sequence).toBe('MGKV');
      expect(protein.atoms).toEqual([]);
      expect(protein.residues).toEqual([]);
      expect(protein.chains).toEqual([]);
      expect(protein.metadata?.title).toBe('Test Protein');
      expect(protein.createdAt).toBeInstanceOf(Date);
      expect(protein.updatedAt).toBeInstanceOf(Date);
    });
  });
  
  // ============================================================================
  // AMINO ACID PROPERTIES TESTS
  // ============================================================================
  
  describe('AMINO_ACID_PROPERTIES', () => {
    it('should contain all standard amino acids', () => {
      const expectedAminoAcids = Object.values(AminoAcidType);
      const actualAminoAcids = Object.keys(AMINO_ACID_PROPERTIES);
      
      expect(actualAminoAcids).toHaveLength(expectedAminoAcids.length);
      expectedAminoAcids.forEach(aa => {
        expect(AMINO_ACID_PROPERTIES[aa]).toBeDefined();
      });
    });
    
    it('should have consistent properties for each amino acid', () => {
      Object.entries(AMINO_ACID_PROPERTIES).forEach(([key, properties]) => {
        expect(properties.name).toBeTruthy();
        expect(properties.threeLetterCode).toBeTruthy();
        expect(properties.oneLetterCode).toBe(key);
        expect(typeof properties.molecularWeight).toBe('number');
        expect(properties.molecularWeight).toBeGreaterThan(0);
        expect(typeof properties.hydrophobicity).toBe('number');
        expect(typeof properties.charge).toBe('number');
        expect(['polar', 'nonpolar', 'charged']).toContain(properties.polarity);
        expect(['aliphatic', 'aromatic', 'basic', 'acidic', 'hydroxyl', 'sulfur', 'amide']).toContain(properties.category);
      });
    });
    
    it('should have correct properties for specific amino acids', () => {
      // Test a few specific amino acids
      expect(AMINO_ACID_PROPERTIES[AminoAcidType.GLY].name).toBe('Glycine');
      expect(AMINO_ACID_PROPERTIES[AminoAcidType.GLY].threeLetterCode).toBe('GLY');
      expect(AMINO_ACID_PROPERTIES[AminoAcidType.ARG].charge).toBe(1);
      expect(AMINO_ACID_PROPERTIES[AminoAcidType.ASP].charge).toBe(-1);
      expect(AMINO_ACID_PROPERTIES[AminoAcidType.ALA].polarity).toBe('nonpolar');
    });
  });
});