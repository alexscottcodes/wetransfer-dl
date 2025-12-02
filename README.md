# WeTransfer Downloader

A universal JavaScript/TypeScript library for downloading files from WeTransfer, supporting both Node.js and browser environments.

## ⚠️ Important Notice

This library uses an unofficial/reverse-engineered API. WeTransfer retired their Public API on May 31, 2022. This implementation may break if WeTransfer changes their internal mechanisms.

## Features

- 🌍 Universal: Works in Node.js and browsers
- 🔗 Short link support (we.tl URLs)
- 📦 Multiple module formats (ESM, CommonJS, UMD)
- 🔄 Automatic retry with exponential backoff
- 📊 Progress tracking
- 💪 TypeScript support with full type definitions
- 🛡️ Comprehensive error handling

## Installation

```bash
npm install wetransfer-downloader
```

## Usage

### Node.js (CommonJS)

```javascript
const { WeTransferDownloader } = require('wetransfer-downloader');
const fs = require('fs');

const downloader = new WeTransferDownloader();

// Download with progress tracking
downloader.download('https://we.tl/t-Ey5zxahly6', {
  onProgress: (progress) => {
    console.log(`Downloaded: ${progress.loaded} / ${progress.total} bytes`);
  }
}).then((buffer) => {
  fs.writeFileSync('downloaded-file.zip', buffer);
  console.log('Download complete!');
}).catch((error) => {
  console.error('Download failed:', error.message);
});
```

### Node.js (ESM)

```javascript
import { WeTransferDownloader } from 'wetransfer-downloader';
import { writeFileSync } from 'fs';

const downloader = new WeTransferDownloader({
  maxRetries: 5,
  timeout: 60000
});

const buffer = await downloader.download('https://we.tl/t-Ey5zxahly6');
writeFileSync('downloaded-file.zip', buffer);
```

### Browser

```html



  
  


  Download File
  


  


```

## API Reference

### `WeTransferDownloader`

#### Constructor

```typescript
new WeTransferDownloader(config?: WeTransferConfig)
```

**Configuration Options:**
- `maxRetries` (number): Maximum retry attempts (default: 3)
- `retryDelay` (number): Base delay between retries in ms (default: 1000)
- `timeout` (number): Request timeout in ms (default: 30000)
- `userAgent` (string): Custom User-Agent header

#### Methods

**`getDownloadUrl(url: string): Promise`**

Resolves a WeTransfer link to a direct download URL.

**`download(url: string, options?: DownloadOptions): Promise`**

Downloads a file and returns it as Buffer (Node.js) or Blob (browser).

**Download Options:**
- `onProgress`: Progress callback function
- `outputPath`: File path for saving (Node.js only)

## Error Handling

The library throws custom error types:

- `InvalidLinkError`: Invalid or malformed WeTransfer URL
- `DownloadError`: Failed to download file
- `NetworkError`: Network-related errors
- `WeTransferError`: Base error class

```javascript
try {
  await downloader.download(url);
} catch (error) {
  if (error instanceof InvalidLinkError) {
    console.error('Invalid link:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  }
}
```

## Supported URL Formats

- Short links: `https://we.tl/t-XXXXXXXXXX`
- Full URLs: `https://wetransfer.com/downloads/{transfer_id}/{security_hash}`
- Email URLs: `https://wetransfer.com/downloads/{transfer_id}/{recipient_id}/{security_hash}`

## Building from Source

```bash
# Install dependencies
npm install

# Build all formats
npm run build

# Watch mode for development
npm run dev
```

## License

GNU v3

## Disclaimer

This is an unofficial implementation. Use at your own risk.