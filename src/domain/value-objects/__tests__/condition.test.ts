import { evaluateCondition } from '../condition';
import type { Condition } from '../../../shared/types';

describe('evaluateCondition', () => {
  // Equality
  describe('= operator', () => {
    it('returns true for exact case-insensitive match', () => {
      const cond: Condition = { operator: '=', value: 'High', score: 3 };
      expect(evaluateCondition(cond, 'High')).toBe(true);
      expect(evaluateCondition(cond, 'high')).toBe(true);
      expect(evaluateCondition(cond, 'HIGH')).toBe(true);
    });

    it('returns false when value does not match', () => {
      const cond: Condition = { operator: '=', value: 'High', score: 3 };
      expect(evaluateCondition(cond, 'Low')).toBe(false);
      expect(evaluateCondition(cond, '')).toBe(false);
    });
  });

  // Inequality
  describe('!= operator', () => {
    it('returns true when value does not match (case-insensitive)', () => {
      const cond: Condition = { operator: '!=', value: 'Low', score: 1 };
      expect(evaluateCondition(cond, 'High')).toBe(true);
      expect(evaluateCondition(cond, 'low')).toBe(false);
    });

    it('returns false when value matches case-insensitively', () => {
      const cond: Condition = { operator: '!=', value: 'Medium', score: 2 };
      expect(evaluateCondition(cond, 'MEDIUM')).toBe(false);
    });
  });

  // Numeric greater-than
  describe('> operator', () => {
    it('compares numerically when both are numbers', () => {
      const cond: Condition = { operator: '>', value: '5', score: 2 };
      expect(evaluateCondition(cond, '10')).toBe(true);
      expect(evaluateCondition(cond, '5')).toBe(false);
      expect(evaluateCondition(cond, '3')).toBe(false);
    });

    it('falls back to string comparison for non-numeric values', () => {
      const cond: Condition = { operator: '>', value: 'b', score: 1 };
      expect(evaluateCondition(cond, 'c')).toBe(true);
      expect(evaluateCondition(cond, 'a')).toBe(false);
    });
  });

  // Numeric less-than
  describe('< operator', () => {
    it('compares numerically when both are numbers', () => {
      const cond: Condition = { operator: '<', value: '10', score: 1 };
      expect(evaluateCondition(cond, '5')).toBe(true);
      expect(evaluateCondition(cond, '10')).toBe(false);
      expect(evaluateCondition(cond, '15')).toBe(false);
    });
  });

  // Greater-than-or-equal
  describe('>= operator', () => {
    it('returns true for equal and greater values', () => {
      const cond: Condition = { operator: '>=', value: '5', score: 2 };
      expect(evaluateCondition(cond, '5')).toBe(true);
      expect(evaluateCondition(cond, '6')).toBe(true);
      expect(evaluateCondition(cond, '4')).toBe(false);
    });
  });

  // Less-than-or-equal
  describe('<= operator', () => {
    it('returns true for equal and lesser values', () => {
      const cond: Condition = { operator: '<=', value: '5', score: 2 };
      expect(evaluateCondition(cond, '5')).toBe(true);
      expect(evaluateCondition(cond, '4')).toBe(true);
      expect(evaluateCondition(cond, '6')).toBe(false);
    });
  });

  // Unknown operator
  it('returns false for unknown operator', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond = { operator: '~~' as any, value: 'x', score: 1 };
    expect(evaluateCondition(cond, 'x')).toBe(false);
  });

  // Edge cases
  it('returns false when fieldValue is empty for numeric comparison', () => {
    const cond: Condition = { operator: '>', value: '5', score: 1 };
    expect(evaluateCondition(cond, '')).toBe(false);
  });

  // Bug 3: Trimming and quote stripping
  describe('trimming and quote stripping', () => {
    it('trims whitespace from fieldValue before = comparison', () => {
      const cond: Condition = { operator: '=', value: 'High', score: 3 };
      expect(evaluateCondition(cond, '  High  ')).toBe(true);
    });

    it('trims whitespace from conditionValue before = comparison', () => {
      const cond: Condition = { operator: '=', value: '  High  ', score: 3 };
      expect(evaluateCondition(cond, 'High')).toBe(true);
    });

    it('strips double quotes from conditionValue', () => {
      const cond: Condition = { operator: '=', value: '"High"', score: 3 };
      expect(evaluateCondition(cond, 'High')).toBe(true);
    });

    it('strips single quotes from conditionValue', () => {
      const cond: Condition = { operator: '=', value: "'High'", score: 3 };
      expect(evaluateCondition(cond, 'High')).toBe(true);
    });

    it('does not strip mismatched quotes', () => {
      const cond: Condition = { operator: '=', value: '"High\'', score: 3 };
      // mismatched — no stripping — should NOT match bare 'High'
      expect(evaluateCondition(cond, 'High')).toBe(false);
    });

    it('strips quotes before numeric comparison', () => {
      const cond: Condition = { operator: '>', value: '"5"', score: 1 };
      expect(evaluateCondition(cond, '10')).toBe(true);
    });

    it('trims fieldValue before numeric comparison', () => {
      const cond: Condition = { operator: '<=', value: '10', score: 1 };
      expect(evaluateCondition(cond, '  5  ')).toBe(true);
    });

    it('strips quotes from != conditionValue', () => {
      const cond: Condition = { operator: '!=', value: '"Low"', score: 1 };
      expect(evaluateCondition(cond, 'High')).toBe(true);
      expect(evaluateCondition(cond, 'Low')).toBe(false);
    });
  });
});
