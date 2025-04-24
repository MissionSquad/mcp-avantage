# Architecture: Token Handling (Alpha Vantage API Key)

## Context

This MCP server needs to authenticate requests to the underlying Alpha Vantage API using an API key. To support multi-user scenarios where different users might have their own keys, while also allowing for a simpler single-key deployment, we use the standard token handling pattern from the generic MCP server template.

-   **Related:** [Server Structure](server_structure.md), [Resource Management](resource_management.md)

## Goal

Implement an authentication strategy for the Alpha Vantage API key that:

1.  Allows user-specific Alpha Vantage API keys to be passed securely during a tool call via `extraArgs`.
2.  Avoids exposing the API key parameter in the public tool schema (MCP `list_tools` response).
3.  Provides a fallback mechanism to use a globally configured API key from environment variables (`.env` file).
4.  Is consistently applied across all tools requiring an API key.

## Implementation Strategy

The strategy relies on `context.extraArgs` provided by FastMCP and environment variable configuration (`config.apiKey`).

**Steps within each Tool's `execute` function (`src/index.ts`):**

1.  **Retrieve from `extraArgs`:** Access `context.extraArgs` and attempt to retrieve a property named `apiKey`.
    ```typescript
    const { apiKey: extraArgsApiKey } = context.extraArgs as { apiKey?: string } || {};
    ```

2.  **Prioritize `extraArgs` & Fallback:** Use the `extraArgsApiKey` if present; otherwise, use the fallback key from the server's configuration (`config.apiKey`, loaded from the `API_KEY` environment variable).
    ```typescript
    let apiKey = extraArgsApiKey || config.apiKey;
    ```

3.  **Check for Required Key:** Since *all* Alpha Vantage calls require an API key, check if one was successfully resolved. If not, throw a `UserError`.
    ```typescript
    if (!apiKey) {
       logger.error(`Authentication failed: Alpha Vantage API key missing.`);
       // Use the shared error message from config.ts
       throw new UserError(apiKeyErrorMessage);
    }
    ```

4.  **Use the Resolved `apiKey`:** Pass the final `apiKey` value to the `resourceManager.getResource<AVantage>(apiKey, ...)` call. This ensures the correct `AVantage` instance (associated with that key) is retrieved or created.

## Example Code Snippet (within `execute`)

```typescript
import { config, apiKeyErrorMessage } from './config.js';
import { UserError } from '@missionsquad/fastmcp';
import { logger } from './logger.js';
import { resourceManager } from './resource-manager.js';
import { AVantage } from '@j4ys0n/avantage';

// --- Inside async execute(args, context) ---

// 1. Retrieve from extraArgs
const { apiKey: extraArgsApiKey } = context.extraArgs as { apiKey?: string } || {};
logger.debug(`API Key provided via extraArgs: ${!!extraArgsApiKey}`);

// 2. Prioritize extraArgs, 3. Fallback to environment
let apiKey = extraArgsApiKey || config.apiKey;

// 4. Check if required (Always required for Alpha Vantage)
if (!apiKey) {
  logger.error(`Authentication failed: Alpha Vantage API key missing.`);
  throw new UserError(apiKeyErrorMessage);
}

// 5. Use the resolved apiKey to get the AVantage instance
logger.info(`Using resolved AV API key (source: ${extraArgsApiKey ? 'extraArgs' : 'environment'})`);

try {
    const av = await resourceManager.getResource<AVantage>(
        apiKey,
        'avantage_client',
        // ... factory and cleanup functions ...
    );

    // Now use 'av' to make the library call
    // const result = await av.module.method(args);
    // ...

} catch (error: any) {
    // ... handle errors ...
}

```

## Security Considerations

*   **Intermediary Application:** Relies on a trusted proxy/application to securely inject user-specific keys into `extraArgs`.
*   **Environment Variable Security:** The fallback `API_KEY` in the `.env` file must be secured.
*   **Logging:** Avoid logging the actual API key value. The template's logger and resource manager attempt to log only masked versions or indicators of the key's source.

## AI Assistance Notes

-   Model Used: Claude 3.5 Sonnet
-   Prompt: User task to create MCP server using avantage library. Internal planning.
-   Date Generated: 2024-08-01
