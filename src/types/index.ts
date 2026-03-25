// Re-export all Forge UI types for convenient importing
export * from './forge-ui-types';

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

export interface FieldContribution {
  fieldKey: string;
  fieldName: string;
  fieldValue: string;
  score: number;
}

export interface ScoreBreakdown {
  totalScore: number;
  contributions: FieldContribution[];
}

export interface AvailableField {
  key: string;
  name: string;
  type: string;
}
