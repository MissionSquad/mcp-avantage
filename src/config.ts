import dotenv from 'dotenv'
import { z } from 'zod'
import { logger } from './logger.js' // Import logger for logging config

// Load environment variables from .env file
dotenv.config()

/**
 * Defines the schema for the application configuration using Zod.
 */
const ConfigSchema = z.object({
  /**
   * Alpha Vantage API Key.
   * Serves as a fallback if not provided via extraArgs.apiKey.
   */
  apiKey: z.string().optional(),

  /**
   * Logging level for the application.
   */
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  /**
   * Interval in milliseconds for the ResourceManager to clean up inactive resources.
   */
  resourceCleanupInterval: z
    .number()
    .int()
    .positive()
    .default(30 * 60 * 1000), // Default: 30 minutes

  /**
   * Flag indicating if the user has an Alpha Vantage premium subscription.
   * This is read by the @j4ys0n/avantage library internally.
   */
  avPremium: z
    .string() // Read as string initially
    .transform((val) => val.toLowerCase() === 'true') // Convert to boolean
    .default('false'), // Default to false if not set

  // --- Optional Retry Config (Not used by default template but kept for potential future use) ---
  // maxRetries: z.number().int().min(0).default(3),
  // retryBaseDelay: z.number().int().positive().default(1000),
})

// --- Configuration Loading and Validation ---

const parsedConfig = ConfigSchema.safeParse({
  apiKey: process.env.API_KEY,
  logLevel: process.env.LOG_LEVEL,
  resourceCleanupInterval: process.env.RESOURCE_CLEANUP_INTERVAL
    ? parseInt(process.env.RESOURCE_CLEANUP_INTERVAL, 10)
    : undefined,
  avPremium: process.env.AV_PREMIUM, // Pass the string value
  // maxRetries: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES, 10) : undefined,
  // retryBaseDelay: process.env.RETRY_BASE_DELAY ? parseInt(process.env.RETRY_BASE_DELAY, 10) : undefined,
})

if (!parsedConfig.success) {
  console.error(
    '❌ Invalid environment configuration:',
    parsedConfig.error.flatten().fieldErrors,
  )
  throw new Error('Invalid environment configuration.')
  // process.exit(1); // Exit if config is invalid
}

// Export the validated and typed configuration object
export const config = parsedConfig.data

// --- Shared Constants ---

/**
 * Standard error message for missing Alpha Vantage API key.
 */
export const apiKeyErrorMessage =
  'Authentication failed: No Alpha Vantage API key provided in the request context (extraArgs.apiKey) and no fallback key found in environment variables (API_KEY).'

// Log the loaded configuration (excluding sensitive keys)
// Note: We log avPremium status, which is not sensitive.
logger.debug('Configuration loaded:', {
  logLevel: config.logLevel,
  resourceCleanupInterval: config.resourceCleanupInterval,
  avPremium: config.avPremium,
  apiKeyProvided: !!config.apiKey, // Log whether the fallback key is set, not the key itself
})

// Set the AV_PREMIUM environment variable based on parsed config for the avantage library to pick up
// This ensures the library uses the validated value.
process.env.AV_PREMIUM = String(config.avPremium)
logger.debug(`Set process.env.AV_PREMIUM to: ${process.env.AV_PREMIUM}`)
