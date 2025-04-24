import { v4 as uuidv4 } from 'uuid'
import { config } from './config.js'
import { logger } from './logger.js'

/**
 * Represents information about a managed resource.
 * @template T The type of the managed resource.
 */
interface ResourceInfo<T> {
  resource: T
  lastUsed: number
  instanceId: string
  resourceType: string
  cacheKey: string
  cleanupFn: (resource: T) => Promise<void>
}

/**
 * Manages the lifecycle of external resources like SDK clients or library instances.
 */
export class ResourceManager {
  private resources: Map<string, ResourceInfo<any>> = new Map()
  private readonly cleanupIntervalMs: number
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(options?: { cleanupIntervalMs?: number }) {
    this.cleanupIntervalMs =
      options?.cleanupIntervalMs ?? config.resourceCleanupInterval
    this.startCleanupTimer()
    logger.info(
      `ResourceManager initialized. Cleanup interval: ${this.cleanupIntervalMs}ms`,
    )
  }

  /**
   * Retrieves an existing resource or creates a new one.
   */
  public async getResource<T>(
    key: string,
    resourceType: string,
    factoryFn: (key: string) => Promise<T>,
    cleanupFn: (resource: T) => Promise<void>,
  ): Promise<T> {
    const existingInfo = this.resources.get(key)

    if (existingInfo) {
      logger.debug(
        `Reusing existing resource (Type: ${existingInfo.resourceType}, Instance ID: ${existingInfo.instanceId}) for key ending with ...${key.slice(-4)}`,
      )
      existingInfo.lastUsed = Date.now()
      if (existingInfo.resourceType !== resourceType) {
        logger.warn(
          `Resource type mismatch for key ${key}. Expected ${resourceType}, found ${existingInfo.resourceType}. Returning existing resource anyway.`,
        )
      }
      return existingInfo.resource as T
    }

    logger.info(
      `Creating new resource (Type: ${resourceType}) for key ending with ...${key.slice(-4)}`,
    )
    try {
      const newResource = await factoryFn(key)
      const instanceId = uuidv4()
      const newInfo: ResourceInfo<T> = {
        resource: newResource,
        lastUsed: Date.now(),
        instanceId: instanceId,
        resourceType: resourceType,
        cacheKey: key,
        cleanupFn: cleanupFn,
      }
      this.resources.set(key, newInfo)
      logger.info(
        `Successfully created resource (Type: ${resourceType}, Instance ID: ${instanceId})`,
      )
      return newResource
    } catch (error) {
      logger.error(
        `Failed to create resource (Type: ${resourceType}) for key ${key}: ${error instanceof Error ? error.message : String(error)}`,
        error,
      )
      throw new Error(
        `Resource factory function failed for type ${resourceType}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.cleanupTimer = setInterval(
      () => this.cleanupInactiveResources(),
      this.cleanupIntervalMs,
    )
    this.cleanupTimer.unref()
    logger.info('Resource cleanup timer started.')
  }

  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
      logger.info('Resource cleanup timer stopped.')
    }
  }

  private async cleanupInactiveResources(): Promise<void> {
    const now = Date.now()
    let cleanedCount = 0
    logger.debug('Running inactive resource cleanup check...')

    const keysToRemove: string[] = []
    for (const [key, info] of this.resources.entries()) {
      if (now - info.lastUsed > this.cleanupIntervalMs) {
        keysToRemove.push(key)
      }
    }

    if (keysToRemove.length === 0) {
      logger.debug('No inactive resources found to clean up.')
      return
    }

    logger.info(`Found ${keysToRemove.length} inactive resource(s) to clean up.`)

    for (const key of keysToRemove) {
      const info = this.resources.get(key)
      // Double-check inactivity before removing, in case it was accessed again
      if (info && now - info.lastUsed > this.cleanupIntervalMs) {
        logger.info(
          `Cleaning up inactive resource (Type: ${info.resourceType}, Instance ID: ${info.instanceId}, Key: ...${key.slice(-4)})`,
        )
        try {
          await info.cleanupFn(info.resource)
          this.resources.delete(key)
          cleanedCount++
          logger.info(
            `Successfully cleaned up resource (Instance ID: ${info.instanceId})`,
          )
        } catch (error) {
          logger.error(
            `Error during cleanup of resource (Instance ID: ${info.instanceId}): ${error instanceof Error ? error.message : String(error)}`,
            error,
          )
          // Optionally remove from map even if cleanup failed
          // this.resources.delete(key);
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Finished cleanup. Removed ${cleanedCount} inactive resource(s).`)
    } else {
      logger.debug('Finished cleanup check, no resources were removed this cycle.')
    }
  }

  /**
   * Immediately destroys all managed resources. Useful for graceful shutdown.
   */
  public async destroyAllNow(): Promise<void> {
    logger.warn('Destroying all managed resources immediately...')
    this.stopCleanupTimer()

    const cleanupPromises: Promise<void>[] = []
    for (const [key, info] of this.resources.entries()) {
      logger.info(
        `Initiating immediate cleanup for resource (Type: ${info.resourceType}, Instance ID: ${info.instanceId}, Key: ...${key.slice(-4)})`,
      )
      cleanupPromises.push(
        info
          .cleanupFn(info.resource)
          .catch((error) =>
            logger.error(
              `Error during immediate cleanup of resource (Instance ID: ${info.instanceId}): ${error instanceof Error ? error.message : String(error)}`,
              error,
            ),
          ),
      )
    }

    await Promise.allSettled(cleanupPromises)

    const finalCount = this.resources.size
    this.resources.clear()
    logger.warn(
      `Finished destroying all resources. Cleared ${finalCount} resource entries.`,
    )
  }
}

// Export a singleton instance
export const resourceManager = new ResourceManager()
