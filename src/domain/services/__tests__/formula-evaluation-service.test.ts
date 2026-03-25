import { evaluateFormula } from '../formula-evaluation-service';
import type { FormulaConfig } from '../../../shared/types';

const makeConfig = (overrides: Partial<FormulaConfig> = {}): FormulaConfig => ({
  fieldId: 'customfield_10100',
  fieldContextId: 1,
  formula: '',
  trackedFields: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('evaluateFormula', () => {
  it('returns empty breakdown when no tracked fields', () => {
    const config = makeConfig({ trackedFields: [] });
    const result = evaluateFormula(config, {});
    expect(result.totalScore).toBe(0);
    expect(result.contributions).toHaveLength(0);
  });

  it('uses defaultScore when no conditions match', () => {
    const config = makeConfig({
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=', value: 'High', score: 3 }],
          defaultScore: 0,
        },
      ],
    });
    const result = evaluateFormula(config, { priority: 'Low' });
    expect(result.totalScore).toBe(0);
    expect(result.contributions[0].score).toBe(0);
  });

  it('uses first matching condition score', () => {
    const config = makeConfig({
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [
            { operator: '=', value: 'Highest', score: 5 },
            { operator: '=', value: 'High', score: 3 },
            { operator: '=', value: 'Medium', score: 2 },
          ],
          defaultScore: 0,
        },
      ],
    });
    const result = evaluateFormula(config, { priority: 'High' });
    expect(result.totalScore).toBe(3);
    expect(result.contributions[0].score).toBe(3);
    expect(result.contributions[0].fieldValue).toBe('High');
  });

  it('sums scores across multiple tracked fields', () => {
    const config = makeConfig({
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=', value: 'High', score: 3 }],
          defaultScore: 0,
        },
        {
          fieldKey: 'status',
          fieldName: 'Status',
          conditions: [{ operator: '=', value: 'In Progress', score: 2 }],
          defaultScore: 0,
        },
      ],
    });
    const result = evaluateFormula(config, { priority: 'High', status: 'In Progress' });
    expect(result.totalScore).toBe(5);
    expect(result.contributions).toHaveLength(2);
  });

  it('treats missing field values as empty string (uses defaultScore)', () => {
    const config = makeConfig({
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=', value: 'High', score: 3 }],
          defaultScore: 1,
        },
      ],
    });
    // No fieldValues provided — field missing → defaultScore
    const result = evaluateFormula(config, {});
    expect(result.contributions[0].fieldValue).toBe('');
    expect(result.contributions[0].score).toBe(1);
  });

  it('evaluates arithmetic formula string with mathjs', () => {
    const config = makeConfig({
      formula: 'priority_score + status_score',
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=', value: 'High', score: 3 }],
          defaultScore: 0,
        },
        {
          fieldKey: 'status',
          fieldName: 'Status',
          conditions: [{ operator: '=', value: 'In Progress', score: 2 }],
          defaultScore: 0,
        },
      ],
    });
    const result = evaluateFormula(config, { priority: 'High', status: 'In Progress' });
    expect(result.totalScore).toBe(5);
  });

  it('uses weighted formula with multiplication', () => {
    const config = makeConfig({
      formula: 'priority_score * 2',
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=', value: 'High', score: 3 }],
          defaultScore: 0,
        },
      ],
    });
    const result = evaluateFormula(config, { priority: 'High' });
    expect(result.totalScore).toBe(6);
  });

  it('falls back to sum when formula string is invalid', () => {
    const config = makeConfig({
      formula: 'priority_score + !!!invalid',
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=', value: 'High', score: 3 }],
          defaultScore: 0,
        },
      ],
    });
    const result = evaluateFormula(config, { priority: 'High' });
    // Falls back to simple sum = 3
    expect(result.totalScore).toBe(3);
  });

  it('handles custom field key with special chars (sanitised for mathjs)', () => {
    const config = makeConfig({
      formula: 'customfield_10020_score + 0',
      trackedFields: [
        {
          fieldKey: 'customfield_10020',
          fieldName: 'Story Points',
          conditions: [{ operator: '=', value: '5', score: 2 }],
          defaultScore: 0,
        },
      ],
    });
    const result = evaluateFormula(config, { customfield_10020: '5' });
    expect(result.totalScore).toBe(2);
  });

  it('produces correct contribution shape', () => {
    const config = makeConfig({
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=', value: 'High', score: 3 }],
          defaultScore: 0,
        },
      ],
    });
    const result = evaluateFormula(config, { priority: 'High' });
    expect(result.contributions[0]).toMatchObject({
      fieldKey: 'priority',
      fieldName: 'Priority',
      fieldValue: 'High',
      score: 3,
    });
  });
});
