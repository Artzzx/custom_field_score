/**
 * Shared type definitions for the Calculated Score Field app.
 * These types are the contract between frontend and backend.
 */

export interface Condition {
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
  value: string;
  score: number;
}

export interface FieldRule {
  fieldKey: string;
  fieldName: string;
  conditions: Condition[];
  defaultScore: number;
}

export interface FormulaConfig {
  fieldId: string;
  fieldContextId: number;
  formula: string;
  trackedFields: FieldRule[];
  createdAt: string;
  updatedAt: string;
}

export interface ScoreBreakdown {
  totalScore: number;
  contributions: FieldContribution[];
}

export interface FieldContribution {
  fieldKey: string;
  fieldName: string;
  fieldValue: string;
  score: number;
}

export interface AvailableField {
  key: string;
  name: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Resolver request / response types
// ---------------------------------------------------------------------------

export interface GetCalculatedValueRequest {
  issueKey: string;
  fieldId: string;
  fieldContextId: number;
}

export interface SaveFormulaConfigRequest {
  fieldId: string;
  fieldContextId: number;
  formula: string;
  trackedFields: FieldRule[];
}

export interface GetFormulaConfigRequest {
  fieldId: string;
  fieldContextId: number;
}

export interface UpdateFieldValueRequest {
  issueKey: string;
  fieldId: string;
  value: number;
}

export interface SaveFormulaConfigResponse {
  success: boolean;
  error?: string;
}

export interface UpdateFieldValueResponse {
  success: boolean;
}

// ---------------------------------------------------------------------------
// Jira API response types
// ---------------------------------------------------------------------------

export interface JiraField {
  id: string;
  name: string;
  schema?: {
    type: string;
    custom?: string;
  };
}

export interface JiraIssueFields {
  [key: string]: unknown;
}

export interface JiraIssueResponse {
  key: string;
  fields: JiraIssueFields;
}
