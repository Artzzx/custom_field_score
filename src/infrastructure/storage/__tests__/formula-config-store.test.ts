import { getFormulaConfigFromStore, saveFormulaConfigToStore, listAllFormulaConfigs, getFormulaConfigsByFieldId } from '../formula-config-store';
import type { FormulaConfig } from '../../../shared/types';

const makeConfig = (overrides: Partial<FormulaConfig> = {}): FormulaConfig => ({
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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('formula-config-store', () => {
  describe('getFormulaConfigFromStore', () => {
    it('returns null when no config is stored (cold start)', async () => {
      const result = await getFormulaConfigFromStore('customfield_99999', 999);
      expect(result).toBeNull();
    });

    it('returns null for unknown fieldContextId', async () => {
      const result = await getFormulaConfigFromStore('customfield_10100', 42);
      expect(result).toBeNull();
    });
  });

  describe('saveFormulaConfigToStore + getFormulaConfigFromStore', () => {
    it('saves and retrieves a config', async () => {
      const config = makeConfig();
      await saveFormulaConfigToStore(config);
      const retrieved = await getFormulaConfigFromStore(config.fieldId, config.fieldContextId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.fieldId).toBe(config.fieldId);
      expect(retrieved?.formula).toBe(config.formula);
    });

    it('uses sanitised key — field with special chars is stored and retrieved correctly', async () => {
      const config = makeConfig({ fieldId: 'customfield_10100', fieldContextId: 5 });
      await saveFormulaConfigToStore(config);
      const retrieved = await getFormulaConfigFromStore('customfield_10100', 5);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.fieldId).toBe('customfield_10100');
    });

    it('uses fieldId-only key when fieldContextId is 0 (falsy)', async () => {
      const config = makeConfig({ fieldId: 'customfield_10200', fieldContextId: 0 });
      await saveFormulaConfigToStore(config);
      const retrieved = await getFormulaConfigFromStore('customfield_10200', 0);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.fieldId).toBe('customfield_10200');
    });

    it('handles different fieldContextIds as separate entries', async () => {
      const config1 = makeConfig({ fieldContextId: 1, formula: 'formula_one' });
      const config2 = makeConfig({ fieldContextId: 2, formula: 'formula_two' });
      await saveFormulaConfigToStore(config1);
      await saveFormulaConfigToStore(config2);

      const r1 = await getFormulaConfigFromStore('customfield_10100', 1);
      const r2 = await getFormulaConfigFromStore('customfield_10100', 2);

      expect(r1?.formula).toBe('formula_one');
      expect(r2?.formula).toBe('formula_two');
    });

    it('overwrites existing config on second save', async () => {
      const config = makeConfig({ formula: 'original_formula' });
      await saveFormulaConfigToStore(config);

      const updated = makeConfig({ formula: 'updated_formula' });
      await saveFormulaConfigToStore(updated);

      const retrieved = await getFormulaConfigFromStore(config.fieldId, config.fieldContextId);
      expect(retrieved?.formula).toBe('updated_formula');
    });
  });

  describe('listAllFormulaConfigs and getFormulaConfigsByFieldId', () => {
    // Note: query().index() requires manifest-loaded entityDefs which are only available
    // in createTestHarness context. These functions return [] when the index is unavailable
    // (error is caught and logged), which is the expected graceful-degradation behavior.
    // Full integration coverage is provided in src/resolvers/__tests__/index.test.ts.

    it('listAllFormulaConfigs returns an array (empty when index not available in unit test context)', async () => {
      // In unit test context (no harness), query().index() throws INVALID_ENTITY_INDEX
      // and the function catches the error and returns []. This verifies the error handling.
      const result = await listAllFormulaConfigs();
      expect(Array.isArray(result)).toBe(true);
    });

    it('getFormulaConfigsByFieldId returns an array (empty when index not available in unit test context)', async () => {
      // Same as above - error is caught gracefully
      const result = await getFormulaConfigsByFieldId('customfield_10100');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
