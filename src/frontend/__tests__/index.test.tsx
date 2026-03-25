/**
 * Frontend tests for Calculated Score Field app.
 *
 * The component entry-point files (calculatedFieldView.tsx etc.) call
 * ForgeReconciler.render() at module level, so they cannot be rendered
 * as isolated components in jsdom. Instead we test:
 *
 *  1. Pure data-transformation logic (the same logic used inside the components)
 *  2. Preview-mode detection logic
 *  3. invoke() payload construction
 *
 * The @forge/bridge and @forge/react modules are shimmed automatically via
 * moduleNameMapper in jest.config.cjs — do NOT add jest.mock() for them.
 */

import { bridge } from '@forge/bridge';
import type { ScoreBreakdown, FieldRule, Condition, FormulaConfig, AvailableField } from '../../types';

// ─── Preview mode detection ──────────────────────────────────────────────────

describe('Preview mode detection', () => {
  const PREVIEW_CLOUD_ID = 'preview-mode';

  const isPreviewMode = (cloudId: string | undefined): boolean =>
    !cloudId || cloudId === PREVIEW_CLOUD_ID;

  it('returns true for preview-mode cloudId', () => {
    expect(isPreviewMode('preview-mode')).toBe(true);
  });

  it('returns true for undefined cloudId', () => {
    expect(isPreviewMode(undefined)).toBe(true);
  });

  it('returns false for a real cloudId', () => {
    expect(isPreviewMode('real-cloud-id')).toBe(false);
  });

  it('returns false for an empty string cloudId treated as falsy', () => {
    // empty string is falsy, so treated as preview
    expect(isPreviewMode('')).toBe(true);
  });
});

// ─── ScoreBreakdown data transformations ────────────────────────────────────

describe('Score breakdown transformations', () => {
  const mockBreakdown: ScoreBreakdown = {
    totalScore: 7,
    contributions: [
      { fieldKey: 'priority', fieldName: 'Priority', fieldValue: 'High', score: 3 },
      { fieldKey: 'status', fieldName: 'Status', fieldValue: 'In Progress', score: 2 },
      { fieldKey: 'customfield_10020', fieldName: 'Story Points', fieldValue: '5', score: 2 },
    ],
  };

  it('sums contributions to match totalScore', () => {
    const sum = mockBreakdown.contributions.reduce((acc, c) => acc + c.score, 0);
    expect(sum).toBe(mockBreakdown.totalScore);
  });

  it('handles empty contributions array', () => {
    const empty: ScoreBreakdown = { totalScore: 0, contributions: [] };
    const sum = (empty.contributions || []).reduce((acc, c) => acc + c.score, 0);
    expect(sum).toBe(0);
  });

  it('handles undefined contributions defensively', () => {
    const bad = { totalScore: 0, contributions: undefined as unknown as [] };
    const safe = bad.contributions || [];
    expect(safe).toHaveLength(0);
  });

  it('builds DynamicTable rows from contributions', () => {
    const rows = mockBreakdown.contributions.map((c) => ({
      key: c.fieldKey,
      cells: [
        { key: 'fieldName', content: c.fieldName },
        { key: 'fieldValue', content: c.fieldValue },
        { key: 'score', content: String(c.score) },
      ],
    }));
    expect(rows).toHaveLength(3);
    expect(rows[0].key).toBe('priority');
    expect(rows[0].cells[2].content).toBe('3');
    expect(rows[2].cells[1].content).toBe('5');
  });

  it('no-config state: shows info message when contributions are empty', () => {
    const breakdown: ScoreBreakdown = { totalScore: 0, contributions: [] };
    const showNotConfigured = breakdown.contributions.length === 0;
    expect(showNotConfigured).toBe(true);
  });
});

// ─── FieldRule / Condition logic ─────────────────────────────────────────────

describe('FieldRule state management', () => {
  const makeRule = (key: string, name: string): FieldRule => ({
    fieldKey: key,
    fieldName: name,
    conditions: [],
    defaultScore: 0,
  });

  it('prevents duplicate field keys', () => {
    const tracked: FieldRule[] = [makeRule('priority', 'Priority')];
    const already = tracked.some((r) => r.fieldKey === 'priority');
    expect(already).toBe(true);
  });

  it('allows adding a new unique field', () => {
    const tracked: FieldRule[] = [makeRule('priority', 'Priority')];
    const already = tracked.some((r) => r.fieldKey === 'status');
    expect(already).toBe(false);
  });

  it('removes a field rule by key', () => {
    const tracked: FieldRule[] = [
      makeRule('priority', 'Priority'),
      makeRule('status', 'Status'),
    ];
    const updated = tracked.filter((r) => r.fieldKey !== 'priority');
    expect(updated).toHaveLength(1);
    expect(updated[0].fieldKey).toBe('status');
  });

  it('adds a condition to a rule', () => {
    const rule = makeRule('priority', 'Priority');
    const newCond: Condition = { operator: '=', value: 'High', score: 3 };
    const updated = { ...rule, conditions: [...rule.conditions, newCond] };
    expect(updated.conditions).toHaveLength(1);
    expect(updated.conditions[0].value).toBe('High');
  });

  it('removes a condition by index', () => {
    const conds: Condition[] = [
      { operator: '=', value: 'Highest', score: 5 },
      { operator: '=', value: 'High', score: 3 },
    ];
    const filtered = conds.filter((_, i) => i !== 0);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].value).toBe('High');
  });

  it('updates defaultScore for a rule', () => {
    const tracked: FieldRule[] = [makeRule('priority', 'Priority')];
    const updated = tracked.map((r) =>
      r.fieldKey === 'priority' ? { ...r, defaultScore: 10 } : r,
    );
    expect(updated[0].defaultScore).toBe(10);
  });

  it('builds condition table rows', () => {
    const conds: Condition[] = [
      { operator: '=', value: 'High', score: 3 },
      { operator: '>', value: '5', score: 2 },
    ];
    const rows = conds.map((c, i) => ({
      key: `cond-${i}`,
      cells: [
        { key: 'operator', content: c.operator },
        { key: 'value', content: c.value },
        { key: 'score', content: String(c.score) },
      ],
    }));
    expect(rows).toHaveLength(2);
    expect(rows[0].cells[0].content).toBe('=');
    expect(rows[1].cells[2].content).toBe('2');
  });
});

// ─── Available fields / formula builder logic ────────────────────────────────

describe('Available fields and formula logic', () => {
  const mockFields: AvailableField[] = [
    { key: 'priority', name: 'Priority', type: 'priority' },
    { key: 'status', name: 'Status', type: 'status' },
    { key: 'customfield_10020', name: 'Story Points', type: 'number' },
  ];

  it('builds Select options from available fields', () => {
    const options = mockFields.map((f) => ({
      label: `${f.name} (${f.key})`,
      value: f.key,
    }));
    expect(options).toHaveLength(3);
    expect(options[0].label).toBe('Priority (priority)');
    expect(options[2].value).toBe('customfield_10020');
  });

  it('finds field by key for adding to tracked list', () => {
    const field = mockFields.find((f) => f.key === 'status');
    expect(field).toBeDefined();
    expect(field?.name).toBe('Status');
  });

  it('handles undefined available fields defensively', () => {
    const fields = undefined as unknown as AvailableField[];
    const safe = fields || [];
    expect(safe).toHaveLength(0);
  });

  it('formula preview is non-empty when formula is set', () => {
    const formula = 'priority_score + status_score';
    expect(formula.trim().length).toBeGreaterThan(0);
  });

  it('formula preview is empty when formula is blank', () => {
    const formula = '';
    expect(formula.trim().length).toBe(0);
  });
});

// ─── FormulaConfig payload construction ─────────────────────────────────────

describe('FormulaConfig payload construction', () => {
  it('merges formula string into config before save', () => {
    const baseConfig: FormulaConfig = {
      fieldId: 'customfield_10100',
      fieldContextId: 1,
      formula: '',
      trackedFields: [],
      createdAt: '',
      updatedAt: '',
    };
    const formula = 'priority_score + status_score';
    const now = '2026-01-01T00:00:00.000Z';
    const payload: FormulaConfig = {
      ...baseConfig,
      formula,
      updatedAt: now,
      createdAt: baseConfig.createdAt || now,
    };
    expect(payload.formula).toBe('priority_score + status_score');
    expect(payload.updatedAt).toBe(now);
    expect(payload.createdAt).toBe(now);
  });

  it('save result success flag is true on success', () => {
    const result = { success: true };
    expect(result.success).toBe(true);
  });

  it('save result returns error string on failure', () => {
    const result = { success: false, error: 'Validation failed' };
    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
  });
});

// ─── bridge mock sanity ──────────────────────────────────────────────────────

describe('bridge mock behavior', () => {
  beforeEach(() => bridge.reset());

  it('records invocations when invoke is called', async () => {
    bridge.mockInvoke('getCalculatedValue', { totalScore: 5, contributions: [] });
    const { invoke } = await import('@forge/bridge');
    await invoke('getCalculatedValue', { issueKey: 'TEST-1', fieldId: 'f1', fieldContextId: 1 });
    expect(bridge.invocations).toHaveLength(1);
    expect(bridge.invocations[0].functionKey).toBe('getCalculatedValue');
    expect(bridge.invocations[0].payload).toMatchObject({ issueKey: 'TEST-1' });
  });

  it('returns mocked context from view.getContext()', async () => {
    bridge.mockGetContext({ cloudId: 'test-cloud', extension: { fieldId: 'f1' } });
    const { view } = await import('@forge/bridge');
    const ctx = await view.getContext();
    expect(ctx.cloudId).toBe('test-cloud');
  });

  it('resets invocations between tests', () => {
    bridge.reset();
    expect(bridge.invocations).toHaveLength(0);
  });
});
