#!/usr/bin/env node

import { FastMCP, UserError, Context } from "@missionsquad/fastmcp"; // Import Context
import { AVantage } from "@missionsquad/avantage";
import { z } from "zod";
import { resourceManager } from "./resource-manager.js";
import { config, apiKeyErrorMessage } from "./config.js";
import { logger } from "./logger.js";
import * as schemas from "./schemas.js"; // Import all schemas

// =============================================================================
// MCP Server Initialization
// =============================================================================

const server = new FastMCP({
  name: "mcp-avantage-server",
  version: "1.0.0",
  // description:
  //   "MCP Server providing tools to interact with the Alpha Vantage API via the @j4ys0n/avantage library.",
});

// =============================================================================
// Generic Tool Execution Logic
// =============================================================================

/**
 * A generic function to execute an Avantage library method within an MCP tool.
 * Handles API key resolution, AVantage instance management via ResourceManager,
 * calling the library method, and handling the response/errors.
 *
 * @param toolName The name of the MCP tool (for logging).
 * @param args Validated tool arguments.
 * @param context MCP execution context containing extraArgs and requestId.
 * @param avantageMethod A function that takes the AVantage instance and args, and calls the appropriate library method.
 * @returns The stringified data from the Avantage library call.
 * @throws {UserError} If authentication fails or the library call returns an error.
 */
async function executeAvantageTool<TArgs, TResult>(
  toolName: string,
  args: TArgs,
  context: Context<Record<string, unknown> | undefined>, // Use the imported Context type directly
  avantageMethod: (
    av: AVantage,
    args: TArgs
  ) => Promise<{ error?: boolean; reason?: string; data?: TResult }>
): Promise<string> {
  logger.info(`Executing '${toolName}' tool for request ID: ${context}`);
  logger.debug(`Args for ${toolName}: ${JSON.stringify(args)}`);

  // --- Authentication & Resource Management ---
  // Access extraArgs safely - it might be null or undefined
  const extraArgsApiKey = context.extraArgs?.apiKey as string | undefined;
  const apiKey = extraArgsApiKey || config.apiKey;

  if (!apiKey) {
    logger.error(`'${toolName}' failed: Alpha Vantage API key missing.`);
    throw new UserError(apiKeyErrorMessage);
  }
  logger.debug(
    `Using AV API key (source: ${extraArgsApiKey ? "extraArgs" : "environment"}) for ${toolName}`
  );

  try {
    // Get or create AVantage instance managed by ResourceManager
    const av = await resourceManager.getResource<AVantage>(
      apiKey, // Cache key is the resolved API key
      "avantage_client", // Type identifier for logging
      async (key) => {
        // Factory Function
        logger.info(
          `Creating new AVantage instance for key ending ...${key.slice(-4)}`
        );
        // AVantage library reads AV_PREMIUM from process.env internally
        return new AVantage(key);
      },
      async (avInstance) => {
        // Cleanup Function (no-op needed for AVantage)
        logger.debug(`Destroying AVantage instance (no-op)`);
      }
    );

    // --- Library Call ---
    const result = await avantageMethod(av, args);

    // --- Response Handling ---
    if (result.error) {
      logger.warn(
        `'${toolName}' failed. Reason from avantage: ${result.reason}`
      );
      throw new UserError(result.reason || `Tool '${toolName}' failed.`);
    }

    if (result.data === undefined || result.data === null) {
      logger.warn(`'${toolName}' completed successfully but returned no data.`);
      return "null"; // Return string "null" for empty data
    }

    logger.info(`'${toolName}' completed successfully.`);
    // Stringify the data part of the response
    return JSON.stringify(result.data);
  } catch (error: any) {
    logger.error(
      `Error during execution of '${toolName}': ${error.message}`,
      error
    );
    // If it's already a UserError, rethrow it
    if (error instanceof UserError) {
      throw error;
    }
    // Otherwise, wrap it in a UserError
    throw new UserError(
      `An unexpected error occurred while executing tool '${toolName}': ${error.message}`
    );
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

// --- Alpha Intelligence Tools ---
server.addTool({
  name: "alphaIntelligence_newsSentiments",
  description: "Fetches market news and sentiment data from Alpha Vantage.",
  parameters: schemas.NewsSentimentsParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "alphaIntelligence_newsSentiments",
      args,
      context,
      (av, params) => av.alphaIntelligence.newsSentiments(params)
    ),
});

server.addTool({
  name: "alphaIntelligence_topGainersLosers",
  description:
    "Retrieves the top N gainers, losers, and most actively traded US tickers.",
  parameters: z.object({}), // No parameters needed
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "alphaIntelligence_topGainersLosers",
      args,
      context,
      (av) => av.alphaIntelligence.topGainersLosers()
    ),
});

server.addTool({
  name: "alphaIntelligence_insiderTransactions",
  description:
    "Fetches aggregated insider trading information for a given symbol.",
  parameters: schemas.InsiderTransactionsParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "alphaIntelligence_insiderTransactions",
      args,
      context,
      (av, params) => av.alphaIntelligence.insiderTransactions(params.symbol)
    ),
});

// Note: Analytics endpoints are complex and might require more specific handling or schema adjustments
// server.addTool({
//   name: 'alphaIntelligence_fixedWindowAnalytics',
//   description: 'Performs analytics calculations over a fixed time window.',
//   parameters: schemas.FixedWindowAnalyticsParamsSchema,
//   execute: (args, context) => // Let type be inferred
//     executeAvantageTool('alphaIntelligence_fixedWindowAnalytics', args, context, (av, params) => av.alphaIntelligence.fixedWindowAnalytics(params)),
// })

// server.addTool({
//   name: 'alphaIntelligence_slidingWindowAnalytics',
//   description: 'Performs analytics calculations over a sliding time window.',
//   parameters: schemas.SlidingWindowAnalyticsParamsSchema,
//   execute: (args, context) => // Let type be inferred
//     executeAvantageTool('alphaIntelligence_slidingWindowAnalytics', args, context, (av, params) => av.alphaIntelligence.slidingWindowAnalytics(params)),
// })

// --- Commodities Tools ---
server.addTool({
  name: "commodities_wtiCrudeOil",
  description: "Retrieves West Texas Intermediate (WTI) crude oil prices.",
  parameters: schemas.CommoditiesDailyWeeklyMonthlyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "commodities_wtiCrudeOil",
      args,
      context,
      (av, params) => av.commodities.wtiCrudeOil(params)
    ),
});

server.addTool({
  name: "commodities_brentCrudeOil",
  description: "Retrieves Brent crude oil prices.",
  parameters: schemas.CommoditiesDailyWeeklyMonthlyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "commodities_brentCrudeOil",
      args,
      context,
      (av, params) => av.commodities.brentCrudeOil(params)
    ),
});

server.addTool({
  name: "commodities_naturalGas",
  description: "Retrieves natural gas prices.",
  parameters: schemas.CommoditiesDailyWeeklyMonthlyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("commodities_naturalGas", args, context, (av, params) =>
      av.commodities.naturalGas(params)
    ),
});

server.addTool({
  name: "commodities_copper",
  description: "Retrieves copper prices.",
  parameters: schemas.CommoditiesMonthlyQuarterlyAnnualParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("commodities_copper", args, context, (av, params) =>
      av.commodities.copper(params)
    ),
});

server.addTool({
  name: "commodities_aluminum",
  description: "Retrieves aluminum prices.",
  parameters: schemas.CommoditiesMonthlyQuarterlyAnnualParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("commodities_aluminum", args, context, (av, params) =>
      av.commodities.aluminum(params)
    ),
});

server.addTool({
  name: "commodities_wheat",
  description: "Retrieves wheat prices.",
  parameters: schemas.CommoditiesMonthlyQuarterlyAnnualParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("commodities_wheat", args, context, (av, params) =>
      av.commodities.wheat(params)
    ),
});

server.addTool({
  name: "commodities_corn",
  description: "Retrieves corn prices.",
  parameters: schemas.CommoditiesMonthlyQuarterlyAnnualParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("commodities_corn", args, context, (av, params) =>
      av.commodities.corn(params)
    ),
});

server.addTool({
  name: "commodities_cotton",
  description: "Retrieves cotton prices.",
  parameters: schemas.CommoditiesMonthlyQuarterlyAnnualParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("commodities_cotton", args, context, (av, params) =>
      av.commodities.cotton(params)
    ),
});

server.addTool({
  name: "commodities_sugar",
  description: "Retrieves sugar prices.",
  parameters: schemas.CommoditiesMonthlyQuarterlyAnnualParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("commodities_sugar", args, context, (av, params) =>
      av.commodities.sugar(params)
    ),
});

server.addTool({
  name: "commodities_coffee",
  description: "Retrieves coffee prices.",
  parameters: schemas.CommoditiesMonthlyQuarterlyAnnualParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("commodities_coffee", args, context, (av, params) =>
      av.commodities.coffee(params)
    ),
});

server.addTool({
  name: "commodities_globalIndex",
  description: "Retrieves the global commodity index.",
  parameters: schemas.CommoditiesMonthlyQuarterlyAnnualParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "commodities_globalIndex",
      args,
      context,
      (av, params) => av.commodities.globalIndex(params)
    ),
});

// --- Core Stock Tools ---
server.addTool({
  name: "coreStock_intraday",
  description: "Fetches intraday time series data for a stock symbol.",
  parameters: schemas.CoreStockIntradayParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("coreStock_intraday", args, context, (av, params) =>
      av.coreStock.intraday(params)
    ),
});

server.addTool({
  name: "coreStock_daily",
  description: "Fetches daily time series data for a stock symbol.",
  parameters: schemas.CoreStockDailyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("coreStock_daily", args, context, (av, params) =>
      av.coreStock.daily(params)
    ),
});

server.addTool({
  name: "coreStock_dailyAdjusted",
  description: "Fetches daily adjusted time series data for a stock symbol.",
  parameters: schemas.CoreStockDailyAdjustedParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "coreStock_dailyAdjusted",
      args,
      context,
      (av, params) => av.coreStock.dailyAdjusted(params)
    ),
});

server.addTool({
  name: "coreStock_weekly",
  description: "Fetches weekly time series data for a stock symbol.",
  parameters: schemas.CoreStockWeeklyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("coreStock_weekly", args, context, (av, params) =>
      av.coreStock.weekly(params)
    ),
});

server.addTool({
  name: "coreStock_weeklyAdjusted",
  description: "Fetches weekly adjusted time series data for a stock symbol.",
  parameters: schemas.CoreStockWeeklyAdjustedParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "coreStock_weeklyAdjusted",
      args,
      context,
      (av, params) => av.coreStock.weeklyAdjusted(params)
    ),
});

server.addTool({
  name: "coreStock_monthly",
  description: "Fetches monthly time series data for a stock symbol.",
  parameters: schemas.CoreStockMonthlyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("coreStock_monthly", args, context, (av, params) =>
      av.coreStock.monthly(params)
    ),
});

server.addTool({
  name: "coreStock_monthlyAdjusted",
  description: "Fetches monthly adjusted time series data for a stock symbol.",
  parameters: schemas.CoreStockMonthlyAdjustedParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "coreStock_monthlyAdjusted",
      args,
      context,
      (av, params) => av.coreStock.monthlyAdjusted(params)
    ),
});

server.addTool({
  name: "coreStock_quote",
  description: "Fetches a global quote for a single stock symbol.",
  parameters: schemas.CoreStockQuoteParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("coreStock_quote", args, context, (av, params) =>
      av.coreStock.quote(params)
    ),
});

server.addTool({
  name: "coreStock_bulkQuotes",
  description:
    "Fetches realtime quotes for multiple stock symbols (up to 100). Premium endpoint.",
  parameters: schemas.CoreStockBulkQuotesParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("coreStock_bulkQuotes", args, context, (av, params) =>
      av.coreStock.bulkQuotes(params)
    ),
});

server.addTool({
  name: "coreStock_search",
  description: "Searches for stock symbols matching keywords.",
  parameters: schemas.CoreStockSearchParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("coreStock_search", args, context, (av, params) =>
      av.coreStock.search(params)
    ),
});

// --- Crypto Tools ---
server.addTool({
  name: "crypto_exchangeRates",
  description:
    "Fetches the realtime exchange rate for a cryptocurrency pair (e.g., BTC to USD).",
  parameters: schemas.CryptoExchangeRateParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("crypto_exchangeRates", args, context, (av, params) =>
      av.crypto.exchangeRates(params.from_currency, params.to_currency)
    ),
});

server.addTool({
  name: "crypto_intraday",
  description: "Fetches intraday time series data for a cryptocurrency.",
  parameters: schemas.CryptoIntradayParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("crypto_intraday", args, context, (av, params) =>
      av.crypto.intraday(params)
    ),
});

server.addTool({
  name: "crypto_daily",
  description: "Fetches daily time series data for a cryptocurrency.",
  parameters: schemas.CryptoTimeSeriesParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("crypto_daily", args, context, (av, params) =>
      av.crypto.daily(params)
    ),
});

server.addTool({
  name: "crypto_weekly",
  description: "Fetches weekly time series data for a cryptocurrency.",
  parameters: schemas.CryptoTimeSeriesParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("crypto_weekly", args, context, (av, params) =>
      av.crypto.weekly(params)
    ),
});

server.addTool({
  name: "crypto_monthly",
  description: "Fetches monthly time series data for a cryptocurrency.",
  parameters: schemas.CryptoTimeSeriesParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("crypto_monthly", args, context, (av, params) =>
      av.crypto.monthly(params)
    ),
});

// --- Economic Indicators Tools ---
server.addTool({
  name: "economicIndicators_realGDP",
  description: "Retrieves US Real Gross Domestic Product (GDP) data.",
  parameters: schemas.EconomicIndicatorsRealGDPParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_realGDP",
      args,
      context,
      (av, params) => av.economicIndicators.realGDP(params)
    ),
});

server.addTool({
  name: "economicIndicators_realGDPPerCapita",
  description: "Retrieves US Real GDP per Capita data.",
  parameters: schemas.EconomicIndicatorsDataTypeParamSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_realGDPPerCapita",
      args,
      context,
      (av, params) => av.economicIndicators.realGDPPerCapita(params)
    ),
});

server.addTool({
  name: "economicIndicators_treasuryYield",
  description: "Retrieves US Treasury yield curve data for various maturities.",
  parameters: schemas.EconomicIndicatorsTreasuryYieldParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_treasuryYield",
      args,
      context,
      (av, params) => av.economicIndicators.treasuryYield(params)
    ),
});

server.addTool({
  name: "economicIndicators_federalFundsRate",
  description: "Retrieves the effective federal funds rate.",
  parameters: schemas.EconomicIndicatorsFederalFundsRateParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_federalFundsRate",
      args,
      context,
      (av, params) => av.economicIndicators.federalFundsRate(params)
    ),
});

server.addTool({
  name: "economicIndicators_cpi",
  description: "Retrieves US Consumer Price Index (CPI) data.",
  parameters: schemas.EconomicIndicatorsCPIParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("economicIndicators_cpi", args, context, (av, params) =>
      av.economicIndicators.cpi(params)
    ),
});

server.addTool({
  name: "economicIndicators_inflation",
  description: "Retrieves US inflation rate data.",
  parameters: schemas.EconomicIndicatorsDataTypeParamSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_inflation",
      args,
      context,
      (av, params) => av.economicIndicators.inflation(params)
    ),
});

server.addTool({
  name: "economicIndicators_retailSales",
  description: "Retrieves US retail sales data.",
  parameters: schemas.EconomicIndicatorsDataTypeParamSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_retailSales",
      args,
      context,
      (av, params) => av.economicIndicators.retailSales(params)
    ),
});

server.addTool({
  name: "economicIndicators_durableGoodsOrders",
  description: "Retrieves US durable goods orders data.",
  parameters: schemas.EconomicIndicatorsDataTypeParamSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_durableGoodsOrders",
      args,
      context,
      (av, params) => av.economicIndicators.durableGoodsOrders(params)
    ),
});

server.addTool({
  name: "economicIndicators_unemploymentRate",
  description: "Retrieves US unemployment rate data.",
  parameters: schemas.EconomicIndicatorsDataTypeParamSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_unemploymentRate",
      args,
      context,
      (av, params) => av.economicIndicators.unemploymentRate(params)
    ),
});

server.addTool({
  name: "economicIndicators_nonfarmPayroll",
  description: "Retrieves US nonfarm payroll data.",
  parameters: schemas.EconomicIndicatorsDataTypeParamSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "economicIndicators_nonfarmPayroll",
      args,
      context,
      (av, params) => av.economicIndicators.nonfarmPayroll(params)
    ),
});

// --- Forex Tools ---
server.addTool({
  name: "forex_exchangeRates",
  description:
    "Fetches the realtime exchange rate for a currency pair (e.g., EUR to USD).",
  parameters: schemas.ForexExchangeRateParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("forex_exchangeRates", args, context, (av, params) =>
      av.forex.exchangeRates(params.from_currency, params.to_currency)
    ),
});

server.addTool({
  name: "forex_intraday",
  description: "Fetches intraday time series data for a Forex pair.",
  parameters: schemas.ForexIntradayParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("forex_intraday", args, context, (av, params) =>
      av.forex.intraday(params)
    ),
});

server.addTool({
  name: "forex_daily",
  description: "Fetches daily time series data for a Forex pair.",
  parameters: schemas.ForexDailyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("forex_daily", args, context, (av, params) =>
      av.forex.daily(params)
    ),
});

server.addTool({
  name: "forex_weekly",
  description: "Fetches weekly time series data for a Forex pair.",
  parameters: schemas.ForexWeeklyMonthlyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("forex_weekly", args, context, (av, params) =>
      av.forex.weekly(params)
    ),
});

server.addTool({
  name: "forex_monthly",
  description: "Fetches monthly time series data for a Forex pair.",
  parameters: schemas.ForexWeeklyMonthlyParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("forex_monthly", args, context, (av, params) =>
      av.forex.monthly(params)
    ),
});

// --- Fundamental Data Tools ---
server.addTool({
  name: "fundamentalData_companyOverview",
  description: "Fetches company overview details. Premium endpoint.",
  parameters: schemas.FundamentalDataSymbolParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_companyOverview",
      args,
      context,
      (av, params) => av.fundamentalData.companyOverview(params.symbol)
    ),
});

server.addTool({
  name: "fundamentalData_etfProfile",
  description: "Fetches ETF profile details.",
  parameters: schemas.FundamentalDataSymbolParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_etfProfile",
      args,
      context,
      (av, params) => av.fundamentalData.etfProfile(params.symbol)
    ),
});

server.addTool({
  name: "fundamentalData_dividends",
  description: "Fetches historical dividend data for a symbol.",
  parameters: schemas.FundamentalDataSymbolParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_dividends",
      args,
      context,
      (av, params) => av.fundamentalData.dividends(params.symbol)
    ),
});

server.addTool({
  name: "fundamentalData_splits",
  description: "Fetches historical stock split data for a symbol.",
  parameters: schemas.FundamentalDataSymbolParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("fundamentalData_splits", args, context, (av, params) =>
      av.fundamentalData.splits(params.symbol)
    ),
});

server.addTool({
  name: "fundamentalData_incomeStatement",
  description:
    "Fetches income statement data (annual/quarterly). Premium endpoint.",
  parameters: schemas.FundamentalDataSymbolParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_incomeStatement",
      args,
      context,
      (av, params) => av.fundamentalData.incomeStatement(params.symbol)
    ),
});

server.addTool({
  name: "fundamentalData_balanceSheet",
  description:
    "Fetches balance sheet data (annual/quarterly). Premium endpoint.",
  parameters: schemas.FundamentalDataSymbolParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_balanceSheet",
      args,
      context,
      (av, params) => av.fundamentalData.balanceSheet(params.symbol)
    ),
});

server.addTool({
  name: "fundamentalData_cashFlow",
  description: "Fetches cash flow data (annual/quarterly). Premium endpoint.",
  parameters: schemas.FundamentalDataSymbolParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_cashFlow",
      args,
      context,
      (av, params) => av.fundamentalData.cashFlow(params.symbol)
    ),
});

server.addTool({
  name: "fundamentalData_earnings",
  description: "Fetches earnings data (annual/quarterly). Premium endpoint.",
  parameters: schemas.FundamentalDataSymbolParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_earnings",
      args,
      context,
      (av, params) => av.fundamentalData.earnings(params.symbol)
    ),
});

server.addTool({
  name: "fundamentalData_listingStatus",
  description: "Fetches active or delisted symbols (CSV endpoint).",
  parameters: schemas.FundamentalDataListingStatusParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_listingStatus",
      args,
      context,
      (av, params) => av.fundamentalData.listingStatus(params)
    ),
});

server.addTool({
  name: "fundamentalData_earningsCalendar",
  description: "Fetches upcoming earnings calendar (CSV endpoint).",
  parameters: schemas.FundamentalDataEarningsCalendarParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "fundamentalData_earningsCalendar",
      args,
      context,
      (av, params) => av.fundamentalData.earningsCalendar(params)
    ),
});

server.addTool({
  name: "fundamentalData_ipoCalendar",
  description: "Fetches upcoming IPO calendar (CSV endpoint).",
  parameters: z.object({}), // No parameters
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("fundamentalData_ipoCalendar", args, context, (av) =>
      av.fundamentalData.ipoCalendar()
    ),
});

// --- Options Data Tools (Premium) ---
server.addTool({
  name: "optionsData_realtimeOptions",
  description: "Fetches realtime options chain data. Premium endpoint.",
  parameters: schemas.OptionsDataRealtimeOptionsParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "optionsData_realtimeOptions",
      args,
      context,
      (av, params) => av.optionsData.realtimeOptions(params)
    ),
});

server.addTool({
  name: "optionsData_historicalOptions",
  description: "Fetches historical options chain data. Premium endpoint.",
  parameters: schemas.OptionsDataHistoricalOptionsParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "optionsData_historicalOptions",
      args,
      context,
      (av, params) => av.optionsData.historicalOptions(params)
    ),
});

// --- Technical Indicators Tools ---
// Group 1: Basic Moving Averages
server.addTool({
  name: "technicalIndicators_sma",
  description: "Simple Moving Average (SMA)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_sma",
      args,
      context,
      (av, params) => av.technicalIndicators.sma(params)
    ),
});
server.addTool({
  name: "technicalIndicators_ema",
  description: "Exponential Moving Average (EMA)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_ema",
      args,
      context,
      (av, params) => av.technicalIndicators.ema(params)
    ),
});
server.addTool({
  name: "technicalIndicators_wma",
  description: "Weighted Moving Average (WMA)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_wma",
      args,
      context,
      (av, params) => av.technicalIndicators.wma(params)
    ),
});
server.addTool({
  name: "technicalIndicators_dema",
  description: "Double Exponential Moving Average (DEMA)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_dema",
      args,
      context,
      (av, params) => av.technicalIndicators.dema(params)
    ),
});
server.addTool({
  name: "technicalIndicators_tema",
  description: "Triple Exponential Moving Average (TEMA)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_tema",
      args,
      context,
      (av, params) => av.technicalIndicators.tema(params)
    ),
});
server.addTool({
  name: "technicalIndicators_trima",
  description: "Triangular Moving Average (TRIMA)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_trima",
      args,
      context,
      (av, params) => av.technicalIndicators.trima(params)
    ),
});
server.addTool({
  name: "technicalIndicators_kama",
  description: "Kaufman Adaptive Moving Average (KAMA)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_kama",
      args,
      context,
      (av, params) => av.technicalIndicators.kama(params)
    ),
});

// Group 2: Volume Indicators
server.addTool({
  name: "technicalIndicators_ad",
  description: "Chaikin A/D Line",
  parameters: schemas.TechnicalIndicatorsCommonIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("technicalIndicators_ad", args, context, (av, params) =>
      av.technicalIndicators.ad(params)
    ),
});
server.addTool({
  name: "technicalIndicators_adosc",
  description: "Chaikin A/D Oscillator",
  parameters: schemas.TechnicalIndicatorsFastSlowIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_adosc",
      args,
      context,
      (av, params) => av.technicalIndicators.adosc(params)
    ),
});
server.addTool({
  name: "technicalIndicators_obv",
  description: "On Balance Volume (OBV)",
  parameters: schemas.TechnicalIndicatorsCommonIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_obv",
      args,
      context,
      (av, params) => av.technicalIndicators.obv(params)
    ),
});

// Group 3: Hilbert Transform Indicators
server.addTool({
  name: "technicalIndicators_htTrendline",
  description: "Hilbert Transform - Instantaneous Trendline",
  parameters: schemas.TechnicalIndicatorsHtTrendlineParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_htTrendline",
      args,
      context,
      (av, params) => av.technicalIndicators.htTrendline(params)
    ),
});
server.addTool({
  name: "technicalIndicators_htSine",
  description: "Hilbert Transform - Sine Wave",
  parameters: schemas.TechnicalIndicatorsHtSineParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_htSine",
      args,
      context,
      (av, params) => av.technicalIndicators.htSine(params)
    ),
});
server.addTool({
  name: "technicalIndicators_htTrendmode",
  description: "Hilbert Transform - Trend vs Cycle Mode",
  parameters: schemas.TechnicalIndicatorsHtTrendmodeParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_htTrendmode",
      args,
      context,
      (av, params) => av.technicalIndicators.htTrendmode(params)
    ),
});
server.addTool({
  name: "technicalIndicators_htDcperiod",
  description: "Hilbert Transform - Dominant Cycle Period",
  parameters: schemas.TechnicalIndicatorsHtDcperiodParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_htDcperiod",
      args,
      context,
      (av, params) => av.technicalIndicators.htDcperiod(params)
    ),
});
server.addTool({
  name: "technicalIndicators_htDcphase",
  description: "Hilbert Transform - Dominant Cycle Phase",
  parameters: schemas.TechnicalIndicatorsHtDcphaseParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_htDcphase",
      args,
      context,
      (av, params) => av.technicalIndicators.htDcphase(params)
    ),
});
server.addTool({
  name: "technicalIndicators_htPhasor",
  description: "Hilbert Transform - Phasor Components",
  parameters: schemas.TechnicalIndicatorsHtPhasorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_htPhasor",
      args,
      context,
      (av, params) => av.technicalIndicators.htPhasor(params)
    ),
});

// Group 4: MAMA Indicator
server.addTool({
  name: "technicalIndicators_mama",
  description: "MESA Adaptive Moving Average (MAMA)",
  parameters: schemas.TechnicalIndicatorsMamaIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_mama",
      args,
      context,
      (av, params) => av.technicalIndicators.mama(params)
    ),
});

// Group 5: T3 and NATR
server.addTool({
  name: "technicalIndicators_t3",
  description: "Triple Exponential Moving Average (T3)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("technicalIndicators_t3", args, context, (av, params) =>
      av.technicalIndicators.t3(params)
    ),
});
server.addTool({
  name: "technicalIndicators_natr",
  description: "Normalized Average True Range (NATR)",
  parameters: schemas.TechnicalIndicatorsNatrParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_natr",
      args,
      context,
      (av, params) => av.technicalIndicators.natr(params)
    ),
});

// Group 6: VWAP (Premium)
server.addTool({
  name: "technicalIndicators_vwap",
  description:
    "Volume Weighted Average Price (VWAP). Premium endpoint, requires intraday interval.",
  parameters: schemas.TechnicalIndicatorsCommonIndicatorParamsSchema, // Requires interval check
  execute: (args, context) => {
    // Let type be inferred
    // Add specific check for VWAP interval requirement
    if (!args.interval.includes("min")) {
      throw new UserError(
        "VWAP only supports intraday intervals (e.g., 1min, 5min, 15min, 30min, 60min)."
      );
    }
    return executeAvantageTool(
      "technicalIndicators_vwap",
      args,
      context,
      (av, params) => av.technicalIndicators.vwap(params)
    );
  },
});

// Other Indicators
server.addTool({
  name: "technicalIndicators_rocr",
  description: "Rate of change ratio (ROCR)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_rocr",
      args,
      context,
      (av, params) => av.technicalIndicators.rocr(params)
    ),
});
server.addTool({
  name: "technicalIndicators_aroon",
  description: "Aroon",
  parameters: schemas.TechnicalIndicatorsAroonParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_aroon",
      args,
      context,
      (av, params) => av.technicalIndicators.aroon(params)
    ),
});
server.addTool({
  name: "technicalIndicators_aroonosc",
  description: "Aroon Oscillator",
  parameters: schemas.TechnicalIndicatorsAroonOscParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_aroonosc",
      args,
      context,
      (av, params) => av.technicalIndicators.aroonosc(params)
    ),
});
server.addTool({
  name: "technicalIndicators_mfi",
  description: "Money Flow Index (MFI)",
  parameters: schemas.TechnicalIndicatorsMfiParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_mfi",
      args,
      context,
      (av, params) => av.technicalIndicators.mfi(params)
    ),
});
server.addTool({
  name: "technicalIndicators_trix",
  description: "1-day Rate Of Change (ROC) of a Triple Smooth EMA (TRIX)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_trix",
      args,
      context,
      (av, params) => av.technicalIndicators.trix(params)
    ),
});
server.addTool({
  name: "technicalIndicators_ultosc",
  description: "Ultimate Oscillator",
  parameters: schemas.TechnicalIndicatorsCommonIndicatorParamsSchema, // Needs specific params? Check AV docs
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_ultosc",
      args,
      context,
      (av, params) => av.technicalIndicators.ultosc(params)
    ),
});
server.addTool({
  name: "technicalIndicators_dx",
  description: "Directional Movement Index (DX)",
  parameters: schemas.TechnicalIndicatorsDxParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool("technicalIndicators_dx", args, context, (av, params) =>
      av.technicalIndicators.dx(params)
    ),
});
server.addTool({
  name: "technicalIndicators_minusDI",
  description: "Minus Directional Indicator (-DI)",
  parameters: schemas.TechnicalIndicatorsMinusDiParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_minusDI",
      args,
      context,
      (av, params) => av.technicalIndicators.minusDI(params)
    ),
});
server.addTool({
  name: "technicalIndicators_plusDI",
  description: "Plus Directional Indicator (+DI)",
  parameters: schemas.TechnicalIndicatorsPlusDiParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_plusDI",
      args,
      context,
      (av, params) => av.technicalIndicators.plusDI(params)
    ),
});
server.addTool({
  name: "technicalIndicators_minusDM",
  description: "Minus Directional Movement (-DM)",
  parameters: schemas.TechnicalIndicatorsMinusDmParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_minusDM",
      args,
      context,
      (av, params) => av.technicalIndicators.minusDM(params)
    ),
});
server.addTool({
  name: "technicalIndicators_plusDM",
  description: "Plus Directional Movement (+DM)",
  parameters: schemas.TechnicalIndicatorsPlusDmParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_plusDM",
      args,
      context,
      (av, params) => av.technicalIndicators.plusDM(params)
    ),
});
server.addTool({
  name: "technicalIndicators_bbands",
  description: "Bollinger Bands (BBANDS)",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema, // Needs more params? Check AV docs
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_bbands",
      args,
      context,
      (av, params) => av.technicalIndicators.bbands(params)
    ),
});
server.addTool({
  name: "technicalIndicators_midpoint",
  description: "Midpoint over period",
  parameters: schemas.TechnicalIndicatorsTimeSeriesIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_midpoint",
      args,
      context,
      (av, params) => av.technicalIndicators.midpoint(params)
    ),
});
server.addTool({
  name: "technicalIndicators_midprice",
  description: "Midpoint price over period",
  parameters: schemas.TechnicalIndicatorsMidpriceParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_midprice",
      args,
      context,
      (av, params) => av.technicalIndicators.midprice(params)
    ),
});
server.addTool({
  name: "technicalIndicators_sar",
  description: "Parabolic SAR",
  parameters: schemas.TechnicalIndicatorsCommonIndicatorParamsSchema, // Needs more params? Check AV docs
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_sar",
      args,
      context,
      (av, params) => av.technicalIndicators.sar(params)
    ),
});
server.addTool({
  name: "technicalIndicators_trange",
  description: "True Range",
  parameters: schemas.TechnicalIndicatorsCommonIndicatorParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_trange",
      args,
      context,
      (av, params) => av.technicalIndicators.trange(params)
    ),
});
server.addTool({
  name: "technicalIndicators_atr",
  description: "Average True Range (ATR)",
  parameters: schemas.TechnicalIndicatorsAtrParamsSchema,
  execute: (
    args,
    context // Let type be inferred
  ) =>
    executeAvantageTool(
      "technicalIndicators_atr",
      args,
      context,
      (av, params) => av.technicalIndicators.atr(params)
    ),
});

// =============================================================================
// Server Lifecycle and Event Handling
// =============================================================================

server.on("connect", (event) => {
  // Access client ID via session
  logger.info(`Client connected: ${event.session}`);
});

server.on("disconnect", (event) => {
  // Access client ID via session
  logger.info(`Client disconnected: ${event.session}`);
});

// Removed server.on('error', ...) as it's not a standard FastMCP event
// and errors are handled via promises and process events.

// Graceful shutdown handling
const cleanup = () => {
  logger.info("Shutting down server and cleaning up resources...");
  resourceManager.destroyAllNow();
  logger.info("Resource cleanup complete.");
};

process.on("SIGINT", () => {
  logger.info("Received SIGINT signal.");
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM signal.");
  cleanup();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION:", error);
  cleanup();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("UNHANDLED REJECTION:", reason);
  cleanup();
  process.exit(1);
});

// =============================================================================
// Start the Server
// =============================================================================

server
  .start({
    transportType: "stdio",
  })
  .then(() => {
    logger.info(
      `🚀 ${server.options.name} v${server.options.version} started successfully on stdio.`
    );
    logger.info("Waiting for MCP client connections...");
  })
  .catch((error) => {
    logger.error("❌ Failed to start MCP server:", error);
    process.exit(1);
  });
