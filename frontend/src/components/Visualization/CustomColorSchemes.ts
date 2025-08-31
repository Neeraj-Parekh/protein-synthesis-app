/**
 * Custom Color Schemes for NGL Viewer
 * Implements advanced coloring options beyond the standard NGL schemes
 */

export interface CustomColorScheme {
  name: string;
  description: string;
  colorMap: { [key: string]: string };
  selectionFunction: (atom: any) => string;
}

// Custom color schemes for advanced visualization
export const CUSTOM_COLOR_SCHEMES: { [key: string]: CustomColorScheme } = {
  'charge': {
    name: 'Electrostatic Charge',
    description: 'Colors residues by their electrostatic charge',
    colorMap: {
      'positive': '#0066CC', // Blue for positive (K, R, H)
      'negative': '#CC0000', // Red for negative (D, E)
      'polar': '#00CC66',    // Green for polar (N, Q, S, T, Y)
      'hydrophobic': '#FFAA00', // Orange for hydrophobic
      'special': '#CC00CC'   // Magenta for special (C, G, P)
    },
    selectionFunction: (atom: any) => {
      const resname = atom.residue?.resname;
      if (['LYS', 'ARG', 'HIS'].includes(resname)) return 'positive';
      if (['ASP', 'GLU'].includes(resname)) return 'negative';
      if (['ASN', 'GLN', 'SER', 'THR', 'TYR'].includes(resname)) return 'polar';
      if (['CYS', 'GLY', 'PRO'].includes(resname)) return 'special';
      return 'hydrophobic';
    }
  },

  'polarity': {
    name: 'Polarity',
    description: 'Colors by amino acid polarity and charge',
    colorMap: {
      'basic': '#0066FF',      // Basic residues
      'acidic': '#FF6600',     // Acidic residues
      'polar': '#00CC00',      // Polar uncharged
      'nonpolar': '#CCCCCC',   // Nonpolar
      'aromatic': '#FF00FF'    // Aromatic
    },
    selectionFunction: (atom: any) => {
      const resname = atom.residue?.resname;
      if (['LYS', 'ARG', 'HIS'].includes(resname)) return 'basic';
      if (['ASP', 'GLU'].includes(resname)) return 'acidic';
      if (['PHE', 'TRP', 'TYR'].includes(resname)) return 'aromatic';
      if (['ASN', 'GLN', 'SER', 'THR', 'CYS'].includes(resname)) return 'polar';
      return 'nonpolar';
    }
  },

  'conservation': {
    name: 'Conservation Score',
    description: 'Colors by evolutionary conservation (simulated)',
    colorMap: {
      'highly_conserved': '#000080',  // Dark blue
      'conserved': '#0066CC',         // Blue
      'moderate': '#00CC66',          // Green
      'variable': '#FFAA00',          // Orange
      'highly_variable': '#CC0000'    // Red
    },
    selectionFunction: (atom: any) => {
      // Simulate conservation based on residue type and position
      const resname = atom.residue?.resname;
      const resno = atom.residue?.resno || 0;
      
      // Simulate: structural residues (G, P) and disulfide bonds (C) are conserved
      if (['GLY', 'PRO', 'CYS'].includes(resname)) return 'highly_conserved';
      // Active site residues (simulated by position)
      if (resno % 20 === 0) return 'conserved';
      // Hydrophobic core (simulated)
      if (['VAL', 'ILE', 'LEU', 'PHE'].includes(resname) && resno % 7 === 0) return 'conserved';
      // Surface loops are variable
      if (resno % 5 === 0) return 'variable';
      return 'moderate';
    }
  },

  'accessibility': {
    name: 'Surface Accessibility',
    description: 'Colors by solvent accessibility (simulated)',
    colorMap: {
      'buried': '#000066',      // Dark blue for buried
      'partially_buried': '#0066CC', // Blue for partially buried
      'accessible': '#00CC66',  // Green for accessible
      'highly_exposed': '#FFFF00' // Yellow for highly exposed
    },
    selectionFunction: (atom: any) => {
      const resname = atom.residue?.resname;
      const resno = atom.residue?.resno || 0;
      
      // Simulate: hydrophobic residues tend to be buried
      if (['VAL', 'ILE', 'LEU', 'PHE', 'TRP'].includes(resname)) {
        return resno % 3 === 0 ? 'partially_buried' : 'buried';
      }
      // Charged residues tend to be exposed
      if (['LYS', 'ARG', 'ASP', 'GLU'].includes(resname)) {
        return resno % 2 === 0 ? 'highly_exposed' : 'accessible';
      }
      return 'accessible';
    }
  },

  'functional_sites': {
    name: 'Functional Sites',
    description: 'Highlights predicted functional sites',
    colorMap: {
      'catalytic': '#FF0000',    // Red for catalytic residues
      'binding': '#00FF00',      // Green for binding sites
      'structural': '#0000FF',   // Blue for structural
      'allosteric': '#FF00FF',   // Magenta for allosteric sites
      'normal': '#CCCCCC'        // Gray for normal residues
    },
    selectionFunction: (atom: any) => {
      const resname = atom.residue?.resname;
      const resno = atom.residue?.resno || 0;
      
      // Simulate functional sites
      if (['HIS', 'ASP', 'GLU'].includes(resname) && resno % 15 === 0) return 'catalytic';
      if (['TRP', 'PHE', 'TYR'].includes(resname) && resno % 12 === 0) return 'binding';
      if (['GLY', 'PRO'].includes(resname)) return 'structural';
      if (resno % 25 === 0) return 'allosteric';
      return 'normal';
    }
  }
};

/**
 * Apply custom color scheme to NGL component
 */
export const applyCustomColorScheme = (component: any, schemeName: string) => {
  const scheme = CUSTOM_COLOR_SCHEMES[schemeName];
  if (!scheme) {
    console.warn(`Custom color scheme '${schemeName}' not found`);
    return;
  }

  try {
    // Create selection-based representations for each color category
    Object.entries(scheme.colorMap).forEach(([category, color]) => {
      // Create a selection for this category
      const selection = createSelectionForCategory(category, scheme);
      
      if (selection) {
        component.addRepresentation('cartoon', {
          sele: selection,
          colorScheme: 'uniform',
          colorValue: color,
          name: `custom_${schemeName}_${category}`
        });
      }
    });
  } catch (error) {
    console.error('Failed to apply custom color scheme:', error);
  }
};

/**
 * Create NGL selection string for a color category
 */
const createSelectionForCategory = (category: string, _scheme: CustomColorScheme): string => {
  // This is a simplified version - in practice, you'd need to analyze
  // the structure and create appropriate selections
  switch (category) {
    case 'positive':
      return 'LYS or ARG or HIS';
    case 'negative':
      return 'ASP or GLU';
    case 'polar':
      return 'ASN or GLN or SER or THR or TYR';
    case 'hydrophobic':
      return 'ALA or VAL or ILE or LEU or MET or PHE or TRP';
    case 'special':
      return 'CYS or GLY or PRO';
    case 'basic':
      return 'LYS or ARG or HIS';
    case 'acidic':
      return 'ASP or GLU';
    case 'aromatic':
      return 'PHE or TRP or TYR';
    case 'nonpolar':
      return 'ALA or VAL or ILE or LEU or MET';
    case 'catalytic':
      return '(HIS or ASP or GLU) and (1-50 or 100-150)'; // Simulated active site
    case 'binding':
      return '(TRP or PHE or TYR) and (20-80 or 120-180)'; // Simulated binding sites
    case 'structural':
      return 'GLY or PRO';
    case 'allosteric':
      return '200-250'; // Simulated allosteric site
    default:
      return 'not (LYS or ARG or HIS or ASP or GLU or ASN or GLN or SER or THR or TYR or CYS or GLY or PRO or PHE or TRP)';
  }
};

/**
 * Remove custom color scheme representations
 */
export const removeCustomColorScheme = (component: any, schemeName: string) => {
  if (!component) return;

  const representationsToRemove = component.reprList.filter((repr: any) => 
    repr.name && repr.name.startsWith(`custom_${schemeName}_`)
  );

  representationsToRemove.forEach((repr: any) => {
    component.removeRepresentation(repr);
  });
};

/**
 * Get available custom color schemes
 */
export const getCustomColorSchemes = () => {
  return Object.keys(CUSTOM_COLOR_SCHEMES).map(key => ({
    key,
    name: CUSTOM_COLOR_SCHEMES[key].name,
    description: CUSTOM_COLOR_SCHEMES[key].description
  }));
};
