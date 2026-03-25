import { createTestHarness } from '@forge/testing-framework';
import { handler } from '../resolvers';

/**
 * Integration tests: end-to-end flows through the resolver stack.
 */
const harness = createTestHarness({
  manifest: './manifest.yml',
  handlers: { main: handler },
});

beforeEach(() => harness.reset());

describe('Full save → retrieve → calculate flow', () => {
  it('saves config, retrieves it, then calculates score', async () => {
    const fieldId = 'customfield_10100';
    const fieldContextId = 1;

    // 1. Save config
    const saveResult = await harness.invoke('saveFormulaConfig', {
      payload: {
        fieldId,
        fieldContextId,
        formula: 'priority_score + status_score',
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
          {
            fieldKey: 'status',
            fieldName: 'Status',
            conditions: [{ operator: '=', value: 'In Progress', score: 2 }],
            defaultScore: 0,
          },
        ],
      },
    });
    expect(saveResult.data.success).toBe(true);

    // 2. Retrieve config
    const getResult = await harness.invoke('getFormulaConfig', {
      payload: { fieldId, fieldContextId },
    });
    expect(getResult.data).not.toBeNull();
    expect(getResult.data.trackedFields).toHaveLength(2);

    // 3. Mock Jira issue fields
    harness.addFixture('GET', '/rest/api/3/issue/TEST-100?fields=priority,status', {
      status: 200,
      body: {
        key: 'TEST-100',
        fields: {
          priority: { name: 'High', id: '2' },
          status: { name: 'In Progress', id: '3' },
        },
      },
    });

    // 4. Calculate score
    const calcResult = await harness.invoke('getCalculatedValue', {
      payload: { issueKey: 'TEST-100', fieldId, fieldContextId },
    });
    expect(calcResult.data.totalScore).toBe(5); // 3 + 2
    expect(calcResult.data.contributions).toHaveLength(2);
  });

  it('returns 0 score on first use (cold start)', async () => {
    const result = await harness.invoke('getCalculatedValue', {
      payload: { issueKey: 'TEST-1', fieldId: 'customfield_10200', fieldContextId: 99 },
    });
    expect(result.data.totalScore).toBe(0);
    expect(result.data.contributions).toHaveLength(0);
  });

  it('save → update preserves timestamps correctly', async () => {
    const payload = {
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
    };

    // First save
    await harness.invoke('saveFormulaConfig', { payload });
    const first = await harness.invoke('getFormulaConfig', {
      payload: { fieldId: 'customfield_10100', fieldContextId: 1 },
    });
    const firstCreatedAt = first.data.createdAt;

    // Second save (update)
    await harness.invoke('saveFormulaConfig', { payload: { ...payload, formula: 'priority_score' } });
    const second = await harness.invoke('getFormulaConfig', {
      payload: { fieldId: 'customfield_10100', fieldContextId: 1 },
    });

    // createdAt should be preserved; updatedAt should be refreshed
    expect(second.data.createdAt).toBe(firstCreatedAt);
    expect(second.data.formula).toBe('priority_score');
  });
});

describe('getAvailableFields integration', () => {
  it('returns fields with correct shape', async () => {
    harness.addFixture('GET', '/rest/api/3/field', {
      status: 200,
      body: [
        { id: 'priority', name: 'Priority', schema: { type: 'priority' } },
        { id: 'assignee', name: 'Assignee', schema: { type: 'user' } },
      ],
    });

    const result = await harness.invoke('getAvailableFields', { payload: {} });
    expect(result.data).toHaveLength(2);
    result.data.forEach((f: { key: string; name: string; type: string }) => {
      expect(f.key).toBeDefined();
      expect(f.name).toBeDefined();
      expect(f.type).toBeDefined();
    });
  });
});
