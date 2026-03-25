import { evaluate as mathEvaluate } from 'mathjs';
import { evaluateCondition } from '../value-objects/condition';
import type { FormulaConfig, ScoreBreakdown, FieldContribution, FieldRule } from '../../shared/types';

/**
 * Sanitises a field key to a safe variable name for mathjs evaluation.
 * Replaces any non-alphanumeric characters with underscores.
 */
function sanitiseFieldKey(fieldKey: string): string {
  return fieldKey.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Evaluates a single FieldRule against a field value.
 * Returns the score of the first matching condition, or defaultScore if none match.
 */
function evaluateFieldRule(rule: FieldRule, fieldValue: string): number {
  for (const condition of rule.conditions) {
    if (evaluateCondition(condition, fieldValue)) {
      return condition.score;
    }
  }
  return rule.defaultScore;
}

/**
 * Checks whether a formula string references arithmetic with field score variables.
 */
function isArithmeticFormula(formula: string): boolean {
  return /[+\-*/]/.test(formula);
}

/**
 * Evaluates a FormulaConfig against a map of field values to produce a ScoreBreakdown.
 *
 * Algorithm:
 * 1. For each FieldRule, evaluate conditions in order and find the first match.
 * 2. If no condition matches, use defaultScore.
 * 3. Collect per-field contributions.
 * 4. If the formula string contains arithmetic operators, evaluate it with mathjs
 *    using field scores as variables (key sanitised to alphanumeric + underscores).
 * 5. Fall back to simple sum if mathjs evaluation fails.
 */
export function evaluateFormula(
  config: FormulaConfig,
  fieldValues: Record<string, string>,
): ScoreBreakdown {
  const contributions: FieldContribution[] = [];
  const scoreScope: Record<string, number> = {};

  for (const rule of config.trackedFields) {
    // Treat missing field values as empty string
    const fieldValue = fieldValues[rule.fieldKey] ?? '';
    const score = evaluateFieldRule(rule, fieldValue);

    contributions.push({
      fieldKey: rule.fieldKey,
      fieldName: rule.fieldName,
      fieldValue,
      score,
    });

    const varName = `${sanitiseFieldKey(rule.fieldKey)}_score`;
    scoreScope[varName] = score;
  }

  // Simple sum as baseline
  const simpleSum = contributions.reduce((acc, c) => acc + c.score, 0);

  let totalScore = simpleSum;

  // If formula string contains arithmetic, attempt mathjs evaluation
  if (config.formula && isArithmeticFormula(config.formula)) {
    try {
      const result = mathEvaluate(config.formula, scoreScope);
      if (typeof result === 'number' && isFinite(result)) {
        totalScore = result;
      } else {
        console.warn('[FormulaEvaluation] mathjs returned non-finite result, falling back to sum');
      }
    } catch (err) {
      console.warn('[FormulaEvaluation] mathjs evaluation failed, falling back to sum:', err);
    }
  }

  return { totalScore, contributions };
}
