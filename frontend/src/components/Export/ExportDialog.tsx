import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { exportVisualization, exportData } from '../../store/slices/proteinSlice';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  proteinId: string;
  exportType: 'image' | 'data';
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  proteinId,
  exportType
}) => {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector(state => state.proteins);

  // Image export settings
  const [imageFormat, setImageFormat] = useState<'png' | 'svg' | 'jpg'>('png');
  const [resolution, setResolution] = useState<number>(1920);
  const [quality, setQuality] = useState<number>(90);
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [includeLabels, setIncludeLabels] = useState<boolean>(true);
  const [transparentBackground, setTransparentBackground] = useState<boolean>(false);

  // Data export settings
  const [dataFormat, setDataFormat] = useState<'pdb' | 'fasta' | 'json' | 'csv'>('pdb');
  const [includeAnalysis, setIncludeAnalysis] = useState<boolean>(true);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [compression, setCompression] = useState<boolean>(false);

  // Common settings
  const [customFilename, setCustomFilename] = useState<string>('');

  const handleImageFormatChange = (event: SelectChangeEvent) => {
    const format = event.target.value as 'png' | 'svg' | 'jpg';
    setImageFormat(format);
    // SVG doesn't support transparency in the same way
    if (format === 'svg') {
      setTransparentBackground(false);
    }
  };

  const handleDataFormatChange = (event: SelectChangeEvent) => {
    setDataFormat(event.target.value as 'pdb' | 'fasta' | 'json' | 'csv');
  };

  const handleResolutionChange = (event: Event, newValue: number | number[]) => {
    setResolution(newValue as number);
  };

  const handleQualityChange = (event: Event, newValue: number | number[]) => {
    setQuality(newValue as number);
  };

  const handleExport = async () => {
    try {
      if (exportType === 'image') {
        const options = {
          format: imageFormat,
          resolution,
          quality: imageFormat === 'jpg' ? quality : undefined,
          backgroundColor: transparentBackground ? 'transparent' : backgroundColor,
          includeLabels,
          filename: customFilename || undefined
        };

        await dispatch(exportVisualization({ proteinId, options })).unwrap();
      } else {
        const options = {
          format: dataFormat,
          includeAnalysis,
          includeMetadata,
          compression,
          filename: customFilename || undefined
        };

        await dispatch(exportData({ proteinId, options })).unwrap();
      }
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getFileExtension = () => {
    if (exportType === 'image') {
      return imageFormat;
    } else {
      return dataFormat === 'csv' ? 'csv' : dataFormat;
    }
  };

  const getEstimatedFileSize = () => {
    if (exportType === 'image') {
      const pixels = resolution * (resolution * 0.6); // Assume 16:10 aspect ratio
      if (imageFormat === 'png') {
        return `~${Math.round(pixels * 4 / 1024 / 1024)}MB`;
      } else if (imageFormat === 'jpg') {
        return `~${Math.round(pixels * 0.1 / 1024)}KB`;
      } else {
        return '~50-200KB';
      }
    } else {
      if (dataFormat === 'pdb') {
        return '~10-100KB';
      } else if (dataFormat === 'fasta') {
        return '~1-5KB';
      } else if (dataFormat === 'json') {
        return includeAnalysis ? '~50-500KB' : '~10-50KB';
      } else {
        return '~5-20KB';
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Export {exportType === 'image' ? 'Visualization' : 'Data'}
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {exportType === 'image' ? (
            <>
              {/* Image Format */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={imageFormat}
                    label="Format"
                    onChange={handleImageFormatChange}
                  >
                    <MenuItem value="png">PNG (High Quality)</MenuItem>
                    <MenuItem value="jpg">JPEG (Smaller Size)</MenuItem>
                    <MenuItem value="svg">SVG (Vector)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Resolution */}
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>
                  Resolution: {resolution}p
                </Typography>
                <Slider
                  value={resolution}
                  onChange={handleResolutionChange}
                  min={720}
                  max={4320}
                  step={240}
                  marks={[
                    { value: 720, label: '720p' },
                    { value: 1080, label: '1080p' },
                    { value: 1440, label: '1440p' },
                    { value: 2160, label: '4K' },
                    { value: 4320, label: '8K' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>

              {/* Quality (for JPEG) */}
              {imageFormat === 'jpg' && (
                <Grid item xs={12} sm={6}>
                  <Typography gutterBottom>
                    Quality: {quality}%
                  </Typography>
                  <Slider
                    value={quality}
                    onChange={handleQualityChange}
                    min={10}
                    max={100}
                    step={5}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              )}

              {/* Background Color */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Background Color"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={transparentBackground}
                />
              </Grid>

              {/* Options */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeLabels}
                      onChange={(e) => setIncludeLabels(e.target.checked)}
                    />
                  }
                  label="Include Labels and Annotations"
                />
              </Grid>

              {imageFormat !== 'svg' && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={transparentBackground}
                        onChange={(e) => setTransparentBackground(e.target.checked)}
                      />
                    }
                    label="Transparent Background"
                  />
                </Grid>
              )}
            </>
          ) : (
            <>
              {/* Data Format */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={dataFormat}
                    label="Format"
                    onChange={handleDataFormatChange}
                  >
                    <MenuItem value="pdb">PDB (Structure)</MenuItem>
                    <MenuItem value="fasta">FASTA (Sequence)</MenuItem>
                    <MenuItem value="json">JSON (Complete Data)</MenuItem>
                    <MenuItem value="csv">CSV (Analysis Data)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Options */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeAnalysis}
                      onChange={(e) => setIncludeAnalysis(e.target.checked)}
                    />
                  }
                  label="Include Analysis Results"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                    />
                  }
                  label="Include Metadata"
                />
              </Grid>

              {(dataFormat === 'json' || dataFormat === 'csv') && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={compression}
                        onChange={(e) => setCompression(e.target.checked)}
                      />
                    }
                    label="Compress File (GZIP)"
                  />
                </Grid>
              )}
            </>
          )}

          {/* Custom Filename */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Custom Filename (Optional)"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={`protein_${proteinId}.${getFileExtension()}`}
              helperText={`File will be saved as: ${customFilename || `protein_${proteinId}`}.${getFileExtension()}`}
            />
          </Grid>

          {/* File Size Estimate */}
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Estimated file size:</strong> {getEstimatedFileSize()}
              </Typography>
              {exportType === 'image' && resolution > 2160 && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  High resolution exports may take longer to generate and result in large files.
                </Typography>
              )}
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;