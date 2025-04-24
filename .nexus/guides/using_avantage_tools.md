# Guide: Using the Avantage MCP Tools

## Context

This MCP server exposes tools that wrap the `@j4ys0n/avantage` library, allowing LLMs to access Alpha Vantage data.

-   **Related:** [Avantage Integration Feature](../features/avantage_integration/feature.md)

## Goal

Explain how to call the tools provided by this server using the Model Context Protocol (MCP).

## Steps

1.  **List Available Tools (Optional):**
    *   Send an MCP `list_tools` request to the server.
    *   The response will contain an array of available tools, including their `name`, `description`, and `inputSchema` (in JSON Schema format). This helps understand what tools exist and what parameters they expect.
    *   Tool names generally follow the pattern `module_method` (e.g., `coreStock_intraday`, `fundamentalData_companyOverview`).

2.  **Identify the Target Tool and Parameters:**
    *   Choose the tool corresponding to the Alpha Vantage function you need (e.g., `coreStock_quote` to get a stock quote).
    *   Consult the `inputSchema` from `list_tools` or the `@j4ys0n/avantage` documentation (`src/types/*`) to understand the required and optional parameters.

3.  **Prepare the `call_tool` Request:**
    *   Construct an MCP `call_tool` request object.
    *   Set the `tool.name` to the target tool name (e.g., `"coreStock_quote"`).
    *   Populate the `tool.arguments` object with the required parameters, ensuring they match the types defined in the schema (e.g., `{"symbol": "IBM"}`).
    *   **(Authentication):** Provide the Alpha Vantage API key:
        *   **Recommended:** Include the key within the `context.extraArgs` object:
            ```json
            "context": {
              "extraArgs": {
                "apiKey": "YOUR_USER_SPECIFIC_AV_KEY"
              }
            }
            ```
        *   **Alternative (Fallback):** If `extraArgs.apiKey` is *not* provided, ensure the `API_KEY` environment variable is correctly set in the server's `.env` file. The server will use this fallback key.

4.  **Send the Request:**
    *   Send the JSON-formatted `call_tool` request to the server via its transport mechanism (typically stdio).

5.  **Process the Response:**
    *   The server will send back an MCP response.
    *   **Success:** The response will have `type: "call_tool_result"` and a `content` array containing the result from the Alpha Vantage API (usually as a JSON string).
        ```json
        {
          "type": "call_tool_result",
          "requestId": "req-123",
          "toolName": "coreStock_quote",
          "content": [
            {
              "type": "text",
              // JSON string containing the quote data
              "text": "{\"symbol\":\"IBM\",\"open\":229.01,\"high\":230.5,\"low\":228.6,\"price\":229.0,\"volume\":\"...\", ...}"
            }
          ]
        }
        ```
    *   **Error:** The response will have `type: "error"`. The `message` field will contain a user-friendly error description (e.g., missing API key, invalid symbol, error from Alpha Vantage).
        ```json
        {
          "type": "error",
          "requestId": "req-123",
          "message": "UserError: Authentication failed: No API key provided..."
        }
        ```

## Example Request (Get IBM Quote using extraArgs)

```json
{
  "type": "call_tool",
  "requestId": "req-ibm-quote",
  "tool": {
    "name": "coreStock_quote",
    "arguments": {
      "symbol": "IBM"
    }
  },
  "context": {
    "extraArgs": {
      "apiKey": "YOUR_ALPHA_VANTAGE_KEY_HERE"
    }
  }
}
```

## Important Notes

*   **API Key:** A valid Alpha Vantage API key is always required, either via `extraArgs` or the server's `.env` file.
*   **Parameters:** Ensure all required parameters for a tool are provided and match the expected types (string, number, boolean, enum). Refer to the `list_tools` schema.
*   **Premium Endpoints:** Some tools (e.g., `optionsData_*`, `fundamentalData_companyOverview`) require a premium Alpha Vantage subscription. The server must be configured with `AV_PREMIUM=true` in its `.env` file for these tools to potentially succeed (assuming the API key used is also premium). If called without premium configuration, they will return a `UserError`.
*   **Rate Limits:** Be mindful of Alpha Vantage API rate limits. This server does not implement automatic throttling or retries. Excessive calls may lead to errors from the API.
*   **Return Format:** Successful calls typically return data as a JSON string within the `content[0].text` field. You will need to parse this JSON string in your application.

## AI Assistance Notes

-   Model Used: Claude 3.5 Sonnet
-   Prompt: User task to create MCP server using avantage library. Internal planning.
-   Date Generated: 2024-08-01
