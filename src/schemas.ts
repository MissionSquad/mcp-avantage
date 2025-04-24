import { z } from 'zod'

// General Types used across schemas
const MinuteIntervalsSchema = z.enum(['1min', '5min', '15min', '30min', '60min']).describe('Intraday interval.')
const OutputSizeSchema = z.enum(['compact', 'full']).describe('Output size. Compact returns latest 100 data points, Full returns complete history.')
const DatatypeSchema = z.enum(['json', 'csv']).describe('Data format for the response.')
const DailyWeeklyMonthlySchema = z.enum(['daily', 'weekly', 'monthly']).describe('Time interval.')
const MonthlyQuarterlyAnnualSchema = z.enum(['monthly', 'quarterly', 'annual']).describe('Time interval.')
const SeriesTypeSchema = z.enum(['close', 'open', 'high', 'low']).describe('The desired price type.')

// === Alpha Intelligence Schemas ===
export const NewsSentimentsParamsSchema = z.object({
  tickersList: z.array(z.string()).optional().describe('List of stock/crypto/forex symbols (e.g., ["AAPL", "GOOGL"]).'),
  topics: z.string().optional().describe('Specific topics to filter news for (e.g., "technology", "earnings").'),
  time_from: z.string().optional().describe('Start time for news articles (YYYYMMDDTHHMM format).'),
  time_to: z.string().optional().describe('End time for news articles (YYYYMMDDTHHMM format).'),
  sort: z.enum(['LATEST', 'EARLIEST', 'RELEVANCE']).default('LATEST').optional().describe('Sort order for results.'),
  limit: z.number().int().min(1).max(1000).default(50).optional().describe('Number of results to return (1-1000).'),
}).describe('Parameters for fetching market news and sentiment data.')

export const InsiderTransactionsParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "AAPL").'),
}).describe('Parameters for fetching insider trading information.')

// Schemas for Analytics endpoints are complex and omitted for brevity,
// as they were commented out in the original library analysis.
// Add FixedWindowAnalyticsParamsSchema and SlidingWindowAnalyticsParamsSchema if needed.

// === Commodities Schemas ===
export const CommoditiesDailyWeeklyMonthlyParamsSchema = z.object({
  interval: DailyWeeklyMonthlySchema.optional().describe('Time interval for the data.'),
  datatype: DatatypeSchema.optional().describe('Response data format.'),
}).describe('Parameters for daily/weekly/monthly commodity data.')

export const CommoditiesMonthlyQuarterlyAnnualParamsSchema = z.object({
  interval: MonthlyQuarterlyAnnualSchema.optional().describe('Time interval for the data.'),
  datatype: DatatypeSchema.optional().describe('Response data format.'),
}).describe('Parameters for monthly/quarterly/annual commodity data.')

// === Core Stock Schemas ===
export const CoreStockIntradayParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  interval: MinuteIntervalsSchema,
  adjusted: z.boolean().default(true).optional().describe('Whether to return adjusted prices.'),
  extended_hours: z.boolean().default(true).optional().describe('Include pre-market and after-hours data?'),
  month: z.string().optional().describe('Specific month to retrieve data for (YYYY-MM format). Required for intervals longer than 5min if outputsize=full.'),
  outputsize: OutputSizeSchema.default('compact').optional(),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching intraday stock time series data.')

export const CoreStockDailyParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  outputsize: OutputSizeSchema.default('compact').optional(),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching daily stock time series data.')

export const CoreStockDailyAdjustedParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  outputsize: OutputSizeSchema.default('compact').optional(),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching daily adjusted stock time series data.')

export const CoreStockWeeklyParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching weekly stock time series data.')

export const CoreStockWeeklyAdjustedParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching weekly adjusted stock time series data.')

export const CoreStockMonthlyParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching monthly stock time series data.')

export const CoreStockMonthlyAdjustedParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching monthly adjusted stock time series data.')

export const CoreStockQuoteParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching a global quote for a stock.')

export const CoreStockBulkQuotesParamsSchema = z.object({
  symbols: z.array(z.string()).min(1).max(100).describe('Array of stock symbols (e.g., ["IBM", "AAPL"]). Max 100 symbols.'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching realtime quotes for multiple stocks (Premium).')

export const CoreStockSearchParamsSchema = z.object({
  keywords: z.string().describe('Keywords to search for (e.g., "International Business Machines").'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for searching stock symbols.')

// === Crypto Schemas ===
export const CryptoExchangeRateParamsSchema = z.object({
    from_currency: z.string().describe('The cryptocurrency symbol (e.g., "BTC").'),
    to_currency: z.string().describe('The physical currency symbol (e.g., "USD").'),
}).describe('Parameters for fetching cryptocurrency exchange rates.')

export const CryptoIntradayParamsSchema = z.object({
  symbol: z.string().describe('The cryptocurrency symbol (e.g., "BTC").'),
  market: z.string().describe('The exchange market (e.g., "USD", "EUR").'),
  interval: MinuteIntervalsSchema,
  outputsize: OutputSizeSchema.default('compact').optional(),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching intraday crypto time series data.')

export const CryptoTimeSeriesParamsSchema = z.object({
  symbol: z.string().describe('The cryptocurrency symbol (e.g., "BTC").'),
  market: z.string().describe('The exchange market (e.g., "USD", "EUR").'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching daily/weekly/monthly crypto time series data.')

// === Economic Indicators Schemas ===
export const EconomicIndicatorsRealGDPParamsSchema = z.object({
  interval: z.enum(['annual', 'quarterly']).default('annual').optional().describe('Time interval.'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching Real GDP data.')

export const EconomicIndicatorsDataTypeParamSchema = z.object({
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Common parameter schema accepting only datatype.')

export const EconomicIndicatorsTreasuryYieldParamsSchema = z.object({
  interval: DailyWeeklyMonthlySchema.default('monthly').optional(),
  maturity: z.enum(['3month', '2year', '5year', '7year', '10year', '30year']).default('10year').optional().describe('Treasury maturity period.'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching Treasury Yield data.')

export const EconomicIndicatorsFederalFundsRateParamsSchema = z.object({
  interval: DailyWeeklyMonthlySchema.default('monthly').optional(),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching Federal Funds Rate data.')

export const EconomicIndicatorsCPIParamsSchema = z.object({
  interval: z.enum(['monthly', 'semiannual']).default('monthly').optional().describe('Time interval.'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching CPI data.')

// === Forex Schemas ===
export const ForexExchangeRateParamsSchema = z.object({
    from_currency: z.string().describe('The currency symbol to convert from (e.g., "EUR").'),
    to_currency: z.string().describe('The currency symbol to convert to (e.g., "USD").'),
}).describe('Parameters for fetching Forex exchange rates.')

export const ForexIntradayParamsSchema = z.object({
  from_symbol: z.string().describe('The currency symbol to convert from (e.g., "EUR").'),
  to_symbol: z.string().describe('The currency symbol to convert to (e.g., "USD").'),
  interval: MinuteIntervalsSchema,
  outputsize: OutputSizeSchema.default('compact').optional(),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching intraday Forex time series data.')

export const ForexDailyParamsSchema = z.object({
  from_symbol: z.string().describe('The currency symbol to convert from (e.g., "EUR").'),
  to_symbol: z.string().describe('The currency symbol to convert to (e.g., "USD").'),
  outputsize: OutputSizeSchema.default('compact').optional(),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching daily Forex time series data.')

export const ForexWeeklyMonthlyParamsSchema = z.object({
  from_symbol: z.string().describe('The currency symbol to convert from (e.g., "EUR").'),
  to_symbol: z.string().describe('The currency symbol to convert to (e.g., "USD").'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching weekly/monthly Forex time series data.')

// === Fundamental Data Schemas ===
export const FundamentalDataSymbolParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
}).describe('Parameter schema requiring only a stock symbol.')

export const FundamentalDataListingStatusParamsSchema = z.object({
  symbol: z.string().optional().describe('Filter results for a specific symbol after fetching.'),
  date: z.string().optional().describe('List symbols active/delisted on a specific date (YYYY-MM-DD).'),
  state: z.enum(['active', 'delisted']).default('active').optional().describe('Filter by listing status.'),
}).describe('Parameters for fetching listing status (CSV endpoint).')

export const FundamentalDataEarningsCalendarParamsSchema = z.object({
  symbol: z.string().optional().describe('Fetch earnings calendar for a specific symbol.'),
  horizon: z.enum(['3month', '6month', '12month']).default('3month').optional().describe('Time horizon for upcoming earnings.'),
}).describe('Parameters for fetching earnings calendar (CSV endpoint).')

// IPO Calendar takes no parameters

// === Options Data Schemas ===
export const OptionsDataRealtimeOptionsParamsSchema = z.object({
  symbol: z.string().describe('The underlying stock symbol (e.g., "AAPL").'),
  contract: z.string().optional().describe('Specific option contract ID to fetch details for.'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching realtime options chain data (Premium).')

export const OptionsDataHistoricalOptionsParamsSchema = z.object({
  symbol: z.string().describe('The underlying stock symbol (e.g., "AAPL").'),
  date: z.string().optional().describe('Specific date (YYYY-MM-DD) for historical data.'),
  datatype: DatatypeSchema.default('json').optional(),
}).describe('Parameters for fetching historical options chain data (Premium).')

// === Technical Indicators Schemas ===
// Base schema for many indicators
export const TechnicalIndicatorsCommonIndicatorParamsSchema = z.object({
  symbol: z.string().describe('The stock symbol (e.g., "IBM").'),
  interval: z.string().describe('Time interval (e.g., "daily", "60min", "weekly"). Check Alpha Vantage docs for valid intervals per indicator.'),
  datatype: DatatypeSchema.default('json').optional(),
  month: z.string().optional().describe('Specific month for intraday intervals (YYYY-MM format).'),
}).describe('Common parameters for many technical indicators.')

// Schema for indicators requiring time_period and series_type
export const TechnicalIndicatorsTimeSeriesIndicatorParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({
  time_period: z.string().describe('Number of data points used to calculate the indicator.'), // Using string as AV API expects string
  series_type: SeriesTypeSchema,
}).describe('Parameters for time series based technical indicators.')

// Schema for indicators requiring fast/slow periods
export const TechnicalIndicatorsFastSlowIndicatorParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({
  fastperiod: z.string().optional().describe('Fast period setting (integer).'),
  slowperiod: z.string().optional().describe('Slow period setting (integer).'),
}).describe('Parameters for indicators with fast/slow period settings.')

// Schema for MAMA indicator
export const TechnicalIndicatorsMamaIndicatorParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({
  fastlimit: z.string().optional().default('0.01').describe('Fast limit parameter for MAMA.'),
  slowlimit: z.string().optional().default('0.01').describe('Slow limit parameter for MAMA.'),
  series_type: SeriesTypeSchema,
}).describe('Parameters for the MAMA technical indicator.')

// Schemas for Hilbert Transform indicators (omitting time_period)
export const TechnicalIndicatorsHtTrendlineParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({ series_type: SeriesTypeSchema }).describe('Parameters for HT_TRENDLINE.');
export const TechnicalIndicatorsHtSineParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({ series_type: SeriesTypeSchema }).describe('Parameters for HT_SINE.');
export const TechnicalIndicatorsHtTrendmodeParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({ series_type: SeriesTypeSchema }).describe('Parameters for HT_TRENDMODE.');
export const TechnicalIndicatorsHtDcperiodParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({ series_type: SeriesTypeSchema }).describe('Parameters for HT_DCPERIOD.');
export const TechnicalIndicatorsHtDcphaseParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({ series_type: SeriesTypeSchema }).describe('Parameters for HT_DCPHASE.');
export const TechnicalIndicatorsHtPhasorParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({ series_type: SeriesTypeSchema }).describe('Parameters for HT_PHASOR.');

// Schemas for indicators requiring time_period but not series_type
export const TechnicalIndicatorsTimePeriodOnlyParamsSchema = TechnicalIndicatorsCommonIndicatorParamsSchema.extend({
    time_period: z.string().describe('Number of data points used to calculate the indicator.'),
}).describe('Parameters for indicators requiring symbol, interval, and time_period.');

export const TechnicalIndicatorsNatrParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for NATR.');
export const TechnicalIndicatorsAroonParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for AROON.');
export const TechnicalIndicatorsAroonOscParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for AROONOSC.');
export const TechnicalIndicatorsMfiParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for MFI.');
export const TechnicalIndicatorsDxParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for DX.');
export const TechnicalIndicatorsMinusDiParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for MINUS_DI.');
export const TechnicalIndicatorsPlusDiParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for PLUS_DI.');
export const TechnicalIndicatorsMinusDmParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for MINUS_DM.');
export const TechnicalIndicatorsPlusDmParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for PLUS_DM.');
export const TechnicalIndicatorsMidpriceParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for MIDPRICE.');
export const TechnicalIndicatorsAtrParamsSchema = TechnicalIndicatorsTimePeriodOnlyParamsSchema.describe('Parameters for ATR.');

// Note: Some indicators like ULTOSC, BBANDS, SAR might require more specific parameters not covered by the common schemas.
// These schemas provide a starting point; refer to Alpha Vantage documentation for exact requirements per indicator.