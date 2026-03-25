import type { Condition } from '../../shared/types';

/**
 * Evaluates a single Condition against a field value string.
 *
 * Comparison rules:
 * - `=`  : case-insensitive string equality (after trimming whitespace and stripping quotes)
 * - `!=` : case-insensitive inequality
 * - `>`, `<`, `>=`, `<=` : numeric comparison when both sides are parseable numbers;
 *   falls back to locale string comparison when not numeric.
 *
 * Both fieldValue and conditionValue are trimmed of whitespace before comparison.
 * conditionValue also has surrounding single or double quotes stripped.
 */
export function evaluateCondition(condition: Condition, fieldValue: string): boolean {
  const { operator, value: conditionValue } = condition;

  // Trim whitespace from both sides
  const trimmedFieldValue = fieldValue.trim();
  // Strip surrounding quotes from conditionValue (e.g. user typed "High" with quotes)
  const rawConditionValue = conditionValue.trim();
  const strippedConditionValue =
    rawConditionValue.startsWith('"') && rawConditionValue.endsWith('"') && rawConditionValue.length > 1
      ? rawConditionValue.slice(1, -1)
      : rawConditionValue.startsWith("'") && rawConditionValue.endsWith("'") && rawConditionValue.length > 1
        ? rawConditionValue.slice(1, -1)
        : rawConditionValue;

  switch (operator) {
    case '=':
      return trimmedFieldValue.toLowerCase() === strippedConditionValue.toLowerCase();

    case '!=':
      return trimmedFieldValue.toLowerCase() !== strippedConditionValue.toLowerCase();

    case '>':
    case '<':
    case '>=':
    case '<=': {
      const numField = parseFloat(trimmedFieldValue);
      const numCond = parseFloat(strippedConditionValue);

      if (!isNaN(numField) && !isNaN(numCond)) {
        // Numeric comparison
        if (operator === '>') return numField > numCond;
        if (operator === '<') return numField < numCond;
        if (operator === '>=') return numField >= numCond;
        return numField <= numCond;
      }

      // String comparison fallback
      const cmp = trimmedFieldValue.localeCompare(strippedConditionValue);
      if (operator === '>') return cmp > 0;
      if (operator === '<') return cmp < 0;
      if (operator === '>=') return cmp >= 0;
      return cmp <= 0;
    }

    default:
      return false;
  }
}
