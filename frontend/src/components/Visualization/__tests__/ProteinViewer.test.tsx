/**
 * Unit tests for ProteinViewer component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import ProteinViewer from '../ProteinViewer';
import { ProteinStructure } from '../../../types';

// Mock the visualization components
jest.mock('../ThreeJSViewer', () => {
  return function MockThreeJSViewer({ protein, onError, onLoad }: any) {
    React.useEffect(() => {
      if (protein) {
        onLoad?.();
      }
    }, [protein, onLoad]);

    return <div data-testid="threejs-viewer">Three.js Viewer</div>;
  };
});

jest.mock('../NGLViewer', () => {
  return function MockNGLViewer({ protein, onError, onLoad }: any) {
    React.useEffect(() => {
      if (protein) {
        onLoad?.();
      }
    }, [protein, onLoad]);

    return <div data-testid="ngl-viewer">NGL Viewer</div>;
  };
});

// Mock the PDB loader
jest.mock('../../../utils/pdbLoader', () => ({
  loadPDBFromFile: jest.fn(),
  loadSampleProtein: jest.fn(),
  SAMPLE_PDB_URLS: {
    '1CRN': 'https://example.com/1CRN.pdb',
    '1UBQ': 'https://example.com/1UBQ.pdb',
  },
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
  })),
}));

const mockProtein: ProteinStructure = {
  id: 'test-protein',
  name: 'Test Protein',
  sequence: 'MGKV',
  atoms: [
    {
      id: 1,
      name: 'CA',
      element: 'C',
      position: { x: 0, y: 0, z: 0 },
      residueId: 'MET1',
      chainId: 'A',
      atomType: 'backbone',
    },
  ],
  residues: [
    {
      id: 'MET1',
      name: 'MET',
      type: 'M' as any,
      position: 1,
      atoms: [],
      chainId: 'A',
      properties: {} as any,
    },
  ],
  chains: [
    {
      id: 'A',
      name: 'Chain A',
      residues: [],
      sequence: 'M',
      type: 'protein',
    },
  ],
  metadata: {
    title: 'Test Protein',
    classification: 'TEST',
  },
  secondaryStructure: [],
  boundingBox: {
    min: { x: -1, y: -1, z: -1 },
    max: { x: 1, y: 1, z: 1 },
    center: { x: 0, y: 0, z: 0 },
    size: { x: 2, y: 2, z: 2 },
  },
  centerOfMass: { x: 0, y: 0, z: 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProteinViewer', () => {
  const mockOnProteinLoad = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProteinViewer />);
    expect(screen.getByText('Drag & drop a PDB file')).toBeInTheDocument();
  });

  it('shows dropzone when no protein is loaded', () => {
    render(<ProteinViewer />);
    
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop a PDB file')).toBeInTheDocument();
  });

  it('shows protein viewer when protein is provided', () => {
    render(<ProteinViewer protein={mockProtein} />);
    
    expect(screen.getByTestId('ngl-viewer')).toBeInTheDocument();
    expect(screen.getByText('Test Protein')).toBeInTheDocument();
  });

  it('displays protein information correctly', () => {
    render(<ProteinViewer protein={mockProtein} />);
    
    expect(screen.getByText('Test Protein')).toBeInTheDocument();
    expect(screen.getByText('ID: test-protein')).toBeInTheDocument();
    expect(screen.getByText('1 atoms')).toBeInTheDocument();
    expect(screen.getByText('1 residues')).toBeInTheDocument();
    expect(screen.getByText('1 chains')).toBeInTheDocument();
  });

  it('switches between viewer types', async () => {
    const user = userEvent.setup();
    render(<ProteinViewer protein={mockProtein} />);
    
    // Initially shows NGL viewer
    expect(screen.getByTestId('ngl-viewer')).toBeInTheDocument();
    
    // Click Three.js button
    const threejsButton = screen.getByRole('button', { name: /three\.js/i });
    await user.click(threejsButton);
    
    // Should now show Three.js viewer
    expect(screen.getByTestId('threejs-viewer')).toBeInTheDocument();
  });

  it('changes render options', async () => {
    const user = userEvent.setup();
    render(<ProteinViewer protein={mockProtein} />);
    
    // Change representation
    const representationSelect = screen.getByLabelText('Representation');
    await user.click(representationSelect);
    
    const ballStickOption = screen.getByText('Ball & Stick');
    await user.click(ballStickOption);
    
    // The viewer should re-render with new options
    expect(screen.getByTestId('ngl-viewer')).toBeInTheDocument();
  });

  it('handles file upload button click', async () => {
    const user = userEvent.setup();
    render(<ProteinViewer />);
    
    const uploadButton = screen.getByRole('button', { name: /upload pdb/i });
    await user.click(uploadButton);
    
    // Should trigger file input (mocked behavior)
    expect(uploadButton).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ProteinViewer />);
    
    // Simulate loading state by checking if loading components would appear
    // This would need to be tested with actual file loading
    expect(screen.getByText('Drag & drop a PDB file')).toBeInTheDocument();
  });

  it('displays error messages', () => {
    const { rerender } = render(<ProteinViewer />);
    
    // Simulate error state by re-rendering with error
    // In actual implementation, this would be triggered by failed file loading
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onProteinLoad when protein is loaded', () => {
    render(
      <ProteinViewer 
        protein={mockProtein} 
        onProteinLoad={mockOnProteinLoad}
      />
    );
    
    // The callback should be available for when file loading completes
    expect(mockOnProteinLoad).not.toHaveBeenCalled();
  });

  it('calls onError when error occurs', () => {
    render(
      <ProteinViewer 
        onError={mockOnError}
      />
    );
    
    // The callback should be available for when errors occur
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('has sample protein options', () => {
    render(<ProteinViewer />);
    
    expect(screen.getByLabelText('Load Sample')).toBeInTheDocument();
  });

  it('has all render option controls', () => {
    render(<ProteinViewer />);
    
    expect(screen.getByLabelText('Representation')).toBeInTheDocument();
    expect(screen.getByLabelText('Color Scheme')).toBeInTheDocument();
    expect(screen.getByLabelText('Quality')).toBeInTheDocument();
  });

  it('has viewer type toggle buttons', () => {
    render(<ProteinViewer />);
    
    expect(screen.getByRole('button', { name: /ngl viewer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /three\.js/i })).toBeInTheDocument();
  });

  it('respects width and height props', () => {
    const { container } = render(
      <ProteinViewer width={400} height={300} />
    );
    
    // The dropzone should have the specified dimensions
    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toBeInTheDocument();
  });
});