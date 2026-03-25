import Resolver from '@forge/resolver';
import { getFormulaConfigFromStore, saveFormulaConfigToStore, getFormulaConfigsByFieldId } from '../../infrastructure/storage/formula-config-store';
import { getIssueFields, getAllJiraFields, updateIssueField, extractFieldValue } from '../../infrastructure/jira-api/jira-service';
import { evaluateFormula } from '../../domain/services/formula-evaluation-service';
import { validateFormulaConfig } from '../../domain/services/formula-validation-service';
import type {
  GetCalculatedValueRequest,
  GetFormulaConfigRequest,
  SaveFormulaConfigRequest,
  UpdateFieldValueRequest,
  ScoreBreakdown,
  FormulaConfig,
  AvailableField,
  SaveFormulaConfigResponse,
  UpdateFieldValueResponse,
} from '../../shared/types';

// ---------------------------------------------------------------------------
// Resolver request wrapper type
// ---------------------------------------------------------------------------
interface ResolverRequest<T> {
  payload: T;
  context?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Resolver definitions
// ---------------------------------------------------------------------------
const resolver = new Resolver();

// ---------------------------------------------------------------------------
// logError — captures frontend errors sent via errorLogger utility
// ---------------------------------------------------------------------------
resolver.define(
  'logError',
  (
    req: ResolverRequest<{
      message: string;
      stack?: string;
      source?: string;
      lineno?: number;
      colno?: number;
      timestamp: string;
      userAgent?: string;
      url?: string;
    }>,
  ) => {
    const err = req.payload;
    console.error('[Frontend Error]', {
      message: err.message,
      stack: err.stack,
      source: err.source,
      line: err.lineno,
      column: err.colno,
      timestamp: err.timestamp,
      userAgent: err.userAgent,
      url: err.url,
    });
    return { success: true };
  },
);

// ---------------------------------------------------------------------------
// getCalculatedValue
// Fetches issue fields, evaluates the formula, and returns the score breakdown.
// ---------------------------------------------------------------------------
resolver.define(
  'getCalculatedValue',
  async (req: ResolverRequest<GetCalculatedValueRequest>): Promise<ScoreBreakdown> => {
    const { issueKey, fieldId, fieldContextId } = req.payload;
    console.log('[Resolver] getCalculatedValue:', { issueKey, fieldId, fieldContextId });

    try {
      // Step 1: Try exact key lookup
      let config = await getFormulaConfigFromStore(fieldId, fieldContextId);

      // Step 2: If not found and fieldContextId is 0/unknown, fall back to fieldId scan
      if (!config && !fieldContextId) {
        console.log(
          `[Resolver] getCalculatedValue: exact lookup missed (fieldContextId=${fieldContextId}), falling back to fieldId scan for fieldId=${fieldId}`,
        );
        const configs = await getFormulaConfigsByFieldId(fieldId);
        if (configs.length > 0) {
          config = configs[0];
          console.log(
            `[Resolver] getCalculatedValue: fallback found config with fieldContextId=${config.fieldContextId}`,
          );
        } else {
          console.log(
            `[Resolver] getCalculatedValue: fallback found no configs for fieldId=${fieldId}`,
          );
        }
      }

      if (!config) {
        console.log('[Resolver] getCalculatedValue: no config found, returning empty breakdown');
        return { totalScore: 0, contributions: [] };
      }

      // Fetch only the tracked field keys from the issue
      const trackedKeys = config.trackedFields.map((r) => r.fieldKey);
      const rawFields = await getIssueFields(issueKey, trackedKeys, true);

      // Convert raw field values to strings
      const fieldValues: Record<string, string> = {};
      for (const key of trackedKeys) {
        fieldValues[key] = extractFieldValue(rawFields[key]);
      }

      // Evaluate formula
      const breakdown = evaluateFormula(config, fieldValues);
      console.log('[Resolver] getCalculatedValue result:', breakdown);
      return breakdown;
    } catch (err) {
      console.error('[Resolver] getCalculatedValue error:', err);
      return { totalScore: 0, contributions: [] };
    }
  },
);

// ---------------------------------------------------------------------------
// getFormulaConfig
// Retrieves the stored formula configuration for a field context.
// ---------------------------------------------------------------------------
resolver.define(
  'getFormulaConfig',
  async (req: ResolverRequest<GetFormulaConfigRequest>): Promise<FormulaConfig | null> => {
    const { fieldId, fieldContextId } = req.payload;
    console.log('[Resolver] getFormulaConfig:', { fieldId, fieldContextId });

    try {
      const config = await getFormulaConfigFromStore(fieldId, fieldContextId);
      return config;
    } catch (err) {
      console.error('[Resolver] getFormulaConfig error:', err);
      return null;
    }
  },
);

// ---------------------------------------------------------------------------
// saveFormulaConfig
// Validates and persists the formula configuration.
// ---------------------------------------------------------------------------
resolver.define(
  'saveFormulaConfig',
  async (req: ResolverRequest<SaveFormulaConfigRequest>): Promise<SaveFormulaConfigResponse> => {
    const request = req.payload;
    console.log('[Resolver] saveFormulaConfig:', {
      fieldId: request.fieldId,
      fieldContextId: request.fieldContextId,
      trackedFieldsCount: request.trackedFields?.length,
    });

    try {
      // Validate
      const validation = validateFormulaConfig(request);
      if (!validation.valid) {
        console.warn('[Resolver] saveFormulaConfig validation failed:', validation.error);
        return { success: false, error: validation.error };
      }

      // Load existing config to preserve createdAt
      const existing = await getFormulaConfigFromStore(request.fieldId, request.fieldContextId);
      const now = new Date().toISOString();

      const config: FormulaConfig = {
        fieldId: request.fieldId,
        fieldContextId: Number(request.fieldContextId), // coerce to number defensively
        formula: request.formula,
        trackedFields: request.trackedFields,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await saveFormulaConfigToStore(config);
      console.log('[Resolver] saveFormulaConfig: saved successfully');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Resolver] saveFormulaConfig error:', message, err);
      return { success: false, error: `Storage error: ${message}` };
    }
  },
);

// ---------------------------------------------------------------------------
// getAvailableFields
// Fetches all available Jira fields for the formula builder.
// ---------------------------------------------------------------------------
resolver.define(
  'getAvailableFields',
  async (_req: ResolverRequest<Record<string, never>>): Promise<AvailableField[]> => {
    console.log('[Resolver] getAvailableFields');

    try {
      const jiraFields = await getAllJiraFields();
      const fields: AvailableField[] = jiraFields.map((f) => ({
        key: f.id,
        name: f.name,
        type: f.schema?.type ?? 'unknown',
      }));
      console.log(`[Resolver] getAvailableFields: returned ${fields.length} fields`);
      return fields;
    } catch (err) {
      console.error('[Resolver] getAvailableFields error:', err);
      return [];
    }
  },
);

// ---------------------------------------------------------------------------
// updateFieldValue
// Updates the calculated custom field value on a Jira issue.
// ---------------------------------------------------------------------------
resolver.define(
  'updateFieldValue',
  async (req: ResolverRequest<UpdateFieldValueRequest>): Promise<UpdateFieldValueResponse> => {
    const { issueKey, fieldId, value } = req.payload;
    console.log('[Resolver] updateFieldValue:', { issueKey, fieldId, value });

    try {
      const success = await updateIssueField(issueKey, fieldId, value);
      return { success };
    } catch (err) {
      console.error('[Resolver] updateFieldValue error:', err);
      return { success: false };
    }
  },
);

export const handler = resolver.getDefinitions();
