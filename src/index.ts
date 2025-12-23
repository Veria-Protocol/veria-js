/**
 * Veria SDK - Official JavaScript/TypeScript client for Veria Compliance API
 *
 * @example
 * ```typescript
 * import { VeriaClient } from 'veria';
 *
 * const client = new VeriaClient({ apiKey: 'veria_live_xxx' });
 * const result = await client.screen('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
 *
 * if (result.risk === 'high' || result.risk === 'critical') {
 *   console.log('Address blocked for compliance');
 * }
 * ```
 */

export interface VeriaConfig {
  /** Your Veria API key (get one at https://protocol.veria.cc) */
  apiKey: string;
  /** Base URL for the API (default: https://api.veria.cc) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export interface ScreenResult {
  /** Risk score from 0-100 */
  score: number;
  /** Risk level: low (0-29), medium (30-59), high (60-79), critical (80-100) */
  risk: 'low' | 'medium' | 'high' | 'critical';
  /** Detected blockchain */
  chain: string;
  /** Resolved address (ENS names resolved to hex) */
  resolved: string;
  /** Processing time in milliseconds */
  latency_ms: number;
  /** Detailed screening results */
  details: {
    /** True if address appears on a sanctions list */
    sanctions_hit: boolean;
    /** True if associated with a politically exposed person */
    pep_hit: boolean;
    /** True if on any watchlist */
    watchlist_hit: boolean;
    /** List of sanctions databases checked */
    checked_lists: string[];
    /** Type of address: wallet, contract, exchange, mixer, ens, iban */
    address_type: string;
  };
}

export interface VeriaErrorDetails {
  code: string;
  message: string;
}

export class VeriaError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'VeriaError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class VeriaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: VeriaConfig) {
    if (!config.apiKey) {
      throw new VeriaError('API key is required', 'MISSING_API_KEY');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.veria.cc';
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Screen a wallet address for compliance risks.
   *
   * @param input - Ethereum address, ENS name, Solana address, or IBAN
   * @returns Screening result with risk score and details
   * @throws {VeriaError} If the request fails or address is invalid
   *
   * @example
   * ```typescript
   * const result = await client.screen('vitalik.eth');
   * console.log(`Risk: ${result.risk}, Score: ${result.score}`);
   * ```
   */
  async screen(input: string): Promise<ScreenResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/v1/screen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new VeriaError(
          error.error?.message ?? error.message ?? `Request failed with status ${response.status}`,
          error.error?.code ?? 'REQUEST_FAILED',
          response.status
        );
      }

      return await response.json() as ScreenResult;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof VeriaError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new VeriaError('Request timed out', 'TIMEOUT');
      }

      throw new VeriaError(
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Check if an address should be blocked based on screening result.
   *
   * @param result - Screening result from screen()
   * @returns true if the address should be blocked
   *
   * @example
   * ```typescript
   * const result = await client.screen(address);
   * if (client.shouldBlock(result)) {
   *   throw new Error('Transaction blocked for compliance');
   * }
   * ```
   */
  shouldBlock(result: ScreenResult): boolean {
    return (
      result.details.sanctions_hit ||
      result.risk === 'high' ||
      result.risk === 'critical'
    );
  }
}

export default VeriaClient;
