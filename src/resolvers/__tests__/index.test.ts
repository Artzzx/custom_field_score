import { createTestHarness } from '@forge/testing-framework';
import { handler } from '../index';

/**
 * Resolver integration tests using the Forge testing harness.
 * These tests exercise the full resolver stack with shimmed @forge/api.
 */
const harness = createTestHarness({
  manifest: './manifest.yml',
  handlers: { main: handler },
});

beforeEach(() => harness.reset());

// ---------------------------------------------------------------------------
// getFormulaConfig
// ---------------------------------------------------------------------------
describe('getFormulaConfig', () => {
  it('returns null when no config is stored (cold start)', async () => {
    const result = await harness.invoke('getFormulaConfig', {
      payload: { fieldId: 'customfield_10100', fieldContextId: 1 },
    });
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveFormulaConfig
// ---------------------------------------------------------------------------
describe('saveFormulaConfig', () => {
  it('returns success: false when trackedFields is empty', async () => {
    const result = await harness.invoke('saveFormulaConfig', {
      payload: {
        fieldId: 'customfield_10100',
        fieldContextId: 1,
        formula: '',
        trackedFields: [],
      },
    });
    expect(result.data.success).toBe(false);
    expect(result.data.error).toBeDefined();
  });

  it('saves a valid config and returns success: true', async () => {
    const result = await harness.invoke('saveFormulaConfig', {
      payload: {
        fieldId: 'customfield_10100',
        fieldContextId: 1,
        formula: 'priority_score',
        trackedFields: [
          {
            fieldKey: 'priority',
            fieldName: 'Priority',
            conditions: [{ operator: '=', value: 'High', score: 3 }],
            defaultScore: 0,
          },
        ],
      },
    });
    expect(result.data.success).toBe(true);
    expect(result.data.error).toBeUndefined();
  });

  it('persists config so getFormulaConfig can retrieve it', async () => {
    const payload = {
      fieldId: 'customfield_10100',
      fieldContextId: 1,
      formula: 'priority_score',
      trackedFields: [
        {
          fieldKey: 'priority',
          fieldName: 'Priority',
          conditions: [{ operator: '=', value: 'High', score: 3 }],
          defaultScore: 0,
        },
      ],
    };

    await harness.invoke('saveFormulaConfig', { payload });

    const getResult = await harness.invoke('getFormulaConfig', {
      payload: { fieldId: 'customfield_10100', fieldContextId: 1 },
    });

    expect(getResult.data).not.toBeNull();
    expect(getResult.data.fieldId).toBe('customfield_10100');
    expect(getResult.data.trackedFields).toHaveLength(1);
    expect(getResult.data.trackedFields[0].fieldKey).toBe('priority');
    expect(getResult.data.createdAt).toBeDefined();
    expect(getResult.data.updatedAt).toBeDefined();
  });

  it('returns invalid formula error for bad mathjs expression', async () => {
    const result = await harness.invoke('saveFormulaConfig', {
      payload: {
        fieldId: 'customfield_10100',
        fieldContextId: 1,
        formula: '!!!bad formula',
        trackedFields: [
          {
            fieldKey: 'priority',
            fieldName: 'Priority',
            conditions: [{ operator: '=', value: 'High', score: 3 }],
            defaultScore: 0,
          },
        ],
      },
    });
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('Invalid formula');
  });
});

// ---------------------------------------------------------------------------
// getCalculatedValue
// ---------------------------------------------------------------------------
describe('getCalculatedValue', () => {
  it('returns zero breakdown when no config exists', async () => {
    const result = await harness.invoke('getCalculatedValue', {
      payload: {
        issueKey: 'TEST-1',
        fieldId: 'customfield_10100',
        fieldContextId: 1,
      },
    });
    expect(result.data.totalScore).toBe(0);
    expect(result.data.contributions).toHaveLength(0);
  });

  it('calculates score from stored config and mocked Jira API', async () => {
    // First save a config
    await harness.invoke('saveFormulaConfig', {
      payload: {
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
      },
    });

    // Mock Jira issue API response
    harness.addFixture('GET', '/rest/api/3/issue/TEST-1?fields=priority', {
      status: 200,
      body: {
        key: 'TEST-1',
        fields: {
          priority: { name: 'High', id: '2' },
        },
      },
    });

    const result = await harness.invoke('getCalculatedValue', {
      payload: {
        issueKey: 'TEST-1',
        fieldId: 'customfield_10100',
        fieldContextId: 1,
      },
    });

    expect(result.data.totalScore).toBe(3);
    expect(result.data.contributions).toHaveLength(1);
    expect(result.data.contributions[0].score).toBe(3);
    expect(result.data.contributions[0].fieldValue).toBe('High');
  });

  it('returns zero score when Jira API fails', async () => {
    await harness.invoke('saveFormulaConfig', {
      payload: {
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
      },
    });

    harness.addFixture('GET', '/rest/api/3/issue/TEST-1?fields=priority', {
      status: 500,
      body: { errorMessages: ['Internal server error'] },
    });

    const result = await harness.invoke('getCalculatedValue', {
      payload: {
        issueKey: 'TEST-1',
        fieldId: 'customfield_10100',
        fieldContextId: 1,
      },
    });

    // Should still return a valid breakdown with default scores
    expect(result.data.totalScore).toBeDefined();
    expect(Array.isArray(result.data.contributions)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getAvailableFields
// ---------------------------------------------------------------------------
describe('getAvailableFields', () => {
  it('returns mapped fields from Jira API', async () => {
    harness.addFixture('GET', '/rest/api/3/field', {
      status: 200,
      body: [
        { id: 'priority', name: 'Priority', schema: { type: 'priority' } },
        { id: 'status', name: 'Status', schema: { type: 'status' } },
        { id: 'customfield_10020', name: 'Story Points', schema: { type: 'number', custom: 'com.pyxis.greenhopper.jira:jsw-story-points' } },
      ],
    });

    const result = await harness.invoke('getAvailableFields', { payload: {} });

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data[0]).toMatchObject({ key: 'priority', name: 'Priority', type: 'priority' });
    expect(result.data[2]).toMatchObject({ key: 'customfield_10020', name: 'Story Points', type: 'number' });
  });

  it('returns empty array when Jira API fails', async () => {
    harness.addFixture('GET', '/rest/api/3/field', {
      status: 500,
      body: { errorMessages: ['Server error'] },
    });

    const result = await harness.invoke('getAvailableFields', { payload: {} });
    expect(result.data).toEqual([]);
  });

  it('handles fields without schema (uses unknown type)', async () => {
    harness.addFixture('GET', '/rest/api/3/field', {
      status: 200,
      body: [{ id: 'customfield_99', name: 'My Field' }],
    });

    const result = await harness.invoke('getAvailableFields', { payload: {} });
    expect(result.data[0].type).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// updateFieldValue
// ---------------------------------------------------------------------------
describe('updateFieldValue', () => {
  it('returns success: true when Jira API succeeds', async () => {
    harness.addFixture('PUT', '/rest/api/3/issue/TEST-1', {
      status: 204,
      body: {},
    });

    const result = await harness.invoke('updateFieldValue', {
      payload: { issueKey: 'TEST-1', fieldId: 'customfield_10100', value: 7 },
    });

    expect(result.data.success).toBe(true);
  });

  it('returns success: false when Jira API fails', async () => {
    harness.addFixture('PUT', '/rest/api/3/issue/TEST-1', {
      status: 400,
      body: { errorMessages: ['Bad request'] },
    });

    const result = await harness.invoke('updateFieldValue', {
      payload: { issueKey: 'TEST-1', fieldId: 'customfield_10100', value: 7 },
    });

    expect(result.data.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// logError
// ---------------------------------------------------------------------------
describe('logError', () => {
  it('accepts frontend error and returns success', async () => {
    const result = await harness.invoke('logError', {
      payload: {
        message: 'Test error',
        timestamp: new Date().toISOString(),
      },
    });
    expect(result.data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getCalculatedValue — fieldContextId=0 fallback via getFormulaConfigsByFieldId
// ---------------------------------------------------------------------------
describe('getCalculatedValue with fieldContextId=0 fallback', () => {
  it('returns empty breakdown when fieldContextId is 0 and no exact match (scan returns empty in test context)', async () => {
    // Save config with a real fieldContextId
    await harness.invoke('saveFormulaConfig', {
      payload: {
        fieldId: 'customfield_10100',
        fieldContextId: 17500,
        formula: '',
        trackedFields: [
          {
            fieldKey: 'priority',
            fieldName: 'Priority',
            conditions: [{ operator: '=', value: 'High', score: 3 }],
            defaultScore: 0,
          },
        ],
      },
    });

    // Call getCalculatedValue with fieldContextId=0 (unknown)
    // The fallback scan (query().getMany()) returns [] in the test harness
    // because the manifest no longer defines an index. Graceful degradation: returns empty breakdown.
    const result = await harness.invoke('getCalculatedValue', {
      payload: { issueKey: 'TEST-1', fieldId: 'customfield_10100', fieldContextId: 0 },
    });

    // In test harness context, scan returns empty → no config found → zero breakdown
    expect(result.data.totalScore).toBe(0);
    expect(Array.isArray(result.data.contributions)).toBe(true);
  });

  it('uses exact key lookup when fieldContextId is known', async () => {
    await harness.invoke('saveFormulaConfig', {
      payload: {
        fieldId: 'customfield_10100',
        fieldContextId: 17500,
        formula: '',
        trackedFields: [
          {
            fieldKey: 'priority',
            fieldName: 'Priority',
            conditions: [{ operator: '=', value: 'High', score: 3 }],
            defaultScore: 0,
          },
        ],
      },
    });

    harness.addFixture('GET', '/rest/api/3/issue/TEST-2?fields=priority', {
      status: 200,
      body: { key: 'TEST-2', fields: { priority: { name: 'High', id: '2' } } },
    });

    const result = await harness.invoke('getCalculatedValue', {
      payload: { issueKey: 'TEST-2', fieldId: 'customfield_10100', fieldContextId: 17500 },
    });

    expect(result.data.totalScore).toBe(3);
    expect(result.data.contributions).toHaveLength(1);
    expect(result.data.contributions[0].score).toBe(3);
  });
});
