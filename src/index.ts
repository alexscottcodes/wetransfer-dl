import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Custom error classes
export class WeTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeTransferError';
  }
}

export class InvalidLinkError extends WeTransferError {
  constructor(message: string = 'Invalid WeTransfer link') {
    super(message);
    this.name = 'InvalidLinkError';
  }
}

export class DownloadError extends WeTransferError {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadError';
  }
}

export class NetworkError extends WeTransferError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Configuration interface
export interface WeTransferConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  userAgent?: string;
}

// Download options interface
export interface DownloadOptions {
  onProgress?: (progress: { loaded: number; total: number }) => void;
  outputPath?: string;
}

// Transfer info interface
export interface TransferInfo {
  transferId: string;
  recipientId?: string;
  securityHash: string;
  directLink?: string;
}

const WETRANSFER_API_URL = 'https://wetransfer.com/api/v4/transfers';
const WETRANSFER_DOWNLOAD_URL = `${WETRANSFER_API_URL}/{transfer_id}/download`;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0';

export class WeTransferDownloader {
  private config: Required;
  private client: AxiosInstance;

  constructor(config: WeTransferConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      timeout: config.timeout ?? 30000,
      userAgent: config.userAgent ?? DEFAULT_USER_AGENT,
    };

    this.client = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        'x-requested-with': 'XMLHttpRequest',
      },
    });
  }

  /**
   * Resolves short WeTransfer links (we.tl) to full URLs
   */
  private async resolveShortLink(url: string): Promise {
    try {
      const response = await this.client.head(url, {
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
      });
      return response.request?.res?.responseUrl || url;
    } catch (error: any) {
      throw new NetworkError(`Failed to resolve short link: ${error.message}`);
    }
  }

  /**
   * Extracts CSRF token from WeTransfer page
   */
  private async getCsrfToken(): Promise {
    try {
      const response = await this.client.get('https://wetransfer.com/');
      const match = response.data.match(/name="csrf-token" content="([^"]+)"/);
      if (!match) {
        throw new WeTransferError('Could not extract CSRF token');
      }
      return match[1];
    } catch (error: any) {
      throw new NetworkError(`Failed to get CSRF token: ${error.message}`);
    }
  }

  /**
   * Parses WeTransfer URL and extracts transfer information
   */
  private parseWeTransferUrl(url: string): TransferInfo {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts.length === 2) {
      // Format: /downloads/{transfer_id}/{security_hash}
      const [, transferId, securityHash] = pathParts;
      return { transferId, securityHash };
    } else if (pathParts.length === 3) {
      // Format: /downloads/{transfer_id}/{recipient_id}/{security_hash}
      const [, transferId, recipientId, securityHash] = pathParts;
      return { transferId, recipientId, securityHash };
    } else {
      throw new InvalidLinkError(`Unsupported URL format: ${url}`);
    }
  }

  /**
   * Gets the direct download URL for a WeTransfer link
   */
  public async getDownloadUrl(url: string): Promise {
    try {
      // Resolve short link if necessary
      let fullUrl = url;
      if (url.startsWith('https://we.tl/')) {
        fullUrl = await this.resolveShortLink(url);
      }

      // Parse the URL
      const transferInfo = this.parseWeTransferUrl(fullUrl);

      // Get CSRF token
      const csrfToken = await this.getCsrfToken();

      // Prepare request payload
      const payload: any = {
        intent: 'entire_transfer',
        security_hash: transferInfo.securityHash,
      };

      if (transferInfo.recipientId) {
        payload.recipient_id = transferInfo.recipientId;
      }

      // Make download request with retry logic
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          const response = await this.client.post(
            WETRANSFER_DOWNLOAD_URL.replace('{transfer_id}', transferInfo.transferId),
            payload,
            {
              headers: {
                'x-csrf-token': csrfToken,
              },
            }
          );

          const directLink = response.data?.direct_link;
          if (!directLink) {
            throw new DownloadError('No direct link in response');
          }

          return directLink;
        } catch (error: any) {
          lastError = error;
          if (attempt < this.config.maxRetries) {
            const delay = this.config.retryDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw new DownloadError(
        `Failed to get download URL after ${this.config.maxRetries} retries: ${lastError?.message}`
      );
    } catch (error: any) {
      if (error instanceof WeTransferError) {
        throw error;
      }
      throw new WeTransferError(`Unexpected error: ${error.message}`);
    }
  }

  /**
   * Downloads a file from WeTransfer
   */
  public async download(url: string, options: DownloadOptions = {}): Promise {
    const downloadUrl = await this.getDownloadUrl(url);

    const config: AxiosRequestConfig = {
      responseType: typeof window !== 'undefined' ? 'blob' : 'arraybuffer',
      onDownloadProgress: options.onProgress
        ? (progressEvent) => {
            if (options.onProgress && progressEvent.total) {
              options.onProgress({
                loaded: progressEvent.loaded,
                total: progressEvent.total,
              });
            }
          }
        : undefined,
    };

    try {
      const response = await this.client.get(downloadUrl, config);
      
      // Return appropriate type based on environment
      if (typeof window !== 'undefined') {
        return new Blob([response.data]);
      } else {
        return Buffer.from(response.data);
      }
    } catch (error: any) {
      throw new DownloadError(`Failed to download file: ${error.message}`);
    }
  }
}

// Default export for convenience
export default WeTransferDownloader;