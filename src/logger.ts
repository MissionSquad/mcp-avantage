import { config } from './config.js'

/**
 * Defines the available log levels and their severity order.
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const

type LogLevel = keyof typeof logLevels

/**
 * Simple logger writing to stderr based on configured level.
 */
export const logger = {
  error: (message: string, ...args: any[]): void => {
    if (logLevels[config.logLevel as LogLevel] >= logLevels.error) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args)
    }
  },
  warn: (message: string, ...args: any[]): void => {
    if (logLevels[config.logLevel as LogLevel] >= logLevels.warn) {
      console.error(`[WARN]  ${new Date().toISOString()} - ${message}`, ...args)
    }
  },
  info: (message: string, ...args: any[]): void => {
    if (logLevels[config.logLevel as LogLevel] >= logLevels.info) {
      console.error(`[INFO]  ${new Date().toISOString()} - ${message}`, ...args)
    }
  },
  debug: (message: string, ...args: any[]): void => {
    if (logLevels[config.logLevel as LogLevel] >= logLevels.debug) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args)
    }
  },
}
