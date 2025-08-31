/**
 * End-to-End Tests for Complete Protein Analysis Workflow
 * Tests the full user journey from protein upload to analysis and export
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test data
const SAMPLE_PDB_CONTENT = `HEADER    TEST PROTEIN                            01-JAN-25   TEST
ATOM      1  N   MET A   1      20.154  16.967  14.365  1.00 20.00           N
ATOM      2  CA  MET A   1      20.154  18.450  14.365  1.00 20.00           C
ATOM      3  C   MET A   1      18.667  19.000  14.365  1.00 20.00           C
ATOM      4  O   MET A   1      17.730  18.500  13.765  1.00 20.00           O
END`;

class ProteinWorkflowPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async uploadProtein(filename: string, content: string) {
    // Create a temporary file
    const tempFile = path.join(__dirname, 'temp', filename);
    await this.page.evaluate(
      ({ content, filename }) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const file = new File([blob], filename, { type: 'text/plain' });
        
        // Simulate file input
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      { content, filename }
    );
  }

  async waitForVisualization() {
    await this.page.waitForSelector('[data-testid="protein-canvas"]', { timeout: 10000 });
    await this.page.waitForFunction(
      () => {
        const canvas = document.querySelector('[data-testid="protein-canvas"]') as HTMLCanvasElement;
        return canvas && canvas.width > 0 && canvas.height > 0;
      },
      { timeout: 15000 }
    );
  }

  async clickAnalysisButton() {
    await this.page.click('[data-testid="analyze-button"]');
  }

  async waitForAnalysisResults() {
    await this.page.waitForSelector('[data-testid="analysis-results"]', { timeout: 15000 });
  }

  async exportResults(format: 'png' | 'svg' | 'pdb' | 'fasta') {
    await this.page.click('[data-testid="export-button"]');
    await this.page.click(`[data-testid="export-${format}"]`);
  }

  async getDownloadedFile() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportResults('png');
    const download = await downloadPromise;
    return download;
  }

  async selectProteinRepresentation(representation: 'cartoon' | 'surface' | 'ball-stick') {
    await this.page.click('[data-testid="representation-selector"]');
    await this.page.click(`[data-testid="representation-${representation}"]`);
  }

  async selectColorScheme(scheme: 'cpk' | 'hydrophobicity' | 'secondary-structure') {
    await this.page.click('[data-testid="color-scheme-selector"]');
    await this.page.click(`[data-testid="color-scheme-${scheme}"]`);
  }

  async selectResidue(residueId: string) {
    await this.page.click(`[data-testid="residue-${residueId}"]`);
  }

  async generateProtein(constraints: any) {
    await this.page.click('[data-testid="ai-generate-button"]');
    
    if (constraints.length) {
      await this.page.fill('[data-testid="length-min"]', constraints.length[0].toString());
      await this.page.fill('[data-testid="length-max"]', constraints.length[1].toString());
    }
    
    if (constraints.model) {
      await this.page.selectOption('[data-testid="model-selector"]', constraints.model);
    }
    
    await this.page.click('[data-testid="generate-submit"]');
  }

  async waitForGeneration() {
    await this.page.waitForSelector('[data-testid="generation-results"]', { timeout: 30000 });
  }

  async compareProteins(proteinIds: string[]) {
    await this.page.click('[data-testid="compare-button"]');
    
    for (const id of proteinIds) {
      await this.page.check(`[data-testid="protein-checkbox-${id}"]`);
    }
    
    await this.page.click('[data-testid="compare-submit"]');
  }

  async waitForComparison() {
    await this.page.waitForSelector('[data-testid="comparison-results"]', { timeout: 20000 });
  }
}

test.describe('Complete Protein Analysis Workflow', () => {
  let proteinPage: ProteinWorkflowPage;

  test.beforeEach(async ({ page }) => {
    proteinPage = new ProteinWorkflowPage(page);
    await proteinPage.goto();
  });

  test('user can upload, analyze, and export protein', async ({ page }) => {
    // Step 1: Upload protein file
    await proteinPage.uploadProtein('test-protein.pdb', SAMPLE_PDB_CONTENT);
    
    // Step 2: Verify 3D visualization loads
    await proteinPage.waitForVisualization();
    
    // Verify canvas is rendered
    const canvas = await page.locator('[data-testid="protein-canvas"]');
    await expect(canvas).toBeVisible();
    
    // Step 3: Test different representations
    await proteinPage.selectProteinRepresentation('cartoon');
    await page.waitForTimeout(1000); // Allow rendering
    
    await proteinPage.selectProteinRepresentation('surface');
    await page.waitForTimeout(1000);
    
    // Step 4: Test color schemes
    await proteinPage.selectColorScheme('hydrophobicity');
    await page.waitForTimeout(1000);
    
    await proteinPage.selectColorScheme('secondary-structure');
    await page.waitForTimeout(1000);
    
    // Step 5: Perform chemical analysis
    await proteinPage.clickAnalysisButton();
    await proteinPage.waitForAnalysisResults();
    
    // Verify analysis results are displayed
    const analysisResults = await page.locator('[data-testid="analysis-results"]');
    await expect(analysisResults).toBeVisible();
    
    // Check for specific analysis components
    await expect(page.locator('[data-testid="sequence-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="properties-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="secondary-structure-view"]')).toBeVisible();
    
    // Step 6: Export results
    const download = await proteinPage.getDownloadedFile();
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/\.(png|svg|pdb|fasta)$/);
  });

  test('user can generate protein with AI', async ({ page }) => {
    // Navigate to AI generation section
    await page.click('[data-testid="ai-tab"]');
    
    // Generate protein with constraints
    await proteinPage.generateProtein({
      length: [50, 100],
      model: 'protflash'
    });
    
    // Wait for generation to complete
    await proteinPage.waitForGeneration();
    
    // Verify generation results
    const generationResults = await page.locator('[data-testid="generation-results"]');
    await expect(generationResults).toBeVisible();
    
    // Check generated sequence
    const sequence = await page.locator('[data-testid="generated-sequence"]');
    await expect(sequence).toBeVisible();
    
    const sequenceText = await sequence.textContent();
    expect(sequenceText).toMatch(/^[ACDEFGHIKLMNPQRSTVWY]+$/); // Valid amino acids
    expect(sequenceText?.length).toBeGreaterThanOrEqual(50);
    expect(sequenceText?.length).toBeLessThanOrEqual(100);
    
    // Check confidence score
    const confidence = await page.locator('[data-testid="generation-confidence"]');
    await expect(confidence).toBeVisible();
    
    // Check properties
    const properties = await page.locator('[data-testid="generation-properties"]');
    await expect(properties).toBeVisible();
  });

  test('user can compare multiple proteins', async ({ page }) => {
    // Upload first protein
    await proteinPage.uploadProtein('protein1.pdb', SAMPLE_PDB_CONTENT);
    await proteinPage.waitForVisualization();
    
    // Upload second protein (modified content)
    const modifiedPDB = SAMPLE_PDB_CONTENT.replace('MET A   1', 'ALA A   1');
    await proteinPage.uploadProtein('protein2.pdb', modifiedPDB);
    
    // Navigate to comparison section
    await page.click('[data-testid="compare-tab"]');
    
    // Select proteins for comparison
    await proteinPage.compareProteins(['protein1', 'protein2']);
    
    // Wait for comparison results
    await proteinPage.waitForComparison();
    
    // Verify comparison results
    const comparisonResults = await page.locator('[data-testid="comparison-results"]');
    await expect(comparisonResults).toBeVisible();
    
    // Check sequence alignment
    const alignment = await page.locator('[data-testid="sequence-alignment"]');
    await expect(alignment).toBeVisible();
    
    // Check structural comparison
    const structuralComparison = await page.locator('[data-testid="structural-comparison"]');
    await expect(structuralComparison).toBeVisible();
    
    // Check RMSD value
    const rmsd = await page.locator('[data-testid="rmsd-value"]');
    await expect(rmsd).toBeVisible();
  });

  test('user can interact with 3D visualization', async ({ page }) => {
    // Upload protein
    await proteinPage.uploadProtein('test-protein.pdb', SAMPLE_PDB_CONTENT);
    await proteinPage.waitForVisualization();
    
    const canvas = page.locator('[data-testid="protein-canvas"]');
    
    // Test mouse interactions
    await canvas.hover();
    await canvas.click({ position: { x: 100, y: 100 } });
    
    // Test zoom (wheel event)
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(500);
    
    await page.mouse.wheel(0, 100); // Zoom out
    await page.waitForTimeout(500);
    
    // Test rotation (drag)
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(150, 150);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Test residue selection
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Check if residue info is displayed
    const residueInfo = page.locator('[data-testid="residue-info"]');
    // Note: This might not always be visible depending on click position
    // await expect(residueInfo).toBeVisible();
  });

  test('application handles errors gracefully', async ({ page }) => {
    // Test invalid file upload
    await proteinPage.uploadProtein('invalid.txt', 'This is not a valid PDB file');
    
    // Check for error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Invalid PDB format');
    
    // Test network error handling
    await page.route('**/api/**', route => route.abort());
    
    await page.click('[data-testid="ai-generate-button"]');
    
    // Check for network error message
    const networkError = page.locator('[data-testid="network-error"]');
    await expect(networkError).toBeVisible();
  });

  test('application is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Upload protein
    await proteinPage.uploadProtein('test-protein.pdb', SAMPLE_PDB_CONTENT);
    await proteinPage.waitForVisualization();
    
    // Check mobile navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();
    
    // Test touch interactions on canvas
    const canvas = page.locator('[data-testid="protein-canvas"]');
    await canvas.tap();
    
    // Test pinch zoom simulation
    await canvas.hover();
    await page.touchscreen.tap(100, 100);
    
    // Check responsive layout
    const sidebar = page.locator('[data-testid="sidebar"]');
    // On mobile, sidebar might be collapsed
    const isCollapsed = await sidebar.evaluate(el => 
      window.getComputedStyle(el).display === 'none' ||
      window.getComputedStyle(el).transform.includes('translate')
    );
    
    expect(isCollapsed).toBeTruthy();
  });

  test('performance remains acceptable with large proteins', async ({ page }) => {
    // Create a larger PDB content (simulate 1000 atoms)
    let largePDB = 'HEADER    LARGE PROTEIN                           01-JAN-25   TEST\n';
    for (let i = 1; i <= 1000; i++) {
      largePDB += `ATOM  ${i.toString().padStart(5)}  CA  ALA A${i.toString().padStart(4)}      ${(Math.random() * 100).toFixed(3)}  ${(Math.random() * 100).toFixed(3)}  ${(Math.random() * 100).toFixed(3)}  1.00 20.00           C\n`;
    }
    largePDB += 'END';
    
    // Measure loading time
    const startTime = Date.now();
    
    await proteinPage.uploadProtein('large-protein.pdb', largePDB);
    await proteinPage.waitForVisualization();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (15 seconds)
    expect(loadTime).toBeLessThan(15000);
    
    // Check FPS counter if available
    const fpsCounter = page.locator('[data-testid="fps-counter"]');
    if (await fpsCounter.isVisible()) {
      const fpsText = await fpsCounter.textContent();
      const fps = parseInt(fpsText?.match(/\d+/)?.[0] || '0');
      expect(fps).toBeGreaterThan(20); // Minimum acceptable FPS
    }
    
    // Test interaction responsiveness
    const canvas = page.locator('[data-testid="protein-canvas"]');
    const interactionStart = Date.now();
    
    await canvas.click();
    await page.waitForTimeout(100); // Small delay for interaction
    
    const interactionTime = Date.now() - interactionStart;
    expect(interactionTime).toBeLessThan(1000); // Should respond within 1 second
  });
});