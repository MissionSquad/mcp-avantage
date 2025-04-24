# Architecture: Resource Management (AVantage Instances)

## Context

The MCP Avantage Server needs to interact with the `@j4ys0n/avantage` library, which requires an API key during instantiation (`new AVantage(apiKey)`). To handle multiple users potentially providing different API keys (via `extraArgs`) and to avoid creating a new `AVantage` instance for every single tool call, we leverage the `ResourceManager` from the generic MCP server template.

-   **Related:** [Server Structure](server_structure.md), [Token Handling](token_handling.md)

## Goal

Efficiently manage instances of the `AVantage` client, ensuring that:

1.  `AVantage` instances are cached based on the resolved Alpha Vantage API key.
2.  Requests using the same API key reuse the same `AVantage` instance.
3.  Instances are created lazily only when first needed for a specific key.
4.  Inactive instances are automatically cleaned up after a configurable period (`RESOURCE_CLEANUP_INTERVAL`).

## Implementation (`src/resource-manager.ts`, `src/index.ts`)

1.  **ResourceManager Setup:** The standard `ResourceManager` class (`src/resource-manager.ts`) from the template is used.
2.  **Tool Execution Logic (`src/index.ts`):**
    *   Inside each tool's `execute` function, the Alpha Vantage API key is resolved using the standard pattern (prioritizing `context.extraArgs.apiKey`, falling back to `config.apiKey`).
    *   This resolved `apiKey` is used as the `key` for the `resourceManager.getResource` call.
    *   `resourceManager.getResource<AVantage>(...)` is called to get or create an `AVantage` instance associated with that specific API key.

    ```typescript
    // Simplified example within a tool's execute function
    import { resourceManager } from './resource-manager.js';
    import { AVantage } from '@j4ys0n/avantage';
    import { config, apiKeyErrorMessage } from './config.js';
    import { UserError } from '@missionsquad/fastmcp';
    import { logger } from './logger.js';

    // ... resolve apiKey from context.extraArgs or config.apiKey ...
    if (!apiKey) {
      throw new UserError(apiKeyErrorMessage);
    }

    try {
      // Get or create AVantage instance managed by ResourceManager
      const av = await resourceManager.getResource<AVantage>(
        apiKey, // Cache key is the resolved API key
        'avantage_client', // Type identifier for logging
        async (key) => {
          // Factory Function: How to CREATE an AVantage instance
          logger.info(`Creating new AVantage instance for key ending ...${key.slice(-4)}`);
          // Note: The AVantage library itself reads AV_PREMIUM from process.env
          return new AVantage(key);
        },
        async (avInstance) => {
          // Cleanup Function: How to DESTROY (if needed)
          logger.debug(`Destroying AVantage instance (no-op)`);
          // AVantage class doesn't have an explicit destroy/close method
        }
      );

      // Use the obtained AVantage instance
      const result = await av.coreStock.quote({ symbol: args.symbol });
      // ... handle result ...

    } catch (error: any) {
      // ... handle error ...
    }
    ```

## Benefits

*   **Efficiency:** Avoids creating `AVantage` instances repeatedly for the same API key within the cleanup interval.
*   **Resource Control:** Automatically cleans up instances associated with inactive API keys, freeing up memory.
*   **Isolation:** Ensures that requests made with different API keys use separate `AVantage` instances, maintaining credential separation.

## Considerations

*   **`AVantage` State:** Assumes the `AVantage` class instance itself is relatively lightweight and doesn't hold significant state beyond the API key and premium flag (which it reads from `process.env` internally based on the `AV_PREMIUM` variable set when the *server* starts, not per-instance). If `AVantage` instances became very heavy or stateful in future versions, this approach might need review.
*   **Premium Flag:** The `AVantage` library reads the `AV_PREMIUM` environment variable during its *own* initialization (`src/index.ts` within the library). The `ResourceManager` factory function simply passes the API key. This means the premium status is determined by the server's environment when the `AVantage` instance is *first created* by the factory, not dynamically per request. This is generally acceptable as premium status is usually tied to the API key itself or the server's overall configuration.

## AI Assistance Notes

-   Model Used: Claude 3.5 Sonnet
-   Prompt: User task to create MCP server using avantage library. Internal planning led to using ResourceManager for AVantage instances.
-   Date Generated: 2024-08-01
