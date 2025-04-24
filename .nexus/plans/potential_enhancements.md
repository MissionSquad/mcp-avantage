# Potential Enhancements

## Context

Ideas for future improvements to the MCP Avantage Server, identified during initial setup.

## Goal

Capture potential areas for enhancement beyond the current scope of wrapping the `@j4ys0n/avantage` library.

## Potential Areas

1.  **Rate Limiting & Retries:**
    *   **Idea:** Implement client-side rate limiting within the MCP server (e.g., using `bottleneck` or `p-limit` around calls to `resourceManager.getResource` or within the `AVantage` factory/usage) to respect Alpha Vantage limits automatically.
    *   **Idea:** Add retry logic (with exponential backoff) specifically for rate-limit errors returned by the `avantage` library or the underlying API.

2.  **Enhanced Error Handling:**
    *   **Idea:** Standardize error handling. Decide whether tools should *always* throw `UserError` on failure, rather than relying on the consumer to check the `{ error, reason, data }` structure returned by some `avantage` methods. This might involve modifying how the `execute` functions handle the `avantage` response.
    *   **Idea:** Provide more specific error messages based on the `reason` returned by `avantage`.

3.  **Input Validation:**
    *   **Idea:** Add more specific validation within Zod schemas or `execute` functions for parameters where Alpha Vantage has strict requirements (e.g., valid interval values, symbol formats, date formats) to provide earlier feedback than relying solely on API errors.

4.  **Testing:**
    *   **Idea:** Implement unit tests for the tool definitions in `src/index.ts`. This would involve mocking `resourceManager.getResource` and the `AVantage` instance/methods to verify correct parameter mapping and response handling.
    *   **Idea:** Consider adding integration tests that make actual (limited) calls to the Alpha Vantage API using a dedicated test key (requires careful handling of secrets and rate limits).

5.  **Tool Granularity/Abstraction:**
    *   **Idea:** For very complex Alpha Vantage functions or common multi-step workflows, consider creating higher-level MCP tools that combine multiple calls to the `avantage` library, providing a simpler interface for the LLM.

6.  **Configuration Flexibility:**
    *   **Idea:** Allow overriding the `AV_PREMIUM` flag via `extraArgs` if needed, although this adds complexity.

## Considerations

*   Prioritization depends on the expected usage patterns and failure modes encountered. Rate limiting is likely important for heavy use.
*   Adding more logic increases server complexity but can improve robustness and user experience for the LLM.

## AI Assistance Notes

-   Model Used: Claude 3.5 Sonnet
-   Prompt: User task to create MCP server using avantage library. Internal planning.
-   Date Generated: 2024-08-01
