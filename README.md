# Veria SDK for JavaScript/TypeScript

Official SDK for the [Veria Compliance API](https://veria.cc) - screen wallet addresses for sanctions, PEP, and AML compliance.

## Installation

```bash
npm install veria
# or
yarn add veria
# or
pnpm add veria
```

## Quick Start

```typescript
import { VeriaClient } from 'veria';

const client = new VeriaClient({
  apiKey: 'veria_live_xxxxxxxxxxxx' // Get yours at https://protocol.veria.cc
});

// Screen an address
const result = await client.screen('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

console.log(`Risk: ${result.risk}, Score: ${result.score}`);

// Check if should block
if (client.shouldBlock(result)) {
  console.log('Transaction blocked for compliance');
}
```

## Features

- Full TypeScript support with complete type definitions
- Supports Ethereum addresses, ENS names, Solana addresses, and IBANs
- Configurable timeout and base URL
- Proper error handling with typed errors
- Works in Node.js, browsers, and edge runtimes

## API

### `new VeriaClient(config)`

Create a new Veria client.

```typescript
const client = new VeriaClient({
  apiKey: 'veria_live_xxx',     // Required: Your API key
  baseUrl: 'https://api.veria.cc', // Optional: API base URL
  timeout: 30000,                  // Optional: Request timeout in ms
});
```

### `client.screen(input)`

Screen an address for compliance risks.

```typescript
const result = await client.screen('vitalik.eth');
```

**Returns:**

```typescript
{
  score: 15,                    // Risk score 0-100
  risk: 'low',                  // low | medium | high | critical
  chain: 'ethereum',            // Detected blockchain
  resolved: '0x742d35...',      // Resolved address
  latency_ms: 45,               // Processing time
  details: {
    sanctions_hit: false,       // On sanctions list?
    pep_hit: false,             // Politically exposed person?
    watchlist_hit: false,       // On any watchlist?
    checked_lists: ['OFAC SDN', 'UN Consolidated', ...],
    address_type: 'wallet'      // wallet | contract | exchange | mixer
  }
}
```

### `client.shouldBlock(result)`

Helper to determine if an address should be blocked.

```typescript
const result = await client.screen(address);
if (client.shouldBlock(result)) {
  // Block the transaction
}
```

Returns `true` if:
- `sanctions_hit` is `true`, OR
- `risk` is `'high'` or `'critical'`

## Risk Levels

| Level | Score | Recommended Action |
|-------|-------|-------------------|
| low | 0-29 | Proceed |
| medium | 30-59 | Review |
| high | 60-79 | Block recommended |
| critical | 80-100 | Block required |

## Error Handling

```typescript
import { VeriaClient, VeriaError } from 'veria';

try {
  const result = await client.screen(address);
} catch (error) {
  if (error instanceof VeriaError) {
    console.error(`Error: ${error.code} - ${error.message}`);
    // Handle specific error codes
    switch (error.code) {
      case 'INVALID_API_KEY':
        // Re-authenticate
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Back off and retry
        break;
      case 'TIMEOUT':
        // Retry with longer timeout
        break;
    }
  }
}
```

## Usage with Web3 Libraries

### With wagmi/viem

```typescript
import { useAccount } from 'wagmi';
import { VeriaClient } from 'veria';

const client = new VeriaClient({ apiKey: process.env.VERIA_API_KEY });

function useComplianceCheck() {
  const { address } = useAccount();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (address) {
      client.screen(address).then(result => {
        setIsAllowed(!client.shouldBlock(result));
      });
    }
  }, [address]);

  return isAllowed;
}
```

### With ethers.js

```typescript
import { ethers } from 'ethers';
import { VeriaClient } from 'veria';

const client = new VeriaClient({ apiKey: process.env.VERIA_API_KEY });

async function safeTransfer(to: string, amount: bigint) {
  const result = await client.screen(to);

  if (client.shouldBlock(result)) {
    throw new Error(`Recipient blocked: ${result.risk} risk, sanctions: ${result.details.sanctions_hit}`);
  }

  // Proceed with transfer
  const tx = await contract.transfer(to, amount);
  return tx;
}
```

## Resources

- [Documentation](https://docs.veria.cc)
- [API Reference](https://docs.veria.cc/api)
- [Get API Key](https://protocol.veria.cc)
- [GitHub](https://github.com/Veria-Protocol/veria-js)

## License

MIT
