"""
Protein data processing and management service
"""
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid
from datetime import datetime
import re

from models.protein import (
    ProteinDB, ProteinStructure, ProteinResponse, 
    Atom, Residue, Chain, Vector3, ProteinMetadata
)

class ProteinService:
    def __init__(self, db: Session):
        self.db = db
    
    async def create_from_pdb(self, pdb_content: str, name: str) -> ProteinResponse:
        """
        Create protein from PDB file content
        """
        try:
            # Parse PDB content
            structure = self._parse_pdb(pdb_content)
            
            # Extract sequence from structure
            sequence = self._extract_sequence(structure)
            
            # Calculate molecular weight
            molecular_weight = self._calculate_molecular_weight(sequence)
            
            # Create database entry
            protein_id = str(uuid.uuid4())
            protein_db = ProteinDB(
                id=protein_id,
                name=name,
                sequence=sequence,
                molecular_weight=molecular_weight,
                length=len(sequence),
                metadata={"pdb_content": pdb_content}
            )
            
            self.db.add(protein_db)
            self.db.commit()
            self.db.refresh(protein_db)
            
            return ProteinResponse(
                id=protein_db.id,
                name=protein_db.name,
                sequence=protein_db.sequence,
                molecular_weight=protein_db.molecular_weight,
                length=protein_db.length,
                created_at=protein_db.created_at,
                metadata=protein_db.metadata
            )
            
        except Exception as e:
            raise Exception(f"Failed to process PDB file: {str(e)}")
    
    async def get_structure(self, protein_id: str) -> Optional[ProteinStructure]:
        """
        Get detailed protein structure
        """
        protein = self.db.query(ProteinDB).filter(ProteinDB.id == protein_id).first()
        if not protein:
            return None
        
        # Parse structure from stored PDB content
        pdb_content = protein.metadata.get("pdb_content", "")
        if not pdb_content:
            return None
        
        structure = self._parse_pdb(pdb_content)
        return structure
    
    def _parse_pdb(self, pdb_content: str) -> ProteinStructure:
        """
        Parse PDB file content into ProteinStructure
        """
        lines = pdb_content.strip().split('\n')
        atoms = []
        residues = {}
        chains = {}
        metadata = ProteinMetadata()
        
        # Parse header information
        for line in lines:
            if line.startswith('HEADER'):
                parts = line.split()
                if len(parts) > 1:
                    metadata.classification = ' '.join(parts[1:-1])
            elif line.startswith('REMARK   2 RESOLUTION'):
                try:
                    resolution_match = re.search(r'(\d+\.\d+)', line)
                    if resolution_match:
                        metadata.resolution = float(resolution_match.group(1))
                except:
                    pass
        
        # Parse atoms
        for line in lines:
            if line.startswith('ATOM') or line.startswith('HETATM'):
                try:
                    atom_id = int(line[6:11].strip())
                    element = line[76:78].strip() or line[12:16].strip()[0]
                    x = float(line[30:38].strip())
                    y = float(line[38:46].strip())
                    z = float(line[46:54].strip())
                    residue_id = f"{line[17:20].strip()}_{line[22:26].strip()}_{line[21].strip()}"
                    chain_id = line[21].strip()
                    
                    atom = Atom(
                        id=atom_id,
                        element=element,
                        position=Vector3(x=x, y=y, z=z),
                        residue_id=residue_id,
                        chain_id=chain_id
                    )
                    atoms.append(atom)
                    
                    # Group atoms by residue
                    if residue_id not in residues:
                        residues[residue_id] = {
                            'type': line[17:20].strip(),
                            'position': int(line[22:26].strip()),
                            'atoms': [],
                            'chain_id': chain_id
                        }
                    residues[residue_id]['atoms'].append(atom)
                    
                    # Group residues by chain
                    if chain_id not in chains:
                        chains[chain_id] = []
                    
                except (ValueError, IndexError):
                    continue
        
        # Convert residues dict to list
        residue_list = []
        for res_id, res_data in residues.items():
            # Map 3-letter to 1-letter amino acid codes
            aa_map = {
                'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
                'GLU': 'E', 'GLN': 'Q', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
                'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
                'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V'
            }
            
            residue = Residue(
                id=res_id,
                type=aa_map.get(res_data['type'], 'X'),
                position=res_data['position'],
                atoms=res_data['atoms'],
                chain_id=res_data['chain_id']
            )
            residue_list.append(residue)
            
            # Add to chain
            if res_data['chain_id'] not in chains:
                chains[res_data['chain_id']] = []
            chains[res_data['chain_id']].append(residue)
        
        # Convert chains dict to list
        chain_list = []
        for chain_id, chain_residues in chains.items():
            chain = Chain(id=chain_id, residues=sorted(chain_residues, key=lambda r: r.position))
            chain_list.append(chain)
        
        # Extract sequence
        sequence = self._extract_sequence_from_residues(residue_list)
        
        return ProteinStructure(
            id=str(uuid.uuid4()),
            name="Parsed Structure",
            sequence=sequence,
            atoms=atoms,
            residues=sorted(residue_list, key=lambda r: r.position),
            chains=chain_list,
            metadata=metadata
        )
    
    def _extract_sequence(self, structure: ProteinStructure) -> str:
        """
        Extract amino acid sequence from structure
        """
        return structure.sequence
    
    def _extract_sequence_from_residues(self, residues: List[Residue]) -> str:
        """
        Extract sequence from residue list
        """
        sorted_residues = sorted(residues, key=lambda r: r.position)
        return ''.join([r.type for r in sorted_residues])
    
    def _calculate_molecular_weight(self, sequence: str) -> float:
        """
        Calculate molecular weight from amino acid sequence
        """
        # Amino acid molecular weights (average)
        aa_weights = {
            'A': 89.09, 'R': 174.20, 'N': 132.12, 'D': 133.10, 'C': 121.15,
            'E': 147.13, 'Q': 146.15, 'G': 75.07, 'H': 155.16, 'I': 131.17,
            'L': 131.17, 'K': 146.19, 'M': 149.21, 'F': 165.19, 'P': 115.13,
            'S': 105.09, 'T': 119.12, 'W': 204.23, 'Y': 181.19, 'V': 117.15
        }
        
        total_weight = sum(aa_weights.get(aa, 0) for aa in sequence)
        # Subtract water molecules (n-1 peptide bonds)
        water_weight = 18.015 * (len(sequence) - 1)
        
        return total_weight - water_weight