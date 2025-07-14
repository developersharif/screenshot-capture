# @screenshot-tools/capture

High-performance screenshot capture tool with device presets and production-ready size outputs.

## Installation

```bash
# Install globally for CLI usage
npm install -g @screenshot-tools/capture

# Install locally for programmatic usage
npm install @screenshot-tools/capture
```

## Features

- Smart resource blocking for faster loading
- Multiple device presets (desktop, mobile, tablet)
- Production-ready size presets for web use
- Batch screenshot generation
- Image resizing with Sharp

## Device Presets

- `desktop`: 1920x1080
- `laptop`: 1366x768
- `tablet`: 768x1024
- `mobile`: 375x667
- `mobile-large`: 414x896

## Production Sizes

- `thumbnail`: 300x200
- `card`: 400x300
- `social-media`: 1200x630
- `instagram-post`: 1080x1080
- `instagram-story`: 1080x1920
- `youtube-thumbnail`: 1280x720
- `blog-header`: 800x400
- `email-banner`: 600x200
- `preview-small`: 200x150
- `preview-medium`: 400x300
- `preview-large`: 800x600

## CLI Usage

```bash
screenshot-capture --help                                         # Show help
screenshot-capture                                                # Default mobile screenshot
screenshot-capture https://example.com desktop                    # Desktop screenshot
screenshot-capture https://example.com mobile --size=thumbnail    # Production thumbnail
screenshot-capture https://example.com desktop --production       # Multiple production sizes
screenshot-capture https://example.com mobile --output=./exports  # Custom output directory
```

## Programmatic Usage

```javascript
import {
  captureScreenshot,
  captureProductionScreenshots,
} from "@screenshot-tools/capture";

// Basic screenshot
const buffer = await captureScreenshot("https://example.com", "mobile");

// Production size
const thumbnail = await captureScreenshot("https://example.com", "desktop", {
  fixedSize: { width: 300, height: 200 },
  outputPath: "./thumbnail.png",
});

// Multiple production sizes
const results = await captureProductionScreenshots(
  "https://example.com",
  "desktop",
  ["thumbnail", "card", "social-media"]
);
```

## File Naming

Screenshots use the pattern: `screenshot-{domain}-{device}-{size}-{date}.{format}`

Examples:

- `screenshot-example-com-desktop-2025-07-14.png`
- `screenshot-github-com-mobile-thumbnail-2025-07-14.png`

## Requirements

- Node.js 16+
- Puppeteer ^24.12.1
- Sharp ^0.34.3

## License

MIT
