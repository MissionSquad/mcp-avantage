# Architecture: Server Structure

## Context

This document outlines the architecture of the MCP Avantage Server, which acts as a wrapper around the `@j4ys0n/avantage` library. It follows the standard generic MCP server template.

-   **Related:** [Token Handling](token_handling.md), [Resource Management](resource_management.md)

## High-Level Goal

Expose the functionalities of the `@j4ys0n/avantage` library (which wraps the Alpha Vantage API) as tools consumable by Language Learning Models (LLMs) via the Model Context Protocol (MCP).

## Core Components

```mermaid
graph TD
    LLM[Language Learning Model] -->|MCP Request| FastMCP[FastMCP Server (src/index.ts)]
    FastMCP -->|Parse & Validate Args| ToolExec[Tool Execute Function]

    subgraph "Tool Execution Context"
        ToolExec -->|apiKey?| Auth{Auth Logic}
        Auth -- Yes, extraArgs.apiKey --> UseExtraArgs[Use Key from extraArgs]
        Auth -- No extraArgs.apiKey --> UseEnvVar{Use Fallback Env Var?}
        UseEnvVar -- Yes, config.apiKey --> UseFallback[Use Key from Environment]
        UseEnvVar -- No --> ErrorAuth[Throw Auth Error]
        ResolvedKey[Resolved API Key]
        UseExtraArgs --> ResolvedKey
        UseFallback --> ResolvedKey
    end

    subgraph "Resource & Library Interaction"
        ResolvedKey --> ResMan{ResourceManager (src/resource-manager.ts)}
        ResMan -- Get/Create --> AvantageInstance[AVantage Instance (@j4ys0n/avantage)]
        ToolExec -->|Uses| AvantageInstance
        AvantageInstance -->|Calls Method| AvantageLib[Avantage Library Logic]
        AvantageLib -->|Uses Api Util| AvantageApiUtil[Avantage API Util (Internal)]
        AvantageApiUtil -->|HTTP Request| AlphaVantageAPI[Alpha Vantage API]
    end

    ToolExec -->|Handle Response| ResponseHandler{Response Handling}
    ResponseHandler -- Success --> FormatSuccess[Format Success (Stringify JSON)]
    ResponseHandler -- Error --> FormatError[Format Error (UserError)]

    FormatSuccess -->|MCP Response| FastMCP
    FormatError -->|MCP Response| FastMCP
    FastMCP -->|MCP Response| LLM

    Config[Configuration (src/config.ts)] -- Reads --> EnvVars[.env File]
    FastMCP -->|Uses| Config
    ToolExec -->|Uses| Config
    ResMan -->|Uses| Config

    Logger[Logger (src/logger.ts)]
    FastMCP -->|Logs| Logger
    ToolExec -->|Logs| Logger
    ResMan -->|Logs| Logger
    AvantageInstance -->|Logs (Internal)| Logger
```

1.  **FastMCP Server (`src/index.ts`):**
    *   The main entry point using `@missionsquad/fastmcp`.
    *   Defines numerous MCP tools corresponding to methods in `@j4ys0n/avantage` modules (e.g., `coreStock_intraday`, `fundamentalData_companyOverview`).
    *   Tool definitions include `name`, `description`, Zod `parameters` schema (from `src/schemas.ts`), and the `execute` function.

2.  **Tool Schemas (`src/schemas.ts`):**
    *   Contains Zod schemas defining the input parameters for each MCP tool. These schemas mirror the parameter interfaces defined in `@j4ys0n/avantage/src/types/*`.
    *   **Crucially, API keys are NOT included in these schemas.**

3.  **Tool Execution (`execute` functions in `src/index.ts`):**
    *   Each `execute` function performs the following:
        *   **Authentication:** Resolves the Alpha Vantage API key using the standard pattern (checking `context.extraArgs.apiKey`, falling back to `config.apiKey`). See [Token Handling](token_handling.md).
        *   **Resource Management:** Uses the resolved `apiKey` to get/create a cached `AVantage` instance via `resourceManager.getResource<AVantage>(...)`. See [Resource Management](resource_management.md).
        *   **Library Call:** Calls the appropriate method on the obtained `AVantage` instance (e.g., `av.coreStock.intraday(args)`), passing the validated tool arguments (`args`).
        *   **Response Handling:** Checks the `{ error?, reason?, data? }` object returned by the `avantage` method.
            *   On error (`error: true`), throws a `UserError(reason)`.
            *   On success, returns the `data` (usually stringified using `JSON.stringify`).
        *   **Error Handling:** Includes a `try...catch` block to catch errors during resource retrieval or library execution, logging internal errors and throwing `UserError` for user-facing issues.

4.  **Resource Manager (`src/resource-manager.ts`):**
    *   Manages instances of the `AVantage` class, keyed by API key.
    *   Handles creation (via factory function `new AVantage(key)`) and cleanup.

5.  **Configuration (`src/config.ts`):**
    *   Loads `API_KEY` (Alpha Vantage key), `LOG_LEVEL`, `RESOURCE_CLEANUP_INTERVAL`, and `AV_PREMIUM` from the `.env` file using `dotenv` and Zod for validation/defaults.

6.  **Logging (`src/logger.ts`):**
    *   Standard level-based logger writing to `stderr`.

7.  **`@j4ys0n/avantage` Library:**
    *   The core dependency that encapsulates the logic for interacting with the Alpha Vantage API. The MCP server acts as a wrapper around this library.

## Request Flow

1.  LLM sends an MCP `call_tool` request (e.g., `coreStock_quote`).
2.  FastMCP server parses, validates arguments against the Zod schema (e.g., `CoreStockQuoteSchema`).
3.  The corresponding `execute` function runs.
4.  API key is resolved (from `extraArgs` or `.env`).
5.  `resourceManager.getResource<AVantage>(apiKey, ...)` retrieves or creates an `AVantage` instance for that key.
6.  `av.coreStock.quote(args)` is called.
7.  `avantage` library makes the actual HTTP request to Alpha Vantage.
8.  `avantage` returns `{ error?, reason?, data? }`.
9.  The `execute` function checks the result:
    *   If error, `throw new UserError(reason)`.
    *   If success, `return JSON.stringify(data)`.
10. FastMCP sends the success result or the `UserError` back to the LLM.

## AI Assistance Notes

-   Model Used: Claude 3.5 Sonnet
-   Prompt: User task to create MCP server using avantage library. Internal planning.
-   Date Generated: 2024-08-01
