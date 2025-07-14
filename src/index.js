import { launch } from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PRODUCTION_SIZES = {
  'thumbnail': { width: 300, height: 200 },
  'card': { width: 400, height: 300 },
  'social-media': { width: 1200, height: 630 },
  'instagram-post': { width: 1080, height: 1080 },
  'instagram-story': { width: 1080, height: 1920 },
  'youtube-thumbnail': { width: 1280, height: 720 },
  'blog-header': { width: 800, height: 400 },
  'email-banner': { width: 600, height: 200 },
  'preview-small': { width: 200, height: 150 },
  'preview-medium': { width: 400, height: 300 },
  'preview-large': { width: 800, height: 600 }
};

const DEVICE_PRESETS = {
  desktop: {
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  },
  laptop: {
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  },
  tablet: {
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  mobile: {
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  'mobile-large': {
    viewport: { width: 414, height: 896 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  }
};

async function captureScreenshot(url, device = 'desktop', options = {}) {
  const {
    outputPath,
    format = 'png',
    quality = 90,
    fullPage = true,
    waitForSelector,
    delay = 0,
    headless = true,
    blockResources = true,
    clip = null,
    fixedSize = null
  } = options;

  if (!DEVICE_PRESETS[device]) {
    throw new Error(`Unknown device preset: ${device}. Available: ${Object.keys(DEVICE_PRESETS).join(', ')}`);
  }

  const browser = await launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  let page;
  try {
    page = await browser.newPage();
    
    const { viewport, userAgent } = DEVICE_PRESETS[device];
    await page.setViewport(viewport);
    await page.setUserAgent(userAgent);
    
    if (blockResources) {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        try {
          const resourceType = req.resourceType();
          const url = req.url();
          
          if (resourceType === 'media' || 
              (resourceType === 'image' && (url.includes('.mp4') || url.includes('.webm'))) ||
              resourceType === 'websocket' ||
              url.includes('analytics') ||
              url.includes('tracking')) {
            req.abort();
          } else {
            req.continue();
          }
        } catch (error) {
          req.continue();
        }
      });
    }

    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const screenshotOptions = {
      fullPage: clip ? false : fullPage,
      type: format,
      ...(format === 'jpeg' && { quality }),
      ...(clip && { clip })
    };

    let screenshotBuffer = await page.screenshot(screenshotOptions);

    if (fixedSize) {
      screenshotBuffer = await resizeImage(screenshotBuffer, fixedSize, format, quality);
    }

    if (outputPath) {
      await saveScreenshot(screenshotBuffer, outputPath);
      console.log(`Screenshot saved to: ${outputPath}`);
    }

    return screenshotBuffer;

  } catch (error) {
    throw new Error(`Screenshot capture failed: ${error.message}`);
  } finally {
    if (page) await page.close();
    await browser.close();
  }
}

async function saveScreenshot(buffer, filePath) {
  try {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, buffer);
  } catch (error) {
    throw new Error(`Failed to save screenshot: ${error.message}`);
  }
}

async function resizeImage(buffer, size, format = 'png', quality = 90) {
  try {
    let sharpInstance = sharp(buffer).resize(size.width, size.height, {
      fit: 'cover',
      position: 'top'
    });

    if (format === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality });
    } else if (format === 'png') {
      sharpInstance = sharpInstance.png({ compressionLevel: 9 });
    }

    return await sharpInstance.toBuffer();
  } catch (error) {
    throw new Error(`Failed to resize image: ${error.message}`);
  }
}

function generateFilename(url, device, format = 'png', size = null) {
  const domain = new URL(url).hostname.replace(/\./g, '-');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  
  let sizeStr = '';
  if (size) {
    if (typeof size === 'string') {
      sizeStr = `-${size}`;
    } else if (size.width && size.height) {
      sizeStr = `-${size.width}x${size.height}`;
    }
  }
  
  return `screenshot-${domain}-${device}${sizeStr}-${timestamp}.${format}`;
}

async function captureProductionScreenshots(url, device = 'desktop', sizes = ['thumbnail', 'card', 'social-media'], options = {}) {
  const { outputDir = join(__dirname, 'screenshots'), format = 'png', quality = 90 } = options;
  
  console.log(`Capturing production screenshots for: ${url}`);
  console.log(`Sizes: ${sizes.join(', ')}`);
  
  const results = [];
  
  const baseScreenshot = await captureScreenshot(url, device, {
    ...options,
    outputPath: null,
    fullPage: true
  });
  
  for (const sizeKey of sizes) {
    try {
      const size = PRODUCTION_SIZES[sizeKey] || sizeKey;
      if (!size.width || !size.height) {
        console.warn(`Unknown size preset: ${sizeKey}, skipping...`);
        continue;
      }
      
      const resizedBuffer = await resizeImage(baseScreenshot, size, format, quality);
      const filename = generateFilename(url, device, format, sizeKey);
      const outputPath = join(outputDir, filename);
      
      await saveScreenshot(resizedBuffer, outputPath);
      
      results.push({
        size: sizeKey,
        dimensions: size,
        buffer: resizedBuffer,
        path: outputPath,
        fileSize: `${(resizedBuffer.length / 1024).toFixed(2)} KB`
      });
      
      console.log(`✓ ${sizeKey} (${size.width}x${size.height}): ${(resizedBuffer.length / 1024).toFixed(2)} KB`);
      
    } catch (error) {
      console.error(`✗ Failed to create ${sizeKey}: ${error.message}`);
    }
  }
  
  return results;
}

export { captureScreenshot, captureProductionScreenshots, DEVICE_PRESETS, PRODUCTION_SIZES, generateFilename };