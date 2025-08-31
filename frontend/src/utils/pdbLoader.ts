/**
 * PDB file loader and parser utilities
 */
import { 
  ProteinStructure, 
  Atom, 
  Residue, 
  Chain, 
  ProteinMetadata,
  AminoAcidType,
  SecondaryStructureType,
  SecondaryStructure
} from '../types';
import { AMINO_ACID_PROPERTIES, boundingBoxUtils, vector3Utils } from '../types/utils';

export interface PDBParseOptions {
  includeHydrogens?: boolean;
  includeWater?: boolean;
  includeHetero?: boolean;
  modelIndex?: number;
}

export class PDBParseError extends Error {
  constructor(message: string, public line?: number) {
    super(message);
    this.name = 'PDBParseError';
  }
}

/**
 * Parse PDB file content into ProteinStructure
 */
export async function parsePDBFile(
  pdbContent: string, 
  options: PDBParseOptions = {}
): Promise<ProteinStructure> {
  const {
    includeHydrogens = false,
    includeWater = false,
    includeHetero = true,
    modelIndex = 0
  } = options;

  try {
    // Validate input
    if (!pdbContent || pdbContent.trim().length === 0) {
      throw new PDBParseError('PDB content cannot be empty');
    }

    const lines = pdbContent.split('\n');
    const atoms: Atom[] = [];
    const residues: Map<string, Residue> = new Map();
    const chains: Map<string, Chain> = new Map();
    const metadata: ProteinMetadata = {};
    const secondaryStructures: SecondaryStructure[] = [];

    let currentModel = 0;
    let inModel = modelIndex === 0;
    let atomId = 1;
    let proteinId = '';
    let proteinName = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const recordType = line.substring(0, 6).trim();

      try {
        switch (recordType) {
          case 'HEADER':
            parseHeader(line, metadata);
            proteinId = line.substring(62, 66).trim() || `protein_${Date.now()}`;
            break;

          case 'TITLE':
            proteinName = parseTitle(line, proteinName);
            break;

          case 'SOURCE':
            parseSource(line, metadata);
            break;

          case 'REMARK':
            parseRemark(line, metadata);
            break;

          case 'HELIX':
            parseHelix(line, secondaryStructures);
            break;

          case 'SHEET':
            parseSheet(line, secondaryStructures);
            break;

          case 'MODEL':
            currentModel = parseInt(line.substring(10, 14).trim()) - 1;
            inModel = currentModel === modelIndex;
            break;

          case 'ENDMDL':
            if (currentModel === modelIndex) {
              inModel = false;
            }
            break;

          case 'ATOM':
          case 'HETATM':
            if (inModel) {
              const atom = parseAtomLine(line, atomId, recordType === 'HETATM');
              
              // Apply filters
              if (!includeHydrogens && atom.element === 'H') continue;
              if (!includeWater && atom.residueId.includes('HOH')) continue;
              if (!includeHetero && atom.atomType === 'hetero') continue;

              atoms.push(atom);
              
              // Group atoms into residues
              const residueKey = `${atom.chainId}_${atom.residueId}`;
              if (!residues.has(residueKey)) {
                const residue = createResidue(atom);
                residues.set(residueKey, residue);
              }
              residues.get(residueKey)!.atoms.push(atom);

              // Group residues into chains
              if (!chains.has(atom.chainId)) {
                chains.set(atom.chainId, createChain(atom.chainId));
              }

              atomId++;
            }
            break;
        }
      } catch (error) {
        console.warn(`Error parsing line ${i + 1}: ${error.message}`);
        // Continue parsing other lines
      }
    }

    // Build chain sequences and add residues to chains
    for (const [chainId, chain] of chains) {
      const chainResidues = Array.from(residues.values())
        .filter(residue => residue.chainId === chainId)
        .sort((a, b) => a.position - b.position);

      chain.residues = chainResidues;
      chain.sequence = chainResidues
        .map(residue => residue.type)
        .join('');
    }

    // Calculate bounding box
    const positions = atoms.map(atom => atom.position);
    const boundingBox = boundingBoxUtils.fromPoints(positions);

    // Calculate center of mass
    const centerOfMass = vector3Utils.center(positions);

    // Validate that we have some meaningful content
    const hasValidStructure = atoms.length > 0 || chains.size > 0 || proteinId.length > 0;
    if (!hasValidStructure) {
      throw new PDBParseError('No valid protein structure found in PDB content');
    }

    // Create protein structure
    const proteinStructure: ProteinStructure = {
      id: proteinId,
      name: proteinName || proteinId,
      sequence: Array.from(chains.values())
        .map(chain => chain.sequence)
        .join(''),
      atoms,
      residues: Array.from(residues.values()),
      chains: Array.from(chains.values()),
      metadata,
      secondaryStructure: secondaryStructures,
      boundingBox,
      centerOfMass,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return proteinStructure;

  } catch (error) {
    throw new PDBParseError(
      `Failed to parse PDB file: ${error.message}`,
      error.line
    );
  }
}

/**
 * Parse HEADER record
 */
function parseHeader(line: string, metadata: ProteinMetadata): void {
  metadata.classification = line.substring(10, 50).trim();
  metadata.depositionDate = line.substring(50, 59).trim();
  metadata.pdbId = line.substring(62, 66).trim();
}

/**
 * Parse TITLE record
 */
function parseTitle(line: string, currentTitle: string): string {
  const titlePart = line.substring(10, 80).trim();
  return currentTitle ? `${currentTitle} ${titlePart}` : titlePart;
}

/**
 * Parse SOURCE record
 */
function parseSource(line: string, metadata: ProteinMetadata): void {
  const source = line.substring(10, 79).trim();
  if (source.includes('ORGANISM_SCIENTIFIC:')) {
    metadata.organism = source.split('ORGANISM_SCIENTIFIC:')[1].split(';')[0].trim();
  } else {
    // Handle simple SOURCE format like "BOVINE (BOS TAURUS) PANCREAS"
    metadata.organism = source;
  }
}

/**
 * Parse REMARK records
 */
function parseRemark(line: string, metadata: ProteinMetadata): void {
  const remarkNum = parseInt(line.substring(7, 10).trim());
  const remarkText = line.substring(11, 79).trim();

  if (remarkNum === 2 && remarkText.includes('RESOLUTION')) {
    const resolutionMatch = remarkText.match(/(\d+\.\d+)\s*ANGSTROMS/);
    if (resolutionMatch) {
      metadata.resolution = parseFloat(resolutionMatch[1]);
    }
  }

  if (remarkNum === 200 && remarkText.includes('EXPERIMENT TYPE')) {
    metadata.method = remarkText.split(':')[1]?.trim() as any;
  }
}

/**
 * Parse HELIX record
 */
function parseHelix(line: string, secondaryStructures: SecondaryStructure[]): void {
  const helixId = line.substring(11, 14).trim();
  const chainId = line.substring(19, 20).trim();
  const startResidue = parseInt(line.substring(21, 25).trim());
  const endResidue = parseInt(line.substring(33, 37).trim());
  const helixClass = parseInt(line.substring(38, 40).trim());

  secondaryStructures.push({
    id: helixId,
    type: SecondaryStructureType.HELIX,
    chainId,
    start: startResidue,
    end: endResidue,
    startResidue,
    endResidue,
    helixClass,
  });
}

/**
 * Parse SHEET record
 */
function parseSheet(line: string, secondaryStructures: SecondaryStructure[]): void {
  const strandId = line.substring(11, 14).trim();
  const sheetId = line.substring(11, 14).trim();
  const chainId = line.substring(21, 22).trim();
  const startResidue = parseInt(line.substring(22, 26).trim());
  const endResidue = parseInt(line.substring(33, 37).trim());

  secondaryStructures.push({
    id: strandId,
    type: SecondaryStructureType.SHEET,
    chainId,
    start: startResidue,
    end: endResidue,
    startResidue,
    endResidue,
    strandId: sheetId,
  });
}

/**
 * Parse ATOM/HETATM record
 */
function parseAtomLine(line: string, atomId: number, isHetero: boolean): Atom {
  const atomName = line.substring(12, 16).trim();
  const element = line.substring(76, 78).trim() || atomName.charAt(0);
  const chainId = line.substring(21, 22).trim() || 'A';
  const resName = line.substring(17, 20).trim();
  const resNum = parseInt(line.substring(22, 26).trim());
  const insertionCode = line.substring(26, 27).trim();
  
  const x = parseFloat(line.substring(30, 38).trim());
  const y = parseFloat(line.substring(38, 46).trim());
  const z = parseFloat(line.substring(46, 54).trim());
  
  const occupancy = parseFloat(line.substring(54, 60).trim()) || 1.0;
  const bFactor = parseFloat(line.substring(60, 66).trim()) || 0.0;
  const altLoc = line.substring(16, 17).trim();

  // Validate coordinates
  if (isNaN(x) || isNaN(y) || isNaN(z)) {
    throw new Error(`Invalid coordinates for atom ${atomName}`);
  }

  const residueId = `${resName}${resNum}${insertionCode}`;

  return {
    id: atomId,
    name: atomName,
    element: element,
    position: { x, y, z },
    residueId,
    chainId,
    bFactor,
    occupancy,
    altLoc,
    atomType: isHetero ? 'hetero' : (isBackboneAtom(atomName) ? 'backbone' : 'sidechain'),
  };
}

/**
 * Create residue from first atom
 */
function createResidue(atom: Atom): Residue {
  const resName = atom.residueId.substring(0, 3);
  const resNum = parseInt(atom.residueId.substring(3)) || 1;
  
  // Map three-letter code to one-letter code
  let aminoAcidType: AminoAcidType = AminoAcidType.UNK;
  const properties = Object.values(AMINO_ACID_PROPERTIES).find(
    prop => prop.threeLetterCode === resName
  );
  if (properties) {
    aminoAcidType = properties.oneLetterCode;
  }

  return {
    id: atom.residueId,
    name: resName,
    type: aminoAcidType,
    position: resNum,
    atoms: [],
    chainId: atom.chainId,
    properties: properties || AMINO_ACID_PROPERTIES[AminoAcidType.UNK],
  };
}

/**
 * Create chain
 */
function createChain(chainId: string): Chain {
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    residues: [],
    sequence: '',
    type: 'protein',
  };
}

/**
 * Check if atom is backbone atom
 */
function isBackboneAtom(atomName: string): boolean {
  const backboneAtoms = ['N', 'CA', 'C', 'O', 'OXT'];
  return backboneAtoms.includes(atomName);
}

/**
 * Load PDB file from URL
 */
export async function loadPDBFromURL(url: string, options?: PDBParseOptions): Promise<ProteinStructure> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const pdbContent = await response.text();
    return parsePDBFile(pdbContent, options);
  } catch (error) {
    throw new PDBParseError(`Failed to load PDB from URL: ${error.message}`);
  }
}

/**
 * Load PDB file from File object
 */
export async function loadPDBFromFile(file: File, options?: PDBParseOptions): Promise<ProteinStructure> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const pdbContent = event.target?.result as string;
        const protein = await parsePDBFile(pdbContent, options);
        resolve(protein);
      } catch (error) {
        reject(new PDBParseError(`Failed to parse PDB file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new PDBParseError('Failed to read PDB file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Download sample PDB files for testing
 * Organized by complexity and educational value
 */
export const SAMPLE_PDB_URLS = {
  // Educational Samples - Small and Clear Structure
  '1ZNI': 'https://files.rcsb.org/download/1ZNI.pdb', // Human Insulin (51 residues, hormone)
  '1CRN': 'https://files.rcsb.org/download/1CRN.pdb', // Crambin (46 residues, small protein)
  '1LYZ': 'https://files.rcsb.org/download/1LYZ.pdb', // Lysozyme (129 residues, classic enzyme)
  '1MBN': 'https://files.rcsb.org/download/1MBN.pdb', // Myoglobin (153 residues, oxygen transport)
  
  // Intermediate Samples - Multi-chain and Complex Structures
  '1UBQ': 'https://files.rcsb.org/download/1UBQ.pdb', // Ubiquitin (76 residues, protein regulation)
  '1GZX': 'https://files.rcsb.org/download/1GZX.pdb', // Human Hemoglobin (574 residues, multi-chain)
  '1GFL': 'https://files.rcsb.org/download/1GFL.pdb', // Green Fluorescent Protein (238 residues)
  '2PTC': 'https://files.rcsb.org/download/2PTC.pdb', // Trypsin (223 residues, protease)
  
  // Advanced Samples - Large and Complex
  '1IGT': 'https://files.rcsb.org/download/1IGT.pdb', // Immunoglobulin G (antibody)
  '1KLN': 'https://files.rcsb.org/download/1KLN.pdb', // DNA Polymerase (large enzyme)
  '1F88': 'https://files.rcsb.org/download/1F88.pdb', // Bacteriorhodopsin (membrane protein)
  '1HHO': 'https://files.rcsb.org/download/1HHO.pdb', // Hemoglobin (classic example)
};

export interface SampleProteinInfo {
  pdbId: string;
  name: string;
  description: string;
  features: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  residueCount: number;
  category: 'hormone' | 'enzyme' | 'transport' | 'structure' | 'membrane' | 'antibody' | 'complex';
  recommendedRepresentation: 'cartoon' | 'surface' | 'ball-stick';
  recommendedColorScheme: 'element' | 'hydrophobicity' | 'secondaryStructure' | 'chainname';
}

export const SAMPLE_PROTEINS: Record<string, SampleProteinInfo> = {
  '1ZNI': {
    pdbId: '1ZNI',
    name: 'Human Insulin',
    description: 'Small hormone protein essential for glucose regulation',
    features: ['Small size', 'Medical relevance', 'Disulfide bonds', 'Hormone function'],
    difficulty: 'beginner',
    residueCount: 51,
    category: 'hormone',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'secondaryStructure'
  },
  '1CRN': {
    pdbId: '1CRN',
    name: 'Crambin',
    description: 'Small plant protein with clear secondary structure',
    features: ['Tiny protein', 'Clear structure', 'Good for beginners', 'Plant origin'],
    difficulty: 'beginner',
    residueCount: 46,
    category: 'structure',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'secondaryStructure'
  },
  '1LYZ': {
    pdbId: '1LYZ',
    name: 'Hen Egg White Lysozyme',
    description: 'Classic enzyme with clear α/β structure and active site',
    features: ['α/β protein', 'Active site', 'Well-studied', 'Antibacterial enzyme'],
    difficulty: 'beginner',
    residueCount: 129,
    category: 'enzyme',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'secondaryStructure'
  },
  '1MBN': {
    pdbId: '1MBN',
    name: 'Sperm Whale Myoglobin',
    description: 'Oxygen-carrying protein with heme cofactor',
    features: ['All α-helical', 'Cofactor binding', 'Oxygen transport', 'First solved structure'],
    difficulty: 'beginner',
    residueCount: 153,
    category: 'transport',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'hydrophobicity'
  },
  '1UBQ': {
    pdbId: '1UBQ',
    name: 'Ubiquitin',
    description: 'Protein regulation and degradation signal',
    features: ['Regulatory protein', 'Compact fold', 'Post-translational modification'],
    difficulty: 'intermediate',
    residueCount: 76,
    category: 'structure',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'hydrophobicity'
  },
  '1GZX': {
    pdbId: '1GZX',
    name: 'Human Hemoglobin',
    description: 'Multi-chain oxygen transport protein complex',
    features: ['Quaternary structure', 'Multiple chains', 'Cooperative binding', 'Heme groups'],
    difficulty: 'intermediate',
    residueCount: 574,
    category: 'transport',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'chainname'
  },
  '1GFL': {
    pdbId: '1GFL',
    name: 'Green Fluorescent Protein',
    description: 'Fluorescent protein with unique β-barrel structure',
    features: ['β-barrel fold', 'Fluorophore', 'Biotechnology tool', 'Unique structure'],
    difficulty: 'intermediate',
    residueCount: 238,
    category: 'structure',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'hydrophobicity'
  },
  '2PTC': {
    pdbId: '2PTC',
    name: 'Trypsin',
    description: 'Digestive enzyme with clear active site',
    features: ['Protease enzyme', 'Active site', 'Catalytic mechanism', 'Medical relevance'],
    difficulty: 'intermediate',
    residueCount: 223,
    category: 'enzyme',
    recommendedRepresentation: 'surface',
    recommendedColorScheme: 'hydrophobicity'
  },
  '1IGT': {
    pdbId: '1IGT',
    name: 'Immunoglobulin G',
    description: 'Large antibody structure with multiple domains',
    features: ['Large protein', 'Domain structure', 'Medical relevance', 'Immune system'],
    difficulty: 'advanced',
    residueCount: 800,
    category: 'antibody',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'chainname'
  },
  '1KLN': {
    pdbId: '1KLN',
    name: 'DNA Polymerase',
    description: 'Large enzyme complex for DNA replication',
    features: ['Large enzyme', 'DNA complex', 'Multiple domains', 'Replication machinery'],
    difficulty: 'advanced',
    residueCount: 1200,
    category: 'complex',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'chainname'
  },
  '1F88': {
    pdbId: '1F88',
    name: 'Bacteriorhodopsin',
    description: 'Membrane protein with 7 transmembrane helices',
    features: ['Membrane protein', 'Transmembrane helices', 'Light-driven pump', 'Unique topology'],
    difficulty: 'advanced',
    residueCount: 248,
    category: 'membrane',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'hydrophobicity'
  },
  '1HHO': {
    pdbId: '1HHO',
    name: 'Hemoglobin',
    description: 'Classic oxygen transport protein',
    features: ['Classic example', 'Cooperative binding', 'Allosteric regulation', 'Medical importance'],
    difficulty: 'intermediate',
    residueCount: 574,
    category: 'transport',
    recommendedRepresentation: 'cartoon',
    recommendedColorScheme: 'chainname'
  }
};

/**
 * Load a sample protein for testing
 */
export async function loadSampleProtein(pdbId: keyof typeof SAMPLE_PDB_URLS, options?: PDBParseOptions): Promise<ProteinStructure> {
  const url = SAMPLE_PDB_URLS[pdbId];
  if (!url) {
    throw new PDBParseError(`Unknown sample PDB ID: ${pdbId}`);
  }
  
  return loadPDBFromURL(url, options);
}

/**
 * Validate PDB file format
 */
export function validatePDBFormat(pdbContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = pdbContent.split('\n');
  
  let hasAtoms = false;
  let hasHeader = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const recordType = line.substring(0, 6).trim();
    
    if (recordType === 'HEADER') {
      hasHeader = true;
    }
    
    if (recordType === 'ATOM' || recordType === 'HETATM') {
      hasAtoms = true;
      
      // Check line length
      if (line.length < 54) {
        errors.push(`Line ${i + 1}: ATOM/HETATM record too short`);
      }
      
      // Check coordinates
      try {
        const x = parseFloat(line.substring(30, 38).trim());
        const y = parseFloat(line.substring(38, 46).trim());
        const z = parseFloat(line.substring(46, 54).trim());
        
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
          errors.push(`Line ${i + 1}: Invalid coordinates`);
        }
      } catch (error) {
        errors.push(`Line ${i + 1}: Error parsing coordinates`);
      }
    }
  }
  
  if (!hasHeader) {
    errors.push('Missing HEADER record');
  }
  
  if (!hasAtoms) {
    errors.push('No ATOM or HETATM records found');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}