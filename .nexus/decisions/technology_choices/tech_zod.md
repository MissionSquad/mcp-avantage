# Technology: Zod

## Context

The MCP server needs a way to define and validate the input parameters for each tool exposed to the LLM. FastMCP has built-in support for Zod schemas.

## Goal

Provide a reliable, type-safe, and declarative way to define and validate the schemas for MCP tool parameters.

## Decision

Use the Zod library for defining tool parameter schemas.

## Rationale

-   **Type Safety:** Zod schemas integrate directly with TypeScript, allowing static type inference for validated arguments within the `execute` function.
-   **Declarative Validation:** Provides a fluent and readable API for defining complex validation rules (required fields, optional fields, specific types, enums, etc.).
-   **FastMCP Integration:** `@missionsquad/fastmcp` uses Zod schemas directly in the `server.addTool()` definition for automatic request argument validation.
-   **Runtime Validation:** Ensures that the arguments received from the LLM conform to the expected structure before the tool logic is executed.
-   **Schema Introspection:** Zod schemas can be easily converted to JSON Schema, which FastMCP uses to generate the schema information for the MCP `list_tools` response.

## Alternatives Considered

-   **Manual Validation:** Writing imperative validation logic within each `execute` function. This is verbose, error-prone, and less maintainable.
-   **Other Validation Libraries (Joi, Yup, io-ts):** While viable, Zod's strong TypeScript focus and direct integration with FastMCP make it the most natural choice for this template.

## Consequences

-   Adds Zod as a project dependency.
-   Requires defining a Zod schema for each MCP tool in `src/schemas.ts`.
-   Tool parameters are automatically validated by FastMCP before the `execute` function is called.
-   Type safety is enhanced as the `args` parameter in `execute` is automatically inferred from the Zod schema.

## AI Assistance Notes

-   Model Used: Claude 3.5 Sonnet
-   Prompt: User task to create MCP server using avantage library. Internal planning.
-   Date Generated: 2024-08-01
