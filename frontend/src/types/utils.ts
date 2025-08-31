/**
 * Utility functions for working with protein data structures
 * Provides helper functions for data manipulation and calculations
 */

import {
  Vector3,
  BoundingBox,
  Atom,
  Residue,
  Chain,
  ProteinStructure,
  AminoAcidType,
  AminoAcidProperties,
  SecondaryStructureType,
  ChemicalProperties,
  AminoAcidComposition,
} from './protein';

// ============================================================================
// AMINO ACID PROPERTIES DATABASE
// ============================================================================

export const AMINO_ACID_PROPERTIES: Record<AminoAcidType, AminoAcidProperties> = {
  [AminoAcidType.ALA]: {
    name: 'Alanine',
    threeLetterCode: 'ALA',
    oneLetterCode: AminoAcidType.ALA,
    molecularWeight: 89.09,
    hydrophobicity: 1.8,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aliphatic',
  },
  [AminoAcidType.ARG]: {
    name: 'Arginine',
    threeLetterCode: 'ARG',
    oneLetterCode: AminoAcidType.ARG,
    molecularWeight: 174.20,
    hydrophobicity: -4.5,
    charge: 1,
    polarity: 'charged',
    category: 'basic',
  },
  [AminoAcidType.ASN]: {
    name: 'Asparagine',
    threeLetterCode: 'ASN',
    oneLetterCode: AminoAcidType.ASN,
    molecularWeight: 132.12,
    hydrophobicity: -3.5,
    charge: 0,
    polarity: 'polar',
    category: 'amide',
  },
  [AminoAcidType.ASP]: {
    name: 'Aspartic acid',
    threeLetterCode: 'ASP',
    oneLetterCode: AminoAcidType.ASP,
    molecularWeight: 133.10,
    hydrophobicity: -3.5,
    charge: -1,
    polarity: 'charged',
    category: 'acidic',
  },
  [AminoAcidType.CYS]: {
    name: 'Cysteine',
    threeLetterCode: 'CYS',
    oneLetterCode: AminoAcidType.CYS,
    molecularWeight: 121.15,
    hydrophobicity: 2.5,
    charge: 0,
    polarity: 'polar',
    category: 'sulfur',
  },
  [AminoAcidType.GLN]: {
    name: 'Glutamine',
    threeLetterCode: 'GLN',
    oneLetterCode: AminoAcidType.GLN,
    molecularWeight: 146.15,
    hydrophobicity: -3.5,
    charge: 0,
    polarity: 'polar',
    category: 'amide',
  },
  [AminoAcidType.GLU]: {
    name: 'Glutamic acid',
    threeLetterCode: 'GLU',
    oneLetterCode: AminoAcidType.GLU,
    molecularWeight: 147.13,
    hydrophobicity: -3.5,
    charge: -1,
    polarity: 'charged',
    category: 'acidic',
  },
  [AminoAcidType.GLY]: {
    name: 'Glycine',
    threeLetterCode: 'GLY',
    oneLetterCode: AminoAcidType.GLY,
    molecularWeight: 75.07,
    hydrophobicity: -0.4,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aliphatic',
  },
  [AminoAcidType.HIS]: {
    name: 'Histidine',
    threeLetterCode: 'HIS',
    oneLetterCode: AminoAcidType.HIS,
    molecularWeight: 155.16,
    hydrophobicity: -3.2,
    charge: 0.5,
    polarity: 'charged',
    category: 'basic',
  },
  [AminoAcidType.ILE]: {
    name: 'Isoleucine',
    threeLetterCode: 'ILE',
    oneLetterCode: AminoAcidType.ILE,
    molecularWeight: 131.17,
    hydrophobicity: 4.5,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aliphatic',
  },
  [AminoAcidType.LEU]: {
    name: 'Leucine',
    threeLetterCode: 'LEU',
    oneLetterCode: AminoAcidType.LEU,
    molecularWeight: 131.17,
    hydrophobicity: 3.8,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aliphatic',
  },
  [AminoAcidType.LYS]: {
    name: 'Lysine',
    threeLetterCode: 'LYS',
    oneLetterCode: AminoAcidType.LYS,
    molecularWeight: 146.19,
    hydrophobicity: -3.9,
    charge: 1,
    polarity: 'charged',
    category: 'basic',
  },
  [AminoAcidType.MET]: {
    name: 'Methionine',
    threeLetterCode: 'MET',
    oneLetterCode: AminoAcidType.MET,
    molecularWeight: 149.21,
    hydrophobicity: 1.9,
    charge: 0,
    polarity: 'nonpolar',
    category: 'sulfur',
  },
  [AminoAcidType.PHE]: {
    name: 'Phenylalanine',
    threeLetterCode: 'PHE',
    oneLetterCode: AminoAcidType.PHE,
    molecularWeight: 165.19,
    hydrophobicity: 2.8,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aromatic',
  },
  [AminoAcidType.PRO]: {
    name: 'Proline',
    threeLetterCode: 'PRO',
    oneLetterCode: AminoAcidType.PRO,
    molecularWeight: 115.13,
    hydrophobicity: -1.6,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aliphatic',
  },
  [AminoAcidType.SER]: {
    name: 'Serine',
    threeLetterCode: 'SER',
    oneLetterCode: AminoAcidType.SER,
    molecularWeight: 105.09,
    hydrophobicity: -0.8,
    charge: 0,
    polarity: 'polar',
    category: 'hydroxyl',
  },
  [AminoAcidType.THR]: {
    name: 'Threonine',
    threeLetterCode: 'THR',
    oneLetterCode: AminoAcidType.THR,
    molecularWeight: 119.12,
    hydrophobicity: -0.7,
    charge: 0,
    polarity: 'polar',
    category: 'hydroxyl',
  },
  [AminoAcidType.TRP]: {
    name: 'Tryptophan',
    threeLetterCode: 'TRP',
    oneLetterCode: AminoAcidType.TRP,
    molecularWeight: 204.23,
    hydrophobicity: -0.9,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aromatic',
  },
  [AminoAcidType.TYR]: {
    name: 'Tyrosine',
    threeLetterCode: 'TYR',
    oneLetterCode: AminoAcidType.TYR,
    molecularWeight: 181.19,
    hydrophobicity: -1.3,
    charge: 0,
    polarity: 'polar',
    category: 'aromatic',
  },
  [AminoAcidType.VAL]: {
    name: 'Valine',
    threeLetterCode: 'VAL',
    oneLetterCode: AminoAcidType.VAL,
    molecularWeight: 117.15,
    hydrophobicity: 4.2,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aliphatic',
  },
  [AminoAcidType.UNK]: {
    name: 'Unknown',
    threeLetterCode: 'UNK',
    oneLetterCode: AminoAcidType.UNK,
    molecularWeight: 110.0,
    hydrophobicity: 0,
    charge: 0,
    polarity: 'nonpolar',
    category: 'aliphatic',
  },
};

// ============================================================================
// VECTOR3 UTILITIES
// ============================================================================

export const vector3Utils = {
  /**
   * Create a new Vector3
   */
  create: (x: number, y: number, z: number): Vector3 => ({ x, y, z }),

  /**
   * Add two vectors
   */
  add: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),

  /**
   * Subtract two vectors
   */
  subtract: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),

  /**
   * Multiply vector by scalar
   */
  multiply: (v: Vector3, scalar: number): Vector3 => ({
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar,
  }),

  /**
   * Calculate dot product
   */
  dot: (a: Vector3, b: Vector3): number => a.x * b.x + a.y * b.y + a.z * b.z,

  /**
   * Calculate cross product
   */
  cross: (a: Vector3, b: Vector3): Vector3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),

  /**
   * Calculate vector magnitude
   */
  magnitude: (v: Vector3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),

  /**
   * Normalize vector
   */
  normalize: (v: Vector3): Vector3 => {
    const mag = vector3Utils.magnitude(v);
    return mag > 0 ? vector3Utils.multiply(v, 1 / mag) : { x: 0, y: 0, z: 0 };
  },

  /**
   * Calculate distance between two points
   */
  distance: (a: Vector3, b: Vector3): number => vector3Utils.magnitude(vector3Utils.subtract(a, b)),

  /**
   * Calculate center point of multiple vectors
   */
  center: (vectors: Vector3[]): Vector3 => {
    if (vectors.length === 0) return { x: 0, y: 0, z: 0 };
    
    const sum = vectors.reduce(
      (acc, v) => vector3Utils.add(acc, v),
      { x: 0, y: 0, z: 0 }
    );
    
    return vector3Utils.multiply(sum, 1 / vectors.length);
  },
};

// ============================================================================
// BOUNDING BOX UTILITIES
// ============================================================================

export const boundingBoxUtils = {
  /**
   * Create bounding box from array of points
   */
  fromPoints: (points: Vector3[]): BoundingBox => {
    if (points.length === 0) {
      const zero = { x: 0, y: 0, z: 0 };
      return { min: zero, max: zero, center: zero, size: zero };
    }

    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };

    points.forEach(point => {
      min.x = Math.min(min.x, point.x);
      min.y = Math.min(min.y, point.y);
      min.z = Math.min(min.z, point.z);
      max.x = Math.max(max.x, point.x);
      max.y = Math.max(max.y, point.y);
      max.z = Math.max(max.z, point.z);
    });

    const center = vector3Utils.multiply(vector3Utils.add(min, max), 0.5);
    const size = vector3Utils.subtract(max, min);

    return { min, max, center, size };
  },

  /**
   * Check if point is inside bounding box
   */
  containsPoint: (bbox: BoundingBox, point: Vector3): boolean => {
    return (
      point.x >= bbox.min.x && point.x <= bbox.max.x &&
      point.y >= bbox.min.y && point.y <= bbox.max.y &&
      point.z >= bbox.min.z && point.z <= bbox.max.z
    );
  },

  /**
   * Expand bounding box by margin
   */
  expand: (bbox: BoundingBox, margin: number): BoundingBox => {
    const marginVec = { x: margin, y: margin, z: margin };
    const min = vector3Utils.subtract(bbox.min, marginVec);
    const max = vector3Utils.add(bbox.max, marginVec);
    const center = vector3Utils.multiply(vector3Utils.add(min, max), 0.5);
    const size = vector3Utils.subtract(max, min);
    
    return { min, max, center, size };
  },
};

// ============================================================================
// SEQUENCE UTILITIES
// ============================================================================

export const sequenceUtils = {
  /**
   * Convert three-letter codes to one-letter codes
   */
  threeToOne: (threeLetterSequence: string[]): string => {
    return threeLetterSequence
      .map(code => {
        const entry = Object.values(AMINO_ACID_PROPERTIES).find(
          prop => prop.threeLetterCode === code.toUpperCase()
        );
        return entry ? entry.oneLetterCode : AminoAcidType.UNK;
      })
      .join('');
  },

  /**
   * Convert one-letter codes to three-letter codes
   */
  oneToThree: (oneLetterSequence: string): string[] => {
    return oneLetterSequence
      .split('')
      .map(code => {
        const aminoAcid = code.toUpperCase() as AminoAcidType;
        const properties = AMINO_ACID_PROPERTIES[aminoAcid];
        return properties ? properties.threeLetterCode : 'UNK';
      });
  },

  /**
   * Calculate amino acid composition
   */
  calculateComposition: (sequence: string): AminoAcidComposition => {
    const composition: Record<string, number> = {};
    const totalResidues = sequence.length;

    // Count each amino acid
    sequence.split('').forEach(aa => {
      const upperAA = aa.toUpperCase();
      composition[upperAA] = (composition[upperAA] || 0) + 1;
    });

    // Calculate percentages
    const percentages: Record<string, number> = {};
    Object.entries(composition).forEach(([aa, count]) => {
      percentages[aa] = (count / totalResidues) * 100;
    });

    return {
      composition,
      percentages,
      total_residues: totalResidues,
    };
  },

  /**
   * Calculate molecular weight from sequence
   */
  calculateMolecularWeight: (sequence: string): number => {
    let weight = 18.015; // Water molecule (H2O) for peptide bond formation

    sequence.split('').forEach(aa => {
      const aminoAcid = aa.toUpperCase() as AminoAcidType;
      const properties = AMINO_ACID_PROPERTIES[aminoAcid];
      if (properties) {
        weight += properties.molecularWeight;
      }
    });

    // Subtract water molecules for peptide bonds
    weight -= (sequence.length - 1) * 18.015;

    return weight;
  },

  /**
   * Calculate hydrophobicity profile
   */
  calculateHydrophobicity: (sequence: string, windowSize = 1): number[] => {
    const profile: number[] = [];

    for (let i = 0; i <= sequence.length - windowSize; i++) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        const aa = sequence[i + j].toUpperCase() as AminoAcidType;
        const properties = AMINO_ACID_PROPERTIES[aa];
        if (properties) {
          sum += properties.hydrophobicity;
        }
      }
      profile.push(sum / windowSize);
    }

    return profile;
  },

  /**
   * Calculate charge distribution
   */
  calculateChargeDistribution: (sequence: string): number[] => {
    return sequence.split('').map(aa => {
      const aminoAcid = aa.toUpperCase() as AminoAcidType;
      const properties = AMINO_ACID_PROPERTIES[aminoAcid];
      return properties ? properties.charge : 0;
    });
  },

  /**
   * Estimate isoelectric point (simplified calculation)
   */
  calculateIsoelectricPoint: (sequence: string): number => {
    let positiveCharges = 0;
    let negativeCharges = 0;

    sequence.split('').forEach(aa => {
      const aminoAcid = aa.toUpperCase() as AminoAcidType;
      const properties = AMINO_ACID_PROPERTIES[aminoAcid];
      if (properties) {
        if (properties.charge > 0) positiveCharges += properties.charge;
        if (properties.charge < 0) negativeCharges += Math.abs(properties.charge);
      }
    });

    // Simplified calculation - in reality, this requires more complex pKa calculations
    const netCharge = positiveCharges - negativeCharges;
    return 7.0 + (netCharge * 0.5); // Rough approximation
  },
};

// ============================================================================
// PROTEIN STRUCTURE UTILITIES
// ============================================================================

export const proteinUtils = {
  /**
   * Calculate center of mass for protein structure
   */
  calculateCenterOfMass: (atoms: Atom[]): Vector3 => {
    if (atoms.length === 0) return { x: 0, y: 0, z: 0 };

    const positions = atoms.map(atom => atom.position);
    return vector3Utils.center(positions);
  },

  /**
   * Calculate radius of gyration
   */
  calculateRadiusOfGyration: (atoms: Atom[]): number => {
    if (atoms.length === 0) return 0;

    const centerOfMass = proteinUtils.calculateCenterOfMass(atoms);
    const sumSquaredDistances = atoms.reduce((sum, atom) => {
      const distance = vector3Utils.distance(atom.position, centerOfMass);
      return sum + distance * distance;
    }, 0);

    return Math.sqrt(sumSquaredDistances / atoms.length);
  },

  /**
   * Get atoms by chain ID
   */
  getAtomsByChain: (atoms: Atom[], chainId: string): Atom[] => {
    return atoms.filter(atom => atom.chainId === chainId);
  },

  /**
   * Get atoms by residue ID
   */
  getAtomsByResidue: (atoms: Atom[], residueId: string): Atom[] => {
    return atoms.filter(atom => atom.residueId === residueId);
  },

  /**
   * Get backbone atoms only
   */
  getBackboneAtoms: (atoms: Atom[]): Atom[] => {
    return atoms.filter(atom => atom.atomType === 'backbone');
  },

  /**
   * Get sidechain atoms only
   */
  getSidechainAtoms: (atoms: Atom[]): Atom[] => {
    return atoms.filter(atom => atom.atomType === 'sidechain');
  },

  /**
   * Calculate chemical properties from sequence
   */
  calculateChemicalProperties: (sequence: string): ChemicalProperties => {
    const molecularWeight = sequenceUtils.calculateMolecularWeight(sequence);
    const hydrophobicity = sequenceUtils.calculateHydrophobicity(sequence);
    const chargeDistribution = sequenceUtils.calculateChargeDistribution(sequence);
    const isoelectricPoint = sequenceUtils.calculateIsoelectricPoint(sequence);
    
    return {
      molecularWeight,
      molecular_weight: molecularWeight,
      hydrophobicity,
      chargeDistribution,
      charge_distribution: chargeDistribution,
      isoelectricPoint,
      isoelectric_point: isoelectricPoint,
    };
  },

  /**
   * Create a minimal protein structure from sequence
   */
  createFromSequence: (id: string, name: string, sequence: string): Partial<ProteinStructure> => {
    const composition = sequenceUtils.calculateComposition(sequence);
    const properties = proteinUtils.calculateChemicalProperties(sequence);
    
    return {
      id,
      name,
      sequence,
      atoms: [],
      residues: [],
      chains: [],
      secondaryStructure: [],
      metadata: {
        title: name,
        classification: 'Generated',
        method: 'OTHER',
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
        center: { x: 0, y: 0, z: 0 },
        size: { x: 0, y: 0, z: 0 },
      },
      centerOfMass: { x: 0, y: 0, z: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export default {
  AMINO_ACID_PROPERTIES,
  vector3Utils,
  boundingBoxUtils,
  sequenceUtils,
  proteinUtils,
};