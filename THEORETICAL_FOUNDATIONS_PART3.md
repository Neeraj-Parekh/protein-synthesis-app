## 3D GRAPHICS THEORY

### Computer Graphics Pipeline Theory

#### 3D Rendering Pipeline
```
Theory: Graphics pipeline transforms 3D models to 2D screen pixels

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MODEL SPACE    │───►│   WORLD SPACE   │───►│   VIEW SPACE    │
│                 │    │                 │    │                 │
│ Local coords    │    │ Global coords   │    │ Camera coords   │
│ Atom positions  │    │ Scene assembly  │    │ Eye perspective │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  CLIP SPACE     │───►│  SCREEN SPACE   │───►│   RASTERIZATION │
│                 │    │                 │    │                 │
│ Projection      │    │ Viewport        │    │ Pixel colors    │
│ Frustum culling │    │ 2D coordinates  │    │ Fragment shader │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### Matrix Transformations Theory
```typescript
// Theory: 4x4 matrices represent 3D transformations
// Homogeneous coordinates allow translation in matrix multiplication

class Matrix4 {
  elements: Float32Array;
  
  constructor() {
    // Column-major order (OpenGL convention)
    this.elements = new Float32Array(16);
    this.identity();
  }
  
  // Identity matrix - no transformation
  identity(): Matrix4 {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8]  = 0; e[12] = 0;
    e[1] = 0; e[5] = 1; e[9]  = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }
  
  // Translation matrix
  makeTranslation(x: number, y: number, z: number): Matrix4 {
    this.identity();
    this.elements[12] = x;
    this.elements[13] = y;
    this.elements[14] = z;
    return this;
  }
  
  // Rotation matrix around Y axis
  makeRotationY(theta: number): Matrix4 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    
    this.identity();
    this.elements[0] = c;   this.elements[8] = s;
    this.elements[2] = -s;  this.elements[10] = c;
    return this;
  }
  
  // Perspective projection matrix
  makePerspective(
    fov: number,    // Field of view in radians
    aspect: number, // Aspect ratio (width/height)
    near: number,   // Near clipping plane
    far: number     // Far clipping plane
  ): Matrix4 {
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);
    
    this.elements[0] = f / aspect;
    this.elements[5] = f;
    this.elements[10] = (near + far) * rangeInv;
    this.elements[11] = -1;
    this.elements[14] = near * far * rangeInv * 2;
    this.elements[15] = 0;
    
    return this;
  }
  
  // Matrix multiplication - order matters!
  multiply(m: Matrix4): Matrix4 {
    const a = this.elements;
    const b = m.elements;
    const result = new Float32Array(16);
    
    // Standard matrix multiplication algorithm
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    
    this.elements = result;
    return this;
  }
}

// Usage in protein visualization
function createProteinTransform(protein: ProteinStructure): Matrix4 {
  const transform = new Matrix4();
  
  // Center the protein at origin
  const center = protein.centerOfMass;
  const translation = new Matrix4().makeTranslation(-center.x, -center.y, -center.z);
  
  // Scale to fit in view
  const boundingBox = protein.boundingBox;
  const maxDimension = Math.max(
    boundingBox.size.x,
    boundingBox.size.y,
    boundingBox.size.z
  );
  const scale = 10 / maxDimension; // Scale to fit in 10 unit cube
  const scaling = new Matrix4().makeScale(scale, scale, scale);
  
  // Combine transformations: Scale * Translation
  return transform.multiply(scaling).multiply(translation);
}
```

#### Lighting Theory - Phong Illumination Model
```typescript
// Theory: Phong model combines ambient, diffuse, and specular lighting
// I = I_ambient + I_diffuse + I_specular

interface Light {
  position: Vector3;
  color: Vector3;
  intensity: number;
}

interface Material {
  ambient: Vector3;   // Ambient reflection coefficient
  diffuse: Vector3;   // Diffuse reflection coefficient
  specular: Vector3;  // Specular reflection coefficient
  shininess: number;  // Specular exponent
}

function calculatePhongLighting(
  position: Vector3,     // Surface point position
  normal: Vector3,       // Surface normal (normalized)
  viewDir: Vector3,      // Direction to viewer (normalized)
  light: Light,
  material: Material
): Vector3 {
  // Ambient component - constant base lighting
  const ambient = material.ambient.multiply(light.color).multiplyScalar(0.1);
  
  // Diffuse component - Lambert's cosine law
  const lightDir = light.position.subtract(position).normalize();
  const diffuseStrength = Math.max(0, normal.dot(lightDir));
  const diffuse = material.diffuse
    .multiply(light.color)
    .multiplyScalar(diffuseStrength * light.intensity);
  
  // Specular component - reflection highlights
  const reflectDir = normal
    .multiplyScalar(2 * normal.dot(lightDir))
    .subtract(lightDir)
    .normalize();
  const specularStrength = Math.pow(
    Math.max(0, viewDir.dot(reflectDir)),
    material.shininess
  );
  const specular = material.specular
    .multiply(light.color)
    .multiplyScalar(specularStrength * light.intensity);
  
  // Combine all components
  return ambient.add(diffuse).add(specular);
}

// Atom-specific material properties
function getAtomMaterial(element: string): Material {
  const materials: Record<string, Material> = {
    'C': { // Carbon - dark gray
      ambient: new Vector3(0.1, 0.1, 0.1),
      diffuse: new Vector3(0.3, 0.3, 0.3),
      specular: new Vector3(0.5, 0.5, 0.5),
      shininess: 32
    },
    'N': { // Nitrogen - blue
      ambient: new Vector3(0.0, 0.0, 0.1),
      diffuse: new Vector3(0.0, 0.0, 0.8),
      specular: new Vector3(0.6, 0.6, 1.0),
      shininess: 64
    },
    'O': { // Oxygen - red
      ambient: new Vector3(0.1, 0.0, 0.0),
      diffuse: new Vector3(0.8, 0.0, 0.0),
      specular: new Vector3(1.0, 0.6, 0.6),
      shininess: 64
    }
  };
  
  return materials[element] || materials['C'];
}
```

### Molecular Visualization Algorithms

#### Space-Filling (Van der Waals) Representation
```typescript
// Theory: Atoms represented as spheres with Van der Waals radii
// Overlapping spheres show molecular surface

const VAN_DER_WAALS_RADII: Record<string, number> = {
  'H': 1.20,  // Hydrogen
  'C': 1.70,  // Carbon
  'N': 1.55,  // Nitrogen
  'O': 1.52,  // Oxygen
  'S': 1.80,  // Sulfur
  'P': 1.80,  // Phosphorus
};

function createSpaceFillingRepresentation(protein: ProteinStructure): THREE.Group {
  const group = new THREE.Group();
  
  // Create instanced geometry for performance
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);
  
  // Group atoms by element for instanced rendering
  const atomsByElement = protein.atoms.reduce((acc, atom) => {
    if (!acc[atom.element]) acc[atom.element] = [];
    acc[atom.element].push(atom);
    return acc;
  }, {} as Record<string, Atom[]>);
  
  Object.entries(atomsByElement).forEach(([element, atoms]) => {
    const radius = VAN_DER_WAALS_RADII[element] || 1.5;
    const color = getAtomColor(element);
    
    // Create instanced mesh for all atoms of this element
    const material = new THREE.MeshPhongMaterial({ color });
    const instancedMesh = new THREE.InstancedMesh(
      sphereGeometry,
      material,
      atoms.length
    );
    
    // Set transform for each atom instance
    atoms.forEach((atom, index) => {
      const matrix = new THREE.Matrix4();
      matrix.compose(
        new THREE.Vector3(atom.position.x, atom.position.y, atom.position.z),
        new THREE.Quaternion(),
        new THREE.Vector3(radius, radius, radius)
      );
      instancedMesh.setMatrixAt(index, matrix);
    });
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    group.add(instancedMesh);
  });
  
  return group;
}
```

#### Ball-and-Stick Representation
```typescript
// Theory: Atoms as spheres, bonds as cylinders
// Shows molecular connectivity and geometry

function createBallStickRepresentation(protein: ProteinStructure): THREE.Group {
  const group = new THREE.Group();
  
  // Create atoms (smaller spheres than space-filling)
  const atomRadius = 0.3;
  const sphereGeometry = new THREE.SphereGeometry(atomRadius, 12, 8);
  
  protein.atoms.forEach(atom => {
    const material = new THREE.MeshPhongMaterial({
      color: getAtomColor(atom.element)
    });
    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.position.set(atom.position.x, atom.position.y, atom.position.z);
    group.add(sphere);
  });
  
  // Create bonds (cylinders)
  if (protein.bonds) {
    const bondRadius = 0.1;
    const cylinderGeometry = new THREE.CylinderGeometry(bondRadius, bondRadius, 1, 8);
    
    protein.bonds.forEach(bond => {
      const atom1 = protein.atoms.find(a => a.id === bond.atom1Id);
      const atom2 = protein.atoms.find(a => a.id === bond.atom2Id);
      
      if (atom1 && atom2) {
        const bondVector = new THREE.Vector3(
          atom2.position.x - atom1.position.x,
          atom2.position.y - atom1.position.y,
          atom2.position.z - atom1.position.z
        );
        const bondLength = bondVector.length();
        const bondCenter = new THREE.Vector3(
          (atom1.position.x + atom2.position.x) / 2,
          (atom1.position.y + atom2.position.y) / 2,
          (atom1.position.z + atom2.position.z) / 2
        );
        
        // Create cylinder and orient it along bond vector
        const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const cylinder = new THREE.Mesh(cylinderGeometry, material);
        
        // Scale cylinder to bond length
        cylinder.scale.y = bondLength;
        
        // Position at bond center
        cylinder.position.copy(bondCenter);
        
        // Orient cylinder along bond vector
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(up, bondVector.normalize());
        cylinder.setRotationFromQuaternion(quaternion);
        
        group.add(cylinder);
      }
    });
  }
  
  return group;
}
```

#### Cartoon Representation Algorithm
```typescript
// Theory: Simplified representation showing secondary structure
// Uses spline curves through backbone atoms

function createCartoonRepresentation(protein: ProteinStructure): THREE.Group {
  const group = new THREE.Group();
  
  protein.chains.forEach(chain => {
    // Extract backbone atoms (CA - alpha carbon)
    const backbonePoints: THREE.Vector3[] = [];
    const secondaryStructures: SecondaryStructure[] = [];
    
    chain.residues.forEach(residue => {
      const caAtom = residue.atoms.find(atom => atom.name === 'CA');
      if (caAtom) {
        backbonePoints.push(new THREE.Vector3(
          caAtom.position.x,
          caAtom.position.y,
          caAtom.position.z
        ));
        
        // Find secondary structure for this residue
        const structure = protein.secondaryStructure.find(
          s => residue.position >= s.start && residue.position <= s.end
        );
        secondaryStructures.push(structure || { type: 'coil', start: 0, end: 0 });
      }
    });
    
    if (backbonePoints.length < 2) return;
    
    // Create smooth spline curve through backbone
    const curve = new THREE.CatmullRomCurve3(backbonePoints);
    
    // Create different geometries based on secondary structure
    let currentStructure = secondaryStructures[0];
    let segmentStart = 0;
    
    for (let i = 1; i < secondaryStructures.length; i++) {
      if (secondaryStructures[i].type !== currentStructure.type || i === secondaryStructures.length - 1) {
        // Create geometry for current segment
        const segmentCurve = new THREE.CatmullRomCurve3(
          backbonePoints.slice(segmentStart, i + 1)
        );
        
        let geometry: THREE.BufferGeometry;
        let material: THREE.Material;
        
        switch (currentStructure.type) {
          case 'helix':
            // Thick tube for alpha helices
            geometry = new THREE.TubeGeometry(segmentCurve, 50, 0.8, 8, false);
            material = new THREE.MeshPhongMaterial({ color: 0xff6b6b }); // Red
            break;
            
          case 'sheet':
            // Flat ribbon for beta sheets
            geometry = createRibbonGeometry(segmentCurve, 1.5, 0.2);
            material = new THREE.MeshPhongMaterial({ color: 0x4ecdc4 }); // Teal
            break;
            
          default: // coil
            // Thin tube for random coil
            geometry = new THREE.TubeGeometry(segmentCurve, 30, 0.3, 6, false);
            material = new THREE.MeshPhongMaterial({ color: 0xffe66d }); // Yellow
            break;
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        
        // Update for next segment
        currentStructure = secondaryStructures[i];
        segmentStart = i;
      }
    }
  });
  
  return group;
}

// Custom ribbon geometry for beta sheets
function createRibbonGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  width: number,
  thickness: number
): THREE.BufferGeometry {
  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry();
  
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  
  // Generate ribbon vertices
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    
    // Calculate tangent and normal vectors
    const tangent = i < points.length - 1 
      ? points[i + 1].clone().sub(point).normalize()
      : points[i].clone().sub(points[i - 1]).normalize();
    
    const up = new THREE.Vector3(0, 1, 0);
    const binormal = tangent.clone().cross(up).normalize();
    const normal = binormal.clone().cross(tangent).normalize();
    
    // Create ribbon cross-section
    const halfWidth = width / 2;
    const halfThickness = thickness / 2;
    
    // Four vertices per cross-section (rectangular ribbon)
    const v1 = point.clone().add(binormal.clone().multiplyScalar(-halfWidth)).add(normal.clone().multiplyScalar(halfThickness));
    const v2 = point.clone().add(binormal.clone().multiplyScalar(halfWidth)).add(normal.clone().multiplyScalar(halfThickness));
    const v3 = point.clone().add(binormal.clone().multiplyScalar(halfWidth)).add(normal.clone().multiplyScalar(-halfThickness));
    const v4 = point.clone().add(binormal.clone().multiplyScalar(-halfWidth)).add(normal.clone().multiplyScalar(-halfThickness));
    
    vertices.push(v1.x, v1.y, v1.z);
    vertices.push(v2.x, v2.y, v2.z);
    vertices.push(v3.x, v3.y, v3.z);
    vertices.push(v4.x, v4.y, v4.z);
    
    // Normals for lighting
    normals.push(normal.x, normal.y, normal.z);
    normals.push(normal.x, normal.y, normal.z);
    normals.push(normal.x, normal.y, normal.z);
    normals.push(normal.x, normal.y, normal.z);
    
    // Create triangles connecting cross-sections
    if (i < points.length - 1) {
      const base = i * 4;
      const next = (i + 1) * 4;
      
      // Two triangles per quad
      indices.push(base, base + 1, next);
      indices.push(base + 1, next + 1, next);
      indices.push(base + 1, base + 2, next + 1);
      indices.push(base + 2, next + 2, next + 1);
      indices.push(base + 2, base + 3, next + 2);
      indices.push(base + 3, next + 3, next + 2);
      indices.push(base + 3, base, next + 3);
      indices.push(base, next, next + 3);
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  
  return geometry;
}
```

---

## ALGORITHM THEORY

### Protein Analysis Algorithms

#### Ramachandran Plot Algorithm
```typescript
// Theory: Phi-Psi angle analysis for protein structure validation
// Plots backbone dihedral angles to identify allowed conformations

interface DihedralAngles {
  phi: number;   // N-CA-C-N dihedral angle
  psi: number;   // CA-C-N-CA dihedral angle
  omega: number; // C-N-CA-C dihedral angle (peptide bond)
}

function calculateDihedralAngle(
  p1: Vector3, p2: Vector3, p3: Vector3, p4: Vector3
): number {
  // Calculate dihedral angle between four points
  // Uses the formula: atan2(dot(n1 × n2, v2), dot(n1, n2))
  
  const v1 = p2.subtract(p1);
  const v2 = p3.subtract(p2);
  const v3 = p4.subtract(p3);
  
  const n1 = v1.cross(v2).normalize();
  const n2 = v2.cross(v3).normalize();
  
  const cosAngle = n1.dot(n2);
  const sinAngle = n1.cross(n2).dot(v2.normalize());
  
  return Math.atan2(sinAngle, cosAngle) * (180 / Math.PI);
}

function calculateRamachandranAngles(protein: ProteinStructure): DihedralAngles[] {
  const angles: DihedralAngles[] = [];
  
  protein.chains.forEach(chain => {
    for (let i = 1; i < chain.residues.length - 1; i++) {
      const prevResidue = chain.residues[i - 1];
      const currentResidue = chain.residues[i];
      const nextResidue = chain.residues[i + 1];
      
      // Get backbone atoms
      const prevC = prevResidue.atoms.find(a => a.name === 'C');
      const currentN = currentResidue.atoms.find(a => a.name === 'N');
      const currentCA = currentResidue.atoms.find(a => a.name === 'CA');
      const currentC = currentResidue.atoms.find(a => a.name === 'C');
      const nextN = nextResidue.atoms.find(a => a.name === 'N');
      const nextCA = nextResidue.atoms.find(a => a.name === 'CA');
      
      if (prevC && currentN && currentCA && currentC && nextN && nextCA) {
        // Calculate phi angle: C(i-1) - N(i) - CA(i) - C(i)
        const phi = calculateDihedralAngle(
          prevC.position,
          currentN.position,
          currentCA.position,
          currentC.position
        );
        
        // Calculate psi angle: N(i) - CA(i) - C(i) - N(i+1)
        const psi = calculateDihedralAngle(
          currentN.position,
          currentCA.position,
          currentC.position,
          nextN.position
        );
        
        // Calculate omega angle: CA(i) - C(i) - N(i+1) - CA(i+1)
        const omega = calculateDihedralAngle(
          currentCA.position,
          currentC.position,
          nextN.position,
          nextCA.position
        );
        
        angles.push({ phi, psi, omega });
      }
    }
  });
  
  return angles;
}

// Classify secondary structure based on phi-psi angles
function classifySecondaryStructure(phi: number, psi: number): string {
  // Alpha helix region
  if (phi >= -180 && phi <= -30 && psi >= -90 && psi <= 45) {
    return 'helix';
  }
  
  // Beta sheet region
  if (phi >= -180 && phi <= -30 && psi >= 90 && psi <= 180) {
    return 'sheet';
  }
  
  // Left-handed helix (rare)
  if (phi >= 30 && phi <= 180 && psi >= 30 && psi <= 180) {
    return 'left-helix';
  }
  
  // Random coil
  return 'coil';
}
```
##
## Hydrogen Bond Detection Algorithm
```typescript
// Theory: Geometric criteria for hydrogen bond identification
// Distance and angle constraints based on chemical principles

interface HydrogenBond {
  donor: Atom;
  hydrogen: Atom;
  acceptor: Atom;
  distance: number;
  angle: number;
  energy: number;
}

function detectHydrogenBonds(protein: ProteinStructure): HydrogenBond[] {
  const bonds: HydrogenBond[] = [];
  
  // Identify potential donors and acceptors
  const donors: { atom: Atom; hydrogens: Atom[] }[] = [];
  const acceptors: Atom[] = [];
  
  protein.atoms.forEach(atom => {
    // Donors: N, O with attached hydrogens
    if (atom.element === 'N' || atom.element === 'O') {
      const attachedHydrogens = protein.atoms.filter(h => 
        h.element === 'H' && 
        calculateDistance(atom.position, h.position) < 1.2
      );
      
      if (attachedHydrogens.length > 0) {
        donors.push({ atom, hydrogens: attachedHydrogens });
      }
    }
    
    // Acceptors: N, O, S with lone pairs
    if (atom.element === 'N' || atom.element === 'O' || atom.element === 'S') {
      acceptors.push(atom);
    }
  });
  
  // Check all donor-acceptor pairs
  donors.forEach(donor => {
    donor.hydrogens.forEach(hydrogen => {
      acceptors.forEach(acceptor => {
        // Skip self-interactions
        if (donor.atom.id === acceptor.id) return;
        
        const donorAcceptorDistance = calculateDistance(
          donor.atom.position,
          acceptor.position
        );
        
        const hydrogenAcceptorDistance = calculateDistance(
          hydrogen.position,
          acceptor.position
        );
        
        // Distance criteria
        if (donorAcceptorDistance > 3.5 || hydrogenAcceptorDistance > 2.5) {
          return;
        }
        
        // Angle criteria: Donor-Hydrogen-Acceptor angle
        const angle = calculateAngle(
          donor.atom.position,
          hydrogen.position,
          acceptor.position
        );
        
        // Hydrogen bonds are roughly linear (angle > 120°)
        if (angle < 120) return;
        
        // Calculate bond energy (simplified)
        const energy = calculateHydrogenBondEnergy(
          donorAcceptorDistance,
          angle,
          donor.atom.element,
          acceptor.element
        );
        
        bonds.push({
          donor: donor.atom,
          hydrogen,
          acceptor,
          distance: donorAcceptorDistance,
          angle,
          energy
        });
      });
    });
  });
  
  // Sort by energy (strongest first)
  return bonds.sort((a, b) => b.energy - a.energy);
}

function calculateHydrogenBondEnergy(
  distance: number,
  angle: number,
  donorElement: string,
  acceptorElement: string
): number {
  // Simplified energy calculation
  // Real calculation would use quantum mechanical methods
  
  // Distance component (inverse relationship)
  const distanceComponent = 1 / (distance * distance);
  
  // Angle component (cosine of deviation from 180°)
  const angleComponent = Math.cos((180 - angle) * Math.PI / 180);
  
  // Element-specific factors
  const elementFactors: Record<string, number> = {
    'N': 1.0,
    'O': 1.2,
    'S': 0.8
  };
  
  const donorFactor = elementFactors[donorElement] || 1.0;
  const acceptorFactor = elementFactors[acceptorElement] || 1.0;
  
  // Combine components
  return distanceComponent * angleComponent * donorFactor * acceptorFactor * 10;
}

function calculateAngle(p1: Vector3, p2: Vector3, p3: Vector3): number {
  const v1 = p1.subtract(p2).normalize();
  const v2 = p3.subtract(p2).normalize();
  const cosAngle = v1.dot(v2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}
```

#### Surface Area and Volume Calculations
```typescript
// Theory: Molecular surface calculations using probe sphere method
// Solvent Accessible Surface Area (SASA) and Molecular Surface

interface SurfacePoint {
  position: Vector3;
  normal: Vector3;
  atomId: string;
  accessible: boolean;
}

function calculateSolventAccessibleSurface(
  protein: ProteinStructure,
  probeRadius: number = 1.4 // Water molecule radius
): { area: number; volume: number; points: SurfacePoint[] } {
  const points: SurfacePoint[] = [];
  let totalArea = 0;
  let totalVolume = 0;
  
  // For each atom, generate test points on expanded sphere
  protein.atoms.forEach(atom => {
    const atomRadius = VAN_DER_WAALS_RADII[atom.element] || 1.5;
    const expandedRadius = atomRadius + probeRadius;
    
    // Generate uniform points on sphere using Fibonacci spiral
    const numPoints = Math.max(100, Math.floor(expandedRadius * expandedRadius * 50));
    const spherePoints = generateFibonacciSphere(numPoints);
    
    spherePoints.forEach(point => {
      const worldPoint = new Vector3(
        atom.position.x + point.x * expandedRadius,
        atom.position.y + point.y * expandedRadius,
        atom.position.z + point.z * expandedRadius
      );
      
      // Check if point is accessible (not inside other atoms)
      let accessible = true;
      
      for (const otherAtom of protein.atoms) {
        if (otherAtom.id === atom.id) continue;
        
        const otherRadius = VAN_DER_WAALS_RADII[otherAtom.element] || 1.5;
        const distance = calculateDistance(worldPoint, otherAtom.position);
        
        if (distance < otherRadius + probeRadius) {
          accessible = false;
          break;
        }
      }
      
      points.push({
        position: worldPoint,
        normal: point, // Point on unit sphere is the normal
        atomId: atom.id,
        accessible
      });
      
      if (accessible) {
        // Approximate area contribution
        const sphereArea = 4 * Math.PI * expandedRadius * expandedRadius;
        totalArea += sphereArea / numPoints;
      }
    });
  });
  
  // Calculate volume using Monte Carlo integration
  const boundingBox = calculateBoundingBox(protein);
  const volumeSamples = 100000;
  let insideCount = 0;
  
  for (let i = 0; i < volumeSamples; i++) {
    const testPoint = new Vector3(
      boundingBox.min.x + Math.random() * (boundingBox.max.x - boundingBox.min.x),
      boundingBox.min.y + Math.random() * (boundingBox.max.y - boundingBox.min.y),
      boundingBox.min.z + Math.random() * (boundingBox.max.z - boundingBox.min.z)
    );
    
    // Check if point is inside any atom
    for (const atom of protein.atoms) {
      const atomRadius = VAN_DER_WAALS_RADII[atom.element] || 1.5;
      const distance = calculateDistance(testPoint, atom.position);
      
      if (distance < atomRadius + probeRadius) {
        insideCount++;
        break;
      }
    }
  }
  
  const boundingVolume = 
    (boundingBox.max.x - boundingBox.min.x) *
    (boundingBox.max.y - boundingBox.min.y) *
    (boundingBox.max.z - boundingBox.min.z);
  
  totalVolume = boundingVolume * (insideCount / volumeSamples);
  
  return { area: totalArea, volume: totalVolume, points };
}

function generateFibonacciSphere(numPoints: number): Vector3[] {
  const points: Vector3[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  
  for (let i = 0; i < numPoints; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / numPoints);
    
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);
    
    points.push(new Vector3(x, y, z));
  }
  
  return points;
}
```

### Optimization Algorithms

#### Spatial Data Structures - Octree
```typescript
// Theory: Hierarchical space partitioning for efficient spatial queries
// Reduces O(n²) distance calculations to O(log n)

class OctreeNode {
  center: Vector3;
  size: number;
  atoms: Atom[];
  children: OctreeNode[] | null;
  
  constructor(center: Vector3, size: number) {
    this.center = center;
    this.size = size;
    this.atoms = [];
    this.children = null;
  }
  
  insert(atom: Atom): void {
    // If atom is outside this node's bounds, don't insert
    if (!this.contains(atom.position)) return;
    
    // If this is a leaf node and not full, add atom
    if (!this.children && this.atoms.length < 8) {
      this.atoms.push(atom);
      return;
    }
    
    // If this is a leaf node but full, subdivide
    if (!this.children) {
      this.subdivide();
      
      // Redistribute existing atoms to children
      const atomsToRedistribute = [...this.atoms];
      this.atoms = [];
      
      atomsToRedistribute.forEach(a => this.insert(a));
    }
    
    // Insert into appropriate child
    this.children!.forEach(child => child.insert(atom));
  }
  
  private subdivide(): void {
    const halfSize = this.size / 2;
    const quarterSize = halfSize / 2;
    
    this.children = [
      // Bottom level
      new OctreeNode(new Vector3(this.center.x - quarterSize, this.center.y - quarterSize, this.center.z - quarterSize), halfSize),
      new OctreeNode(new Vector3(this.center.x + quarterSize, this.center.y - quarterSize, this.center.z - quarterSize), halfSize),
      new OctreeNode(new Vector3(this.center.x - quarterSize, this.center.y + quarterSize, this.center.z - quarterSize), halfSize),
      new OctreeNode(new Vector3(this.center.x + quarterSize, this.center.y + quarterSize, this.center.z - quarterSize), halfSize),
      // Top level
      new OctreeNode(new Vector3(this.center.x - quarterSize, this.center.y - quarterSize, this.center.z + quarterSize), halfSize),
      new OctreeNode(new Vector3(this.center.x + quarterSize, this.center.y - quarterSize, this.center.z + quarterSize), halfSize),
      new OctreeNode(new Vector3(this.center.x - quarterSize, this.center.y + quarterSize, this.center.z + quarterSize), halfSize),
      new OctreeNode(new Vector3(this.center.x + quarterSize, this.center.y + quarterSize, this.center.z + quarterSize), halfSize)
    ];
  }
  
  private contains(point: Vector3): boolean {
    const halfSize = this.size / 2;
    return (
      point.x >= this.center.x - halfSize && point.x <= this.center.x + halfSize &&
      point.y >= this.center.y - halfSize && point.y <= this.center.y + halfSize &&
      point.z >= this.center.z - halfSize && point.z <= this.center.z + halfSize
    );
  }
  
  queryRange(center: Vector3, radius: number): Atom[] {
    const result: Atom[] = [];
    
    // Check if query sphere intersects with this node
    if (!this.intersectsSphere(center, radius)) {
      return result;
    }
    
    // Add atoms from this node that are within range
    this.atoms.forEach(atom => {
      if (calculateDistance(atom.position, center) <= radius) {
        result.push(atom);
      }
    });
    
    // Recursively query children
    if (this.children) {
      this.children.forEach(child => {
        result.push(...child.queryRange(center, radius));
      });
    }
    
    return result;
  }
  
  private intersectsSphere(center: Vector3, radius: number): boolean {
    const halfSize = this.size / 2;
    
    // Find closest point on box to sphere center
    const closestX = Math.max(this.center.x - halfSize, Math.min(center.x, this.center.x + halfSize));
    const closestY = Math.max(this.center.y - halfSize, Math.min(center.y, this.center.y + halfSize));
    const closestZ = Math.max(this.center.z - halfSize, Math.min(center.z, this.center.z + halfSize));
    
    const distance = Math.sqrt(
      (center.x - closestX) ** 2 +
      (center.y - closestY) ** 2 +
      (center.z - closestZ) ** 2
    );
    
    return distance <= radius;
  }
}

class ProteinOctree {
  root: OctreeNode;
  
  constructor(protein: ProteinStructure) {
    const boundingBox = calculateBoundingBox(protein);
    const center = new Vector3(
      (boundingBox.min.x + boundingBox.max.x) / 2,
      (boundingBox.min.y + boundingBox.max.y) / 2,
      (boundingBox.min.z + boundingBox.max.z) / 2
    );
    
    const size = Math.max(
      boundingBox.max.x - boundingBox.min.x,
      boundingBox.max.y - boundingBox.min.y,
      boundingBox.max.z - boundingBox.min.z
    ) * 1.1; // Add 10% padding
    
    this.root = new OctreeNode(center, size);
    
    // Insert all atoms
    protein.atoms.forEach(atom => this.root.insert(atom));
  }
  
  findNeighbors(position: Vector3, radius: number): Atom[] {
    return this.root.queryRange(position, radius);
  }
}

// Usage example for efficient neighbor finding
function findCloseContacts(protein: ProteinStructure, maxDistance: number = 4.0): Array<{atom1: Atom, atom2: Atom, distance: number}> {
  const octree = new ProteinOctree(protein);
  const contacts: Array<{atom1: Atom, atom2: Atom, distance: number}> = [];
  
  protein.atoms.forEach(atom1 => {
    const neighbors = octree.findNeighbors(atom1.position, maxDistance);
    
    neighbors.forEach(atom2 => {
      if (atom1.id < atom2.id) { // Avoid duplicate pairs
        const distance = calculateDistance(atom1.position, atom2.position);
        if (distance <= maxDistance) {
          contacts.push({ atom1, atom2, distance });
        }
      }
    });
  });
  
  return contacts.sort((a, b) => a.distance - b.distance);
}
```

---

## PERFORMANCE OPTIMIZATION THEORY

### Level of Detail (LOD) Systems
```typescript
// Theory: Adaptive rendering based on distance and importance
// Reduces computational load while maintaining visual quality

interface LODLevel {
  distance: number;
  atomDetail: 'full' | 'simplified' | 'impostor';
  bondDetail: 'full' | 'simplified' | 'none';
  geometryComplexity: number; // 0-1 scale
}

class ProteinLODManager {
  private lodLevels: LODLevel[] = [
    { distance: 0, atomDetail: 'full', bondDetail: 'full', geometryComplexity: 1.0 },
    { distance: 50, atomDetail: 'simplified', bondDetail: 'simplified', geometryComplexity: 0.6 },
    { distance: 100, atomDetail: 'impostor', bondDetail: 'none', geometryComplexity: 0.3 },
    { distance: 200, atomDetail: 'impostor', bondDetail: 'none', geometryComplexity: 0.1 }
  ];
  
  getLODLevel(cameraDistance: number): LODLevel {
    for (let i = this.lodLevels.length - 1; i >= 0; i--) {
      if (cameraDistance >= this.lodLevels[i].distance) {
        return this.lodLevels[i];
      }
    }
    return this.lodLevels[0];
  }
  
  createLODGeometry(protein: ProteinStructure, lodLevel: LODLevel): THREE.Group {
    const group = new THREE.Group();
    
    switch (lodLevel.atomDetail) {
      case 'full':
        return this.createFullDetailAtoms(protein, lodLevel.geometryComplexity);
        
      case 'simplified':
        return this.createSimplifiedAtoms(protein, lodLevel.geometryComplexity);
        
      case 'impostor':
        return this.createImpostorAtoms(protein);
    }
    
    return group;
  }
  
  private createFullDetailAtoms(protein: ProteinStructure, complexity: number): THREE.Group {
    const group = new THREE.Group();
    const sphereSegments = Math.max(8, Math.floor(32 * complexity));
    
    // Create high-quality sphere geometry
    const sphereGeometry = new THREE.SphereGeometry(1, sphereSegments, sphereSegments);
    
    protein.atoms.forEach(atom => {
      const radius = VAN_DER_WAALS_RADII[atom.element] || 1.5;
      const material = new THREE.MeshPhongMaterial({
        color: getAtomColor(atom.element),
        shininess: 100
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, material);
      sphere.position.set(atom.position.x, atom.position.y, atom.position.z);
      sphere.scale.setScalar(radius);
      
      group.add(sphere);
    });
    
    return group;
  }
  
  private createSimplifiedAtoms(protein: ProteinStructure, complexity: number): THREE.Group {
    const group = new THREE.Group();
    const sphereSegments = Math.max(6, Math.floor(16 * complexity));
    
    // Create lower-quality sphere geometry
    const sphereGeometry = new THREE.SphereGeometry(1, sphereSegments, sphereSegments);
    
    // Group atoms by element for instanced rendering
    const atomsByElement = protein.atoms.reduce((acc, atom) => {
      if (!acc[atom.element]) acc[atom.element] = [];
      acc[atom.element].push(atom);
      return acc;
    }, {} as Record<string, Atom[]>);
    
    Object.entries(atomsByElement).forEach(([element, atoms]) => {
      const material = new THREE.MeshLambertMaterial({
        color: getAtomColor(element)
      });
      
      const instancedMesh = new THREE.InstancedMesh(
        sphereGeometry,
        material,
        atoms.length
      );
      
      atoms.forEach((atom, index) => {
        const radius = VAN_DER_WAALS_RADII[atom.element] || 1.5;
        const matrix = new THREE.Matrix4();
        matrix.compose(
          new THREE.Vector3(atom.position.x, atom.position.y, atom.position.z),
          new THREE.Quaternion(),
          new THREE.Vector3(radius, radius, radius)
        );
        instancedMesh.setMatrixAt(index, matrix);
      });
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      group.add(instancedMesh);
    });
    
    return group;
  }
  
  private createImpostorAtoms(protein: ProteinStructure): THREE.Group {
    const group = new THREE.Group();
    
    // Use billboards (always face camera) for distant atoms
    const billboardGeometry = new THREE.PlaneGeometry(2, 2);
    
    protein.atoms.forEach(atom => {
      const material = new THREE.MeshBasicMaterial({
        color: getAtomColor(atom.element),
        transparent: true,
        alphaTest: 0.5,
        map: this.createAtomTexture(atom.element)
      });
      
      const billboard = new THREE.Mesh(billboardGeometry, material);
      billboard.position.set(atom.position.x, atom.position.y, atom.position.z);
      
      // Make billboard always face camera
      billboard.lookAt = (camera: THREE.Camera) => {
        billboard.lookAt(camera.position);
      };
      
      group.add(billboard);
    });
    
    return group;
  }
  
  private createAtomTexture(element: string): THREE.Texture {
    // Create a simple circular texture for atom impostors
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const color = getAtomColor(element);
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, `#${color.toString(16).padStart(6, '0')}`);
    gradient.addColorStop(0.7, `#${color.toString(16).padStart(6, '0')}88`);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
}
```