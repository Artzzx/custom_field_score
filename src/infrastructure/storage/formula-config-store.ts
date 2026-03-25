import { storage } from '@forge/api';
import type { FormulaConfig } from '../../shared/types';

const ENTITY_NAME = 'formula-config';

/**
 * Builds a safe storage key from fieldId and fieldContextId.
 * - Sanitises fieldId: replaces non-alphanumeric chars with hyphens.
 * - If fieldContextId is falsy, uses only the sanitised fieldId.
 * - Otherwise appends the fieldContextId: `${sanitisedFieldId}-${fieldContextId}`.
 */
function buildKey(fieldId: string, fieldContextId: number): string {
  const sanitisedFieldId = (fieldId || 'unknown').replace(/[^a-zA-Z0-9]/g, '-');
  const contextId = Number(fieldContextId);
  if (!contextId) {
    return sanitisedFieldId;
  }
  return `${sanitisedFieldId}-${contextId}`;
}

/**
 * Retrieves a FormulaConfig from the Custom Entity Store.
 * Returns null if not found or on error.
 */
export async function getFormulaConfigFromStore(
  fieldId: string,
  fieldContextId: number,
): Promise<FormulaConfig | null> {
  try {
    const key = buildKey(fieldId, fieldContextId);
    console.log(`[FormulaConfigStore] Getting config for key: ${key}`);
    const result = await storage.entity(ENTITY_NAME).get(key);
    if (!result) {
      console.log(`[FormulaConfigStore] No config found for key: ${key}`);
      return null;
    }
    console.log(`[FormulaConfigStore] Found config for key: ${key}`);
    return result as FormulaConfig;
  } catch (err) {
    console.error('[FormulaConfigStore] Error getting config:', err instanceof Error ? err.message : String(err), err);
    return null;
  }
}

/**
 * Lists all stored FormulaConfigs from the Custom Entity Store via cursor-based pagination.
 * Returns an empty array on error.
 */
export async function listAllFormulaConfigs(): Promise<FormulaConfig[]> {
  try {
    console.log('[FormulaConfigStore] Listing all formula configs');
    const configs: FormulaConfig[] = [];
    let cursor: string | undefined;

    do {
      // Use the named index to scan all configs — supports cursor-based pagination
      const queryBuilder = storage.entity(ENTITY_NAME).query().index('by-fieldId');
      const result = cursor
        ? await queryBuilder.cursor(cursor).getMany()
        : await queryBuilder.getMany();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = ((result as any).results ?? []) as Array<{ key: string; value: unknown }>;
      for (const item of page) {
        if (item.value) {
          configs.push(item.value as FormulaConfig);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cursor = (result as any).nextCursor as string | undefined;
    } while (cursor);

    console.log(`[FormulaConfigStore] Found ${configs.length} formula config(s)`);
    return configs;
  } catch (err) {
    console.error('[FormulaConfigStore] Error listing configs:', err instanceof Error ? err.message : String(err), err);
    return [];
  }
}

/**
 * Returns all FormulaConfigs that match the given fieldId (client-side filter).
 * Useful when fieldContextId is unknown (0) — falls back to scanning all configs.
 * Returns an empty array on error.
 */
export async function getFormulaConfigsByFieldId(fieldId: string): Promise<FormulaConfig[]> {
  try {
    console.log(`[FormulaConfigStore] Querying configs by fieldId: ${fieldId}`);
    const all = await listAllFormulaConfigs();
    const configs = all.filter((c) => c.fieldId === fieldId);
    console.log(`[FormulaConfigStore] Found ${configs.length} config(s) for fieldId: ${fieldId}`);
    return configs;
  } catch (err) {
    console.error('[FormulaConfigStore] Error querying configs by fieldId:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Saves a FormulaConfig to the Custom Entity Store.
 * Throws on storage failure so the resolver can surface the real error message.
 */
export async function saveFormulaConfigToStore(config: FormulaConfig): Promise<void> {
  // Ensure fieldContextId is stored as a number (integer) to match the entity schema
  const safeConfig: FormulaConfig = {
    ...config,
    fieldContextId: Number(config.fieldContextId),
  };
  const key = buildKey(safeConfig.fieldId, safeConfig.fieldContextId);
  console.log(`[FormulaConfigStore] Saving config for key: ${key}`);
  try {
    await storage.entity(ENTITY_NAME).set(key, safeConfig);
    console.log(`[FormulaConfigStore] Config saved successfully for key: ${key}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[FormulaConfigStore] Error saving config for key ${key}:`, message, err);
    throw err; // re-throw so resolver can surface the real error
  }
}
