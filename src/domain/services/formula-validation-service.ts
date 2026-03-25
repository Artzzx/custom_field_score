import { parse as mathParse } from 'mathjs';
import type { SaveFormulaConfigRequest } from '../../shared/types';

const VALID_OPERATORS = new Set(['=', '!=', '>', '<', '>=', '<=']);

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a SaveFormulaConfigRequest before saving.
 *
 * Rules:
 * - At least one FieldRule must be present
 * - Each FieldRule must have a non-empty fieldKey and fieldName
 * - Each Condition must have a valid operator, non-empty value, and finite score
 * - defaultScore must be a finite number
 * - If a formula string is provided and non-empty, attempt to parse it with mathjs
 */
export function validateFormulaConfig(config: SaveFormulaConfigRequest): ValidationResult {
  if (!config.trackedFields || config.trackedFields.length === 0) {
    return { valid: false, error: 'At least one tracked field is required.' };
  }

  for (const rule of config.trackedFields) {
    if (!rule.fieldKey || rule.fieldKey.trim() === '') {
      return { valid: false, error: 'Each tracked field must have a valid field key.' };
    }

    if (!rule.fieldName || rule.fieldName.trim() === '') {
      return {
        valid: false,
        error: `Field "${rule.fieldKey}" must have a valid field name.`,
      };
    }

    if (!isFinite(rule.defaultScore)) {
      return {
        valid: false,
        error: `Default score for field "${rule.fieldKey}" must be a finite number.`,
      };
    }

    for (const condition of rule.conditions) {
      if (!VALID_OPERATORS.has(condition.operator)) {
        return {
          valid: false,
          error: `Invalid operator "${condition.operator}" in field "${rule.fieldKey}".`,
        };
      }

      if (!condition.value || condition.value.trim() === '') {
        return {
          valid: false,
          error: `Condition value must be non-empty in field "${rule.fieldKey}".`,
        };
      }

      if (!isFinite(condition.score)) {
        return {
          valid: false,
          error: `Condition score must be a finite number in field "${rule.fieldKey}".`,
        };
      }
    }
  }

  // Validate formula string if provided
  if (config.formula && config.formula.trim() !== '') {
    try {
      mathParse(config.formula);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, error: `Invalid formula expression: ${message}` };
    }
  }

  return { valid: true };
}
