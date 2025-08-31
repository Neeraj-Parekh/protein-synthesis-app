/**
 * Unit tests for PDB loader utilities
 */
import { parsePDBFile, validatePDBFormat, PDBParseError } from '../pdbLoader';

describe('PDB Loader', () => {
  const samplePDBContent = `HEADER    HYDROLASE/HYDROLASE INHIBITOR           20-JUN-77   2PTC              
TITLE     BOVINE PANCREATIC TRYPSIN INHIBITOR                               
SOURCE    BOVINE (BOS TAURUS) PANCREAS                                      
REMARK   2 RESOLUTION.    1.90 ANGSTROMS.                                   
ATOM      1  N   ALA A   1      -8.901   4.127  -0.555  1.00 11.99           N  
ATOM      2  CA  ALA A   1      -8.608   3.135  -1.618  1.00 11.85           C  
ATOM      3  C   ALA A   1      -7.221   2.458  -1.897  1.00 11.99           C  
ATOM      4  O   ALA A   1      -6.632   2.248  -2.961  1.00 12.05           O  
ATOM      5  CB  ALA A   1      -9.618   2.026  -1.897  1.00 11.85           C  
HETATM    6  O   HOH A 101       1.234   5.678   9.012  1.00 20.00           O  
END                                                                          `;

  const invalidPDBContent = `INVALID LINE
ATOM      1  N   ALA A   1      invalid coordinates
END`;

  describe('parsePDBFile', () => {
    it('should parse valid PDB content correctly', async () => {
      const protein = await parsePDBFile(samplePDBContent, { includeWater: true });

      expect(protein.id).toBe('2PTC');
      expect(protein.name).toContain('BOVINE PANCREATIC TRYPSIN INHIBITOR');
      expect(protein.atoms).toHaveLength(6);
      expect(protein.chains).toHaveLength(1);
      expect(protein.residues).toHaveLength(2); // ALA and HOH
    });

    it('should handle metadata correctly', async () => {
      const protein = await parsePDBFile(samplePDBContent, { includeWater: true });

      expect(protein.metadata.classification).toBe('HYDROLASE/HYDROLASE INHIBITOR');
      expect(protein.metadata.pdbId).toBe('2PTC');
      expect(protein.metadata.resolution).toBe(1.90);
      expect(protein.metadata.organism).toContain('BOS TAURUS');
    });

    it('should filter hydrogens when specified', async () => {
      const pdbWithHydrogens = samplePDBContent + `
ATOM      7  H   ALA A   1      -8.500   4.800  -0.300  1.00 10.00           H  `;

      const proteinWithH = await parsePDBFile(pdbWithHydrogens, { includeHydrogens: true, includeWater: true });
      const proteinWithoutH = await parsePDBFile(pdbWithHydrogens, { includeHydrogens: false, includeWater: true });

      expect(proteinWithH.atoms).toHaveLength(7);
      expect(proteinWithoutH.atoms).toHaveLength(6);
    });

    it('should filter water when specified', async () => {
      const proteinWithWater = await parsePDBFile(samplePDBContent, { includeWater: true });
      const proteinWithoutWater = await parsePDBFile(samplePDBContent, { includeWater: false });

      expect(proteinWithWater.atoms).toHaveLength(6);
      expect(proteinWithoutWater.atoms).toHaveLength(5); // Excludes HOH
    });

    it('should filter hetero atoms when specified', async () => {
      const proteinWithHetero = await parsePDBFile(samplePDBContent, { includeHetero: true, includeWater: true });
      const proteinWithoutHetero = await parsePDBFile(samplePDBContent, { includeHetero: false, includeWater: true });

      expect(proteinWithHetero.atoms).toHaveLength(6);
      expect(proteinWithoutHetero.atoms).toHaveLength(5); // Excludes HETATM
    });

    it('should calculate bounding box correctly', async () => {
      const protein = await parsePDBFile(samplePDBContent);

      expect(protein.boundingBox).toBeDefined();
      expect(protein.boundingBox.min).toBeDefined();
      expect(protein.boundingBox.max).toBeDefined();
      expect(protein.boundingBox.center).toBeDefined();
      expect(protein.boundingBox.size).toBeDefined();
    });

    it('should calculate center of mass', async () => {
      const protein = await parsePDBFile(samplePDBContent);

      expect(protein.centerOfMass).toBeDefined();
      expect(typeof protein.centerOfMass.x).toBe('number');
      expect(typeof protein.centerOfMass.y).toBe('number');
      expect(typeof protein.centerOfMass.z).toBe('number');
    });

    it('should handle empty PDB content', async () => {
      await expect(parsePDBFile('')).rejects.toThrow(PDBParseError);
    });

    it('should handle invalid coordinates gracefully', async () => {
      // Should continue parsing other valid lines even if some are invalid
      const protein = await parsePDBFile(samplePDBContent + '\nATOM      7  N   ALA A   2      invalid   coords   here  1.00 10.00           N  ');
      
      // Should still parse the valid atoms
      expect(protein.atoms.length).toBeGreaterThan(0);
    });

    it('should assign correct atom types', async () => {
      const protein = await parsePDBFile(samplePDBContent, { includeWater: true });

      const backboneAtom = protein.atoms.find(atom => atom.name === 'CA');
      const sidechainAtom = protein.atoms.find(atom => atom.name === 'CB');
      const heteroAtom = protein.atoms.find(atom => atom.atomType === 'hetero');

      expect(backboneAtom?.atomType).toBe('backbone');
      expect(sidechainAtom?.atomType).toBe('sidechain');
      expect(heteroAtom?.atomType).toBe('hetero');
    });

    it('should build chain sequences correctly', async () => {
      const protein = await parsePDBFile(samplePDBContent);

      const chainA = protein.chains.find(chain => chain.id === 'A');
      expect(chainA).toBeDefined();
      expect(chainA?.sequence).toBe('A'); // Single alanine residue
    });

    it('should handle multiple models', async () => {
      const multiModelPDB = `HEADER    TEST                                    01-JAN-00   TEST              
MODEL        1
ATOM      1  N   ALA A   1      -8.901   4.127  -0.555  1.00 11.99           N  
ENDMDL
MODEL        2
ATOM      1  N   ALA A   1      -8.500   4.000  -0.500  1.00 11.99           N  
ENDMDL
END`;

      const protein1 = await parsePDBFile(multiModelPDB, { modelIndex: 0 });
      const protein2 = await parsePDBFile(multiModelPDB, { modelIndex: 1 });

      expect(protein1.atoms[0].position.x).toBeCloseTo(-8.901);
      expect(protein2.atoms[0].position.x).toBeCloseTo(-8.500);
    });
  });

  describe('validatePDBFormat', () => {
    it('should validate correct PDB format', () => {
      const result = validatePDBFormat(samplePDBContent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing HEADER', () => {
      const pdbWithoutHeader = samplePDBContent.replace(/HEADER.*\n/, '');
      const result = validatePDBFormat(pdbWithoutHeader);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing HEADER record');
    });

    it('should detect missing ATOM records', () => {
      const pdbWithoutAtoms = `HEADER    TEST                                    01-JAN-00   TEST              
END`;
      const result = validatePDBFormat(pdbWithoutAtoms);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No ATOM or HETATM records found');
    });

    it('should detect invalid coordinates', () => {
      const result = validatePDBFormat(invalidPDBContent);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid coordinates'))).toBe(true);
    });

    it('should detect short ATOM lines', () => {
      const shortLinePDB = `HEADER    TEST                                    01-JAN-00   TEST              
ATOM      1  N   ALA A   1
END`;
      const result = validatePDBFormat(shortLinePDB);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('too short'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw PDBParseError for invalid content', async () => {
      await expect(parsePDBFile('INVALID CONTENT')).rejects.toThrow(PDBParseError);
    });

    it('should include line number in error when possible', async () => {
      try {
        await parsePDBFile(invalidPDBContent);
      } catch (error) {
        expect(error).toBeInstanceOf(PDBParseError);
        // Error should contain information about the parsing failure
        expect(error.message).toContain('Failed to parse PDB file');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle PDB with only HETATM records', async () => {
      const hetatomOnlyPDB = `HEADER    TEST                                    01-JAN-00   TEST              
HETATM    1  O   HOH A 101       1.234   5.678   9.012  1.00 20.00           O  
END`;

      const protein = await parsePDBFile(hetatomOnlyPDB);
      expect(protein.atoms).toHaveLength(1);
      expect(protein.atoms[0].atomType).toBe('hetero');
    });

    it('should handle PDB with insertion codes', async () => {
      const insertionCodePDB = `HEADER    TEST                                    01-JAN-00   TEST              
ATOM      1  N   ALA A   1       -8.901   4.127  -0.555  1.00 11.99           N  
ATOM      2  N   ALA A   1A      -8.500   4.000  -0.500  1.00 11.99           N  
END`;

      const protein = await parsePDBFile(insertionCodePDB);
      expect(protein.atoms).toHaveLength(2);
      expect(protein.residues).toHaveLength(2); // Should create separate residues
    });

    it('should handle PDB with alternative locations', async () => {
      const altLocPDB = `HEADER    TEST                                    01-JAN-00   TEST              
ATOM      1  N  AALA A   1       -8.901   4.127  -0.555  0.50 11.99           N  
ATOM      2  N  BALA A   1       -8.500   4.000  -0.500  0.50 11.99           N  
END`;

      const protein = await parsePDBFile(altLocPDB);
      expect(protein.atoms).toHaveLength(2);
      expect(protein.atoms[0].altLoc).toBe('A');
      expect(protein.atoms[1].altLoc).toBe('B');
    });

    it('should handle missing chain IDs', async () => {
      const noChainPDB = `HEADER    TEST                                    01-JAN-00   TEST              
ATOM      1  N   ALA     1       -8.901   4.127  -0.555  1.00 11.99           N  
END`;

      const protein = await parsePDBFile(noChainPDB);
      expect(protein.atoms).toHaveLength(1);
      expect(protein.atoms[0].chainId).toBe('A'); // Should default to 'A'
    });
  });
});