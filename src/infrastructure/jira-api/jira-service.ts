import api, { route } from '@forge/api';
import type { JiraField, JiraIssueFields } from '../../shared/types';

/**
 * Extracts a human-readable string value from a raw Jira field value.
 * Handles the various shapes Jira field values can take:
 * - null/undefined → empty string
 * - string → as-is
 * - number → toString()
 * - object with `name` (priority, status, issuetype) → object.name
 * - object with `value` (custom select fields) → object.value
 * - array → first element's name/value or toString
 * - otherwise → JSON.stringify
 */
export function extractFieldValue(fieldValue: unknown): string {
  if (fieldValue === null || fieldValue === undefined) {
    return '';
  }

  if (typeof fieldValue === 'string') {
    return fieldValue;
  }

  if (typeof fieldValue === 'number' || typeof fieldValue === 'boolean') {
    return String(fieldValue);
  }

  if (Array.isArray(fieldValue)) {
    if (fieldValue.length === 0) return '';
    const first = fieldValue[0] as Record<string, unknown>;
    if (first && typeof first === 'object') {
      if (typeof first['name'] === 'string') return first['name'];
      if (typeof first['value'] === 'string') return first['value'];
    }
    return String(fieldValue[0]);
  }

  if (typeof fieldValue === 'object') {
    const obj = fieldValue as Record<string, unknown>;
    if (typeof obj['name'] === 'string') return obj['name'];
    if (typeof obj['value'] === 'string') return obj['value'];
    return JSON.stringify(fieldValue);
  }

  return JSON.stringify(fieldValue);
}

/**
 * Fetches the specified fields from a Jira issue.
 * Uses api.asApp() — suitable for both resolver calls and trigger handler.
 * Pass `useUserContext = true` to use api.asUser() for UI resolver calls.
 *
 * Returns an empty object on error.
 */
export async function getIssueFields(
  issueKey: string,
  fieldKeys: string[],
  useUserContext = false,
): Promise<JiraIssueFields> {
  try {
    const fieldsParam = fieldKeys.join(',');
    console.log(`[JiraService] Fetching fields [${fieldsParam}] for issue ${issueKey}`);

    // eslint-disable-next-line forge/require-allow-impersonation
    const requester = useUserContext ? api.asUser() : api.asApp();
    const response = await requester.requestJira(
      route`/rest/api/3/issue/${issueKey}?fields=${fieldsParam}`,
    );

    if (!response.ok) {
      console.error(
        `[JiraService] Failed to fetch issue ${issueKey}: HTTP ${response.status}`,
      );
      return {};
    }

    const data = (await response.json()) as { fields: JiraIssueFields };
    console.log(`[JiraService] Successfully fetched fields for issue ${issueKey}`);
    return data.fields || {};
  } catch (err) {
    console.error(`[JiraService] Error fetching issue fields for ${issueKey}:`, err);
    return {};
  }
}

/**
 * Updates a custom field value on a Jira issue.
 * Always uses api.asApp() — this is a background/automated operation.
 *
 * Returns true on success, false on failure.
 */
export async function updateIssueField(
  issueKey: string,
  fieldId: string,
  value: number,
): Promise<boolean> {
  try {
    console.log(
      `[JiraService] Updating field ${fieldId} on issue ${issueKey} with value ${value}`,
    );

    const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { [fieldId]: value },
      }),
    });

    if (!response.ok) {
      console.error(
        `[JiraService] Failed to update field ${fieldId} on issue ${issueKey}: HTTP ${response.status}`,
      );
      return false;
    }

    console.log(
      `[JiraService] Successfully updated field ${fieldId} on issue ${issueKey}`,
    );
    return true;
  } catch (err) {
    console.error(
      `[JiraService] Error updating field ${fieldId} on issue ${issueKey}:`,
      err,
    );
    return false;
  }
}

/**
 * Fetches all available Jira fields for the instance.
 * Uses api.asUser() — called from UI context (getAvailableFields resolver).
 *
 * Returns an empty array on error.
 */
export async function getAllJiraFields(): Promise<JiraField[]> {
  try {
    console.log('[JiraService] Fetching all available Jira fields');

    // eslint-disable-next-line forge/require-allow-impersonation
    const response = await api.asUser().requestJira(route`/rest/api/3/field`);

    if (!response.ok) {
      console.error(`[JiraService] Failed to fetch fields: HTTP ${response.status}`);
      return [];
    }

    const data = (await response.json()) as JiraField[];
    console.log(`[JiraService] Fetched ${data.length} Jira fields`);
    return data;
  } catch (err) {
    console.error('[JiraService] Error fetching Jira fields:', err);
    return [];
  }
}
