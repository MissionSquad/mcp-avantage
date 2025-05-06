# MCP Server for Alpha Vantage API (@missionsquad/avantage)

This project provides a Model Context Protocol (MCP) server that wraps the `@missionsquad/avantage` library, exposing Alpha Vantage API functionalities as tools for Language Learning Models (LLMs).

<a href="https://glama.ai/mcp/servers/@MissionSquad/mcp-avantage">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@MissionSquad/mcp-avantage/badge" alt="Avantage MCP server" />
</a>

## Overview

This server allows LLMs to interact with the Alpha Vantage API to retrieve financial data, including:

- Core Stock Data (Time Series, Quotes, Search)
- Fundamental Data (Company Overview, Financials, Calendars)
- Forex (FX) Data
- Cryptocurrency Data
- Commodities Data
- Economic Indicators
- Technical Indicators
- Alpha Intelligence (News, Sentiments, etc.)
- Options Data (Premium)

It leverages the `@missionsquad/avantage` TypeScript library and follows the architecture of the generic MCP server template, including multi-user API key handling and resource management for `AVantage` client instances.

**Key Features:**

- **Comprehensive Coverage:** Implements MCP tools for nearly all functions available in the `@missionsquad/avantage` library.
- **Multi-User Support:** Handles Alpha Vantage API keys securely via `extraArgs` (preferred) or fallback to environment variables.
- **Resource Management:** Efficiently manages `AVantage` client instances using the `ResourceManager`.
- **Strongly Typed:** Built with TypeScript, leveraging types from `@missionsquad/avantage` and Zod schemas for tool parameters.
- **Standard MCP Interface:** Uses `@missionsquad/fastmcp` for MCP communication.

## Getting Started

### Prerequisites

- Node.js v20 or later
- npm or yarn
- An Alpha Vantage API Key (Get one [here](https://www.alphavantage.co/support/#api-key))

### Setup

1.  **Clone or Copy:** Clone this repository or copy the files.
    ```bash
    git clone <repository-url> mcp-avantage-server
    cd mcp-avantage-server
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Configure Environment:**
    - Copy `.env.example` to `.env`.
    - Edit `.env` and set `API_KEY` to your Alpha Vantage API key.
    - Optionally set `AV_PREMIUM=true` if you have a premium subscription.
    - Adjust `LOG_LEVEL` or `RESOURCE_CLEANUP_INTERVAL` if needed.
4.  **Build the Project:**
    ```bash
    npm run build
    # or
    yarn build
    ```
5.  **Start the Server:**
    ```bash
    npm start
    # or
    yarn start
    ```
    The server will listen for MCP requests on stdio.

## Authentication

The server uses the standard multi-user token handling pattern:

1.  **`extraArgs.apiKey` (Recommended):** Pass the user-specific Alpha Vantage API key in the `apiKey` field of the `extraArgs` object during the MCP `call_tool` request. This key is _not_ part of the tool's schema.
2.  **`.env` Fallback:** If `extraArgs.apiKey` is not provided, the server uses the `API_KEY` value from the `.env` file.

## Available Tools

This server exposes numerous tools corresponding to the methods in the `@missionsquad/avantage` library. Tools are generally named `module_method` (e.g., `coreStock_intraday`, `fundamentalData_companyOverview`).

Refer to the [Alpha Vantage documentation](https://www.alphavantage.co/documentation/) and the `@missionsquad/avantage` library's types (`src/types/*` within the library) for details on parameters and return structures.

**Example Tool Call (Conceptual MCP Request):**

```json
{
  "type": "call_tool",
  "requestId": "req-123",
  "tool": {
    "name": "coreStock_quote",
    "arguments": {
      "symbol": "IBM"
    }
  },
  "context": {
    "extraArgs": {
      "apiKey": "USER_SPECIFIC_AV_KEY" // Optional: User's key
    }
  }
}
```

**Tool Categories (Modules):**

- `alphaIntelligence_*`
- `commodities_*`
- `coreStock_*`
- `crypto_*`
- `economicIndicators_*`
- `forex_*`
- `fundamentalData_*`
- `optionsData_*` (Premium)
- `technicalIndicators_*`

Use the MCP `list_tools` command to get the full list of available tools, their descriptions, and parameter schemas.

## Configuration

Configure via `.env` file:

| Variable                    | Description                                                   | Default         |
| :-------------------------- | :------------------------------------------------------------ | :-------------- |
| `API_KEY`                   | Fallback Alpha Vantage API key if not in `extraArgs`          | `null`          |
| `LOG_LEVEL`                 | Logging level (`error`, `warn`, `info`, `debug`)              | `info`          |
| `RESOURCE_CLEANUP_INTERVAL` | Interval (ms) to clean up inactive AVantage client instances  | `1800000` (30m) |
| `AV_PREMIUM`                | Set to `true` to enable premium endpoint access in `avantage` | `false`         |

## Project Structure

Follows the generic MCP server template structure. Key files:

- `src/index.ts`: Main server entry point, tool definitions.
- `src/config.ts`: Configuration loading.
- `src/logger.ts`: Logging utility.
- `src/resource-manager.ts`: Manages `AVantage` instances.
- `src/schemas.ts`: Zod schemas for tool parameters.
- `.nexus/`: Nexus documentation.

## Nexus Documentation

- [`.nexus/features/avantage_integration/feature.md`](/.nexus/features/avantage_integration/feature.md)
- [`.nexus/architecture/server_structure.md`](/.nexus/architecture/server_structure.md)
- [`.nexus/guides/using_avantage_tools.md`](/.nexus/guides/using_avantage_tools.md)
- [`.nexus/decisions/decision_log.md`](/.nexus/decisions/decision_log.md)

## License

MIT (Assuming the template license is MIT. Verify.)