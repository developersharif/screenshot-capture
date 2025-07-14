#!/usr/bin/env node

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { captureScreenshot, captureProductionScreenshots, DEVICE_PRESETS, PRODUCTION_SIZES, generateFilename } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Usage: screenshot-capture [URL] [DEVICE] [OPTIONS]

Arguments:
  URL                Website URL (default: http://example.com/)
  DEVICE            Device preset: desktop, laptop, tablet, mobile, mobile-large (default: mobile)

Options:
  --size=SIZE       Production size preset: thumbnail, card, social-media, etc.
  --production      Generate all common production sizes
  --output=DIR      Output directory (default: ./screenshots)
  --help, -h        Show this help

Examples:
  screenshot-capture                                          # Basic mobile screenshot
  screenshot-capture https://example.com desktop              # Desktop screenshot
  screenshot-capture https://example.com mobile --size=thumbnail    # Mobile thumbnail
  screenshot-capture https://example.com desktop --production       # All production sizes
  
Production sizes available: ${Object.keys(PRODUCTION_SIZES).join(', ')}
`);
      return;
    }
    
    const url = args[0] || 'http://example.com/';
    const device = args[1] || 'mobile';
    
    const sizeOption = args.find(arg => arg.startsWith('--size='));
    const isProduction = args.includes('--production');
    const outputOption = args.find(arg => arg.startsWith('--output='));
    
    const outputDir = outputOption ? outputOption.split('=')[1] : join(process.cwd(), 'screenshots');
    const sizePreset = sizeOption ? sizeOption.split('=')[1] : null;
    
    console.log(`Capturing screenshot of: ${url}`);
    console.log(`Device preset: ${device}`);
    
    if (isProduction) {
      console.log(`Mode: Production (multiple sizes)`);
      const results = await captureProductionScreenshots(url, device, 
        ['thumbnail', 'card', 'social-media', 'blog-header'], 
        { outputDir, format: 'png', quality: 90 }
      );
      
      console.log(`\n🎉 Production screenshots captured successfully!`);
      console.log(`Total files: ${results.length}`);
      console.log(`Saved to: ${outputDir}`);
      
    } else if (sizePreset && PRODUCTION_SIZES[sizePreset]) {
      console.log(`Mode: Production size (${sizePreset})`);
      const size = PRODUCTION_SIZES[sizePreset];
      const filename = generateFilename(url, device, 'png', sizePreset);
      const outputPath = join(outputDir, filename);
      
      const screenshot = await captureScreenshot(url, device, {
        outputPath,
        format: 'png',
        quality: 90,
        fullPage: true,
        delay: 1000,
        fixedSize: size
      });
      
      console.log(`Screenshot captured successfully!`);
      console.log(`Size: ${size.width}x${size.height} (${sizePreset})`);
      console.log(`File size: ${(screenshot.length / 1024).toFixed(2)} KB`);
      console.log(`Saved to: ${outputPath}`);
      
    } else {
      console.log(`Mode: Full page screenshot`);
      const filename = generateFilename(url, device);
      const outputPath = join(outputDir, filename);
      
      const screenshot = await captureScreenshot(url, device, {
        outputPath,
        format: 'png',
        quality: 90,
        fullPage: true,
        delay: 1000
      });
      
      console.log(`Screenshot captured successfully!`);
      console.log(`File size: ${(screenshot.length / 1024).toFixed(2)} KB`);
      console.log(`Saved to: ${outputPath}`);
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
