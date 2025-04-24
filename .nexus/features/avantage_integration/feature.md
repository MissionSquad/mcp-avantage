# Feature: @j4ys0n/avantage Library Integration

## Context

The primary purpose of this MCP server is to expose the functionality of the Alpha Vantage API to LLMs. The `@j4ys0n/avantage` library provides a convenient TypeScript wrapper for this API.

-   **Related:** [Server Structure](../../architecture/server_structure.md), [Technology Choice: @j4ys0n/avantage](../../decisions/technology_choices/tech_avantage_library.md)

## Goal

Integrate the `@j4ys0n/avantage` library into the MCP server framework, exposing its methods as distinct MCP tools.

## Implementation Details

1.  **Dependency:** `@j4ys0n/avantage` is included as a dependency in `package.json`.
2.  **Instantiation:** Instances of the `AVantage` class are created and managed by the `ResourceManager`, keyed by the resolved Alpha Vantage API key. This happens within the `execute` function of each tool.
    ```typescript
    // Inside execute function, after resolving apiKey
    const av = await resourceManager.getResource<AVantage>(
      apiKey,
      'avantage_client',
      async (key) => new AVantage(key), // Factory
      async () => {} // Cleanup (no-op)
    );
    ```
3.  **Tool Mapping:** Each relevant public method within the `AVantage` class's modules (e.g., `av.coreStock.intraday`, `av.fundamentalData.companyOverview`) is mapped to a corresponding MCP tool defined in `src/index.ts`.
4.  **Schema Generation:** Zod schemas for tool parameters (`src/schemas.ts`) are created based on the TypeScript parameter interfaces defined within the `@j4ys0n/avantage` library (`src/types/*`).
5.  **Method Calling:** The `execute` function for each tool calls the corresponding method on the retrieved `AVantage` instance, passing the validated arguments.
    ```typescript
    // Example: coreStock_intraday tool
    const result = await av.coreStock.intraday(args);
    ```
6.  **Response Handling:** The `execute` function handles the `{ error?, reason?, data? }` object returned by the `avantage` methods, throwing a `UserError` on error or returning the stringified `data` on success.
    ```typescript
    if (result.error) {
      throw new UserError(result.reason || 'Avantage library returned an error.');
    }
    return JSON.stringify(result.data);
    ```
7.  **Configuration:** The server's `.env` file provides the fallback `API_KEY` and the `AV_PREMIUM` flag, which the `AVantage` library uses internally upon instantiation.

## Exposed Functionality Categories

MCP tools are generated for methods within these `avantage` modules:

*   `AlphaIntelligence`
*   `Commodities`
*   `CoreStock`
*   `Crypto`
*   `EconomicIndicators`
*   `Forex`
*   `FundamentalData`
*   `OptionsData`
*   `TechnicalIndicators`

## Benefits

*   Provides comprehensive access to Alpha Vantage API features via MCP.
*   Leverages existing typed library for reliability and reduced implementation effort.
*   Maintains separation between MCP protocol handling and API interaction logic.

## Considerations

*   The server's functionality is tightly coupled to the features and behavior of the `@j4ys0n/avantage` library.
*   Any bugs or limitations in the underlying library will affect the MCP server.
*   Updates to the library may require updates to the MCP tool definitions or schemas.

## AI Assistance Notes

-   Model Used: Claude 3.5 Sonnet
-   Prompt: User task to create MCP server using avantage library.
-   Date Generated: 2024-08-01
