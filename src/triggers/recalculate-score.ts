import { listAllFormulaConfigs } from '../infrastructure/storage/formula-config-store';
import { getIssueFields, updateIssueField, extractFieldValue } from '../infrastructure/jira-api/jira-service';
import { evaluateFormula } from '../domain/services/formula-evaluation-service';
import type { FormulaConfig } from '../shared/types';

/**
 * Shape of a changelog item from the avi:jira:updated:issue event.
 */
interface ChangelogItem {
  field?: string;
  fieldId?: string;
  fromString?: string;
  toString?: string;
}

/**
 * Trigger handler for avi:jira:updated:issue events.
 *
 * Logic:
 * 1. Extract issueKey and changed field IDs from the event payload
 * 2. Load ALL stored FormulaConfigs from storage
 * 3. For each config, check if any of its trackedFields[].fieldKey values appear in the changed field IDs
 * 4. For each matching config: fetch issue fields → evaluate formula → update the custom field value
 */
export async function recalculateScore(event: Record<string, unknown>): Promise<void> {
  try {
    console.log('[recalculateScore] Trigger fired. Event keys:', Object.keys(event));
    console.log('[recalculateScore] Full event (debug):', JSON.stringify(event, null, 2));

    // Step 1: Extract issueKey
    const issue = event['issue'] as Record<string, unknown> | undefined;
    const issueKey = typeof issue?.['key'] === 'string' ? issue['key'] : '';

    if (!issueKey) {
      console.warn('[recalculateScore] No issueKey found in event, skipping');
      return;
    }

    // Step 2: Extract changed field IDs from changelog
    const changelog = event['changelog'] as Record<string, unknown> | undefined;
    const changelogItems = (changelog?.['items'] as ChangelogItem[] | undefined) ?? [];
    const changedFieldIds = new Set<string>();
    for (const item of changelogItems) {
      if (item.fieldId) changedFieldIds.add(item.fieldId);
      if (item.field) changedFieldIds.add(item.field);
    }
    console.log('[recalculateScore] Changed field IDs:', [...changedFieldIds]);

    if (changedFieldIds.size === 0) {
      console.log('[recalculateScore] No changed fields in changelog, skipping');
      return;
    }

    // Step 3: Load ALL stored formula configs
    const allConfigs = await listAllFormulaConfigs();
    console.log(`[recalculateScore] Found ${allConfigs.length} formula config(s) in storage`);

    if (allConfigs.length === 0) {
      console.log('[recalculateScore] No formula configs stored, skipping');
      return;
    }

    // Step 4: Process each config that has a tracked field in the changed set
    for (const config of allConfigs) {
      await processConfig(config, issueKey, changedFieldIds);
    }
  } catch (err) {
    // Log with context but never rethrow — trigger errors must be swallowed
    const issueKey =
      typeof (event['issue'] as Record<string, unknown> | undefined)?.['key'] === 'string'
        ? (event['issue'] as Record<string, unknown>)['key']
        : 'unknown';

    console.error('[recalculateScore] Unexpected error:', {
      issueKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Processes a single FormulaConfig for a given issue update event.
 * Checks if any tracked field changed; if so, recalculates and writes the score.
 */
async function processConfig(
  config: FormulaConfig,
  issueKey: string,
  changedFieldIds: Set<string>,
): Promise<void> {
  try {
    const { fieldId, fieldContextId } = config;
    const trackedKeys = config.trackedFields.map((r) => r.fieldKey);

    // Check if any tracked field appears in the changed field IDs
    const anyTrackedFieldChanged = trackedKeys.some((key) => changedFieldIds.has(key));

    if (!anyTrackedFieldChanged) {
      console.log(
        `[recalculateScore] Config fieldId=${fieldId} contextId=${fieldContextId}: no tracked fields changed, skipping`,
        { trackedKeys, changedFieldIds: [...changedFieldIds] },
      );
      return;
    }

    console.log(
      `[recalculateScore] Config fieldId=${fieldId} contextId=${fieldContextId}: tracked field changed, recalculating`,
    );

    // Fetch current issue field values (app context — trigger)
    const rawFields = await getIssueFields(issueKey, trackedKeys, false);
    const fieldValues: Record<string, string> = {};
    for (const key of trackedKeys) {
      fieldValues[key] = extractFieldValue(rawFields[key]);
    }

    // Evaluate formula
    const breakdown = evaluateFormula(config, fieldValues);
    console.log(
      `[recalculateScore] Calculated score: ${breakdown.totalScore} for issue ${issueKey}, fieldId=${fieldId}`,
    );

    // Update the custom field value
    const updated = await updateIssueField(issueKey, fieldId, breakdown.totalScore);
    if (updated) {
      console.log(
        `[recalculateScore] Successfully updated ${fieldId}=${breakdown.totalScore} on issue ${issueKey}`,
      );
    } else {
      console.error(
        `[recalculateScore] Failed to update ${fieldId} on issue ${issueKey}`,
      );
    }
  } catch (err) {
    // Catch per-config errors so one bad config doesn't block others
    console.error(
      `[recalculateScore] Error processing config fieldId=${config.fieldId} contextId=${config.fieldContextId}:`,
      {
        issueKey,
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }
}
