import { validateFormulaConfig } from '../formula-validation-service';
import type { SaveFormulaConfigRequest } from '../../../shared/types';

const baseRequest = (): SaveFormulaConfigRequest => ({
  fieldId: 'customfield_10100',
  fieldContextId: 1,
  formula: '',
  trackedFields: [
    {
      fieldKey: 'priority',
      fieldName: 'Priority',
      conditions: [{ operator: '=', value: 'High', score: 3 }],
      defaultScore: 0,
    },
  ],
});

describe('validateFormulaConfig', () => {
  it('returns valid for a well-formed config', () => {
    const result = validateFormulaConfig(baseRequest());
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns invalid when trackedFields is empty', () => {
    const req = { ...baseRequest(), trackedFields: [] };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('At least one tracked field');
  });

  it('returns invalid when fieldKey is empty', () => {
    const req = {
      ...baseRequest(),
      trackedFields: [
        { fieldKey: '', fieldName: 'Priority', conditions: [], defaultScore: 0 },
      ],
    };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('field key');
  });

  it('returns invalid when fieldName is empty', () => {
    const req = {
      ...baseRequest(),
      trackedFields: [
        { fieldKey: 'priority', fieldName: '', conditions: [], defaultScore: 0 },
      ],
    };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('field name');
  });

  it('returns invalid when defaultScore is not finite', () => {
    const req = {
      ...baseRequest(),
      trackedFields: [
        { fieldKey: 'priority', fieldName: 'Priority', conditions: [], defaultScore: Infinity },
      ],
    };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Default score');
  });

  it('returns invalid when condition has invalid operator', () => {
    const req = {
      ...baseRequest(),
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          conditions: [{ operator: '~~' as any, value: 'High', score: 3 }],
          defaultScore: 0,
        },
      ],
    };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid operator');
  });

  it('returns invalid when condition value is empty', () => {
    const req = {
      ...baseRequest(),
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=' as const, value: '', score: 3 }],
          defaultScore: 0,
        },
      ],
    };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty');
  });

  it('returns invalid when condition score is not finite', () => {
    const req = {
      ...baseRequest(),
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=' as const, value: 'High', score: NaN }],
          defaultScore: 0,
        },
      ],
    };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Condition score');
  });

  it('returns valid when formula is a valid mathjs expression', () => {
    const req = { ...baseRequest(), formula: 'priority_score + status_score' };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(true);
  });

  it('returns invalid when formula string is invalid mathjs', () => {
    const req = { ...baseRequest(), formula: '!!invalid formula syntax @#$' };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid formula');
  });

  it('returns valid when formula is empty string (optional field)', () => {
    const req = { ...baseRequest(), formula: '' };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(true);
  });

  it('returns valid with multiple tracked fields and conditions', () => {
    const req: SaveFormulaConfigRequest = {
      fieldId: 'customfield_10100',
      fieldContextId: 1,
      formula: 'priority_score + status_score',
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [
            { operator: '=', value: 'Highest', score: 5 },
            { operator: '=', value: 'High', score: 3 },
          ],
          defaultScore: 0,
        },
        {
          fieldKey: 'status',
          fieldName: 'Status',
          conditions: [{ operator: '=', value: 'In Progress', score: 2 }],
          defaultScore: 0,
        },
      ],
    };
    const result = validateFormulaConfig(req);
    expect(result.valid).toBe(true);
  });
});
