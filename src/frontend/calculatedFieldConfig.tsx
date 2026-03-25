import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  ButtonGroup,
  DynamicTable,
  Heading,
  Inline,
  Label,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Text,
  Textfield,
  xcss,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';
import type { AvailableField, Condition, FieldRule, FormulaConfig } from '../types';

// Typed event interface for Forge UI Kit form events
interface ForgeChangeEvent {
  target?: {
    value?: string | number;
  };
}

// Typed option interface for Forge Select
interface SelectOption {
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Bug 2: Helper – mirrors sanitiseFieldKey in formula-evaluation-service.ts
// ---------------------------------------------------------------------------
/** Returns the mathjs variable name for a given field key */
function getVariableName(fieldKey: string): string {
  return `${fieldKey.replace(/[^a-zA-Z0-9]/g, '_')}_score`;
}

// ---------------------------------------------------------------------------
// Mock data – preview mode only
// ---------------------------------------------------------------------------
const PREVIEW_CLOUD_ID = 'preview-mode';

const MOCK_AVAILABLE_FIELDS: AvailableField[] = [
  { key: 'priority', name: 'Priority', type: 'priority' },
  { key: 'status', name: 'Status', type: 'status' },
  { key: 'assignee', name: 'Assignee', type: 'user' },
  { key: 'customfield_10020', name: 'Story Points', type: 'number' },
  { key: 'customfield_10016', name: 'Sprint', type: 'sprint' },
];

const MOCK_FORMULA_CONFIG: FormulaConfig = {
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
        { operator: '=', value: 'Medium', score: 2 },
        { operator: '=', value: 'Low', score: 1 },
      ],
      defaultScore: 0,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const containerStyle = xcss({ padding: 'space.200' });

const cardStyle = xcss({
  padding: 'space.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: 'radius.medium',
  backgroundColor: 'elevation.surface',
});

const sectionStyle = xcss({ marginBottom: 'space.300' });

// ---------------------------------------------------------------------------
// Operator options for Select
// ---------------------------------------------------------------------------
const OPERATOR_OPTIONS = [
  { label: '= (equals)', value: '=' },
  { label: '!= (not equals)', value: '!=' },
  { label: '> (greater than)', value: '>' },
  { label: '< (less than)', value: '<' },
  { label: '>= (greater or equal)', value: '>=' },
  { label: '<= (less or equal)', value: '<=' },
];

// ---------------------------------------------------------------------------
// Condition table head
// ---------------------------------------------------------------------------
const conditionHead = {
  cells: [
    { key: 'operator', content: 'Operator' },
    { key: 'value', content: 'Value' },
    { key: 'score', content: 'Score' },
    { key: 'actions', content: 'Actions' },
  ],
};

// ---------------------------------------------------------------------------
// Per-field card component
// ---------------------------------------------------------------------------
interface FieldCardProps {
  rule: FieldRule;
  onRemoveField: () => void;
  onAddCondition: (condition: Condition) => void;
  onRemoveCondition: (index: number) => void;
  onDefaultScoreChange: (score: number) => void;
}

const FieldCard = ({
  rule,
  onRemoveField,
  onAddCondition,
  onRemoveCondition,
  onDefaultScoreChange,
}: FieldCardProps): JSX.Element => {
  const [newOperator, setNewOperator] = useState<string>('=');
  const [newValue, setNewValue] = useState<string>('');
  const [newScore, setNewScore] = useState<string>('0');

  const conditionRows = (rule.conditions || []).map((cond, idx) => ({
    key: `cond-${idx}`,
    cells: [
      { key: 'operator', content: <Lozenge>{cond.operator}</Lozenge> },
      { key: 'value', content: <Text>{cond.value}</Text> },
      { key: 'score', content: <Text>{String(cond.score)}</Text> },
      {
        key: 'actions',
        content: (
          <Button appearance="subtle" onClick={() => onRemoveCondition(idx)}>
            Remove
          </Button>
        ),
      },
    ],
  }));

  const handleAddCondition = () => {
    const scoreNum = parseFloat(newScore);
    if (!newValue.trim() || isNaN(scoreNum)) return;
    onAddCondition({
      operator: newOperator as Condition['operator'],
      value: newValue.trim(),
      score: scoreNum,
    });
    setNewValue('');
    setNewScore('0');
  };

  return (
    <Box xcss={cardStyle}>
      <Stack space="space.200">
        <Inline spread="space-between" alignBlock="center">
          <Heading size="small">{rule.fieldName}</Heading>
          <Button appearance="danger" onClick={onRemoveField}>
            Remove Field
          </Button>
        </Inline>

        {/* Bug 2: Show variable name under field name */}
        <Inline space="space.050" alignBlock="center">
          <Text>Variable name:</Text>
          <Text weight="bold">{getVariableName(rule.fieldKey)}</Text>
        </Inline>

        <DynamicTable
          head={conditionHead}
          rows={conditionRows}
          emptyView={<Text>No conditions defined. Add one below.</Text>}
        />

        <Box xcss={xcss({ padding: 'space.100', backgroundColor: 'color.background.neutral.subtle', borderRadius: 'radius.small' })}>
          <Stack space="space.100">
            <Text weight="bold">Add Condition</Text>
            <Inline space="space.100" alignBlock="center" shouldWrap>
              <Box xcss={xcss({ minWidth: '160px' })}>
                <Label labelFor={`op-select-${rule.fieldKey}`}>Operator</Label>
                <Select
                  inputId={`op-select-${rule.fieldKey}`}
                  options={OPERATOR_OPTIONS}
                  value={OPERATOR_OPTIONS.find((o) => o.value === newOperator) || OPERATOR_OPTIONS[0]}
                  onChange={(opt) => setNewOperator(String((opt as SelectOption)?.value ?? '='))}
                />
              </Box>
              <Box xcss={xcss({ minWidth: '120px' })}>
                <Label labelFor={`val-input-${rule.fieldKey}`}>Value</Label>
                <Textfield
                  id={`val-input-${rule.fieldKey}`}
                  name={`val-${rule.fieldKey}`}
                  value={newValue}
                  onChange={(e) => setNewValue(String((e as ForgeChangeEvent).target?.value ?? ''))}
                  placeholder="e.g. High"
                />
                {/* Bug 3: Value input hint */}
                <Text>Enter exact value (e.g. High, In Progress). Case-insensitive.</Text>
              </Box>
              <Box xcss={xcss({ minWidth: '80px' })}>
                <Label labelFor={`score-input-${rule.fieldKey}`}>Score</Label>
                <Textfield
                  id={`score-input-${rule.fieldKey}`}
                  name={`score-${rule.fieldKey}`}
                  type="number"
                  value={newScore}
                  onChange={(e) => setNewScore(String((e as ForgeChangeEvent).target?.value ?? '0'))}
                />
              </Box>
              <Box xcss={xcss({ paddingTop: 'space.300' })}>
                <Button appearance="primary" onClick={handleAddCondition}>
                  Add Condition
                </Button>
              </Box>
            </Inline>
          </Stack>
        </Box>

        <Inline space="space.100" alignBlock="center">
          <Label labelFor={`default-score-${rule.fieldKey}`}>Default Score (no match):</Label>
          <Textfield
            id={`default-score-${rule.fieldKey}`}
            name={`default-score-${rule.fieldKey}`}
            type="number"
            value={String(rule.defaultScore)}
            onChange={(e) =>
              onDefaultScoreChange(parseFloat(String((e as ForgeChangeEvent).target?.value ?? '0')) || 0)
            }
          />
        </Inline>
      </Stack>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main config component
// ---------------------------------------------------------------------------
const CalculatedFieldConfig = (): JSX.Element => {
  const [loading, setLoading] = useState<boolean>(true);
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const [config, setConfig] = useState<FormulaConfig | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>('');
  const [formula, setFormula] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');
  const [fieldId, setFieldId] = useState<string>('');
  const [fieldContextId, setFieldContextId] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await view.getContext();
        const isPreview = !ctx.cloudId || ctx.cloudId === PREVIEW_CLOUD_ID;

        if (isPreview) {
          setAvailableFields(MOCK_AVAILABLE_FIELDS);
          setConfig(MOCK_FORMULA_CONFIG);
          setFormula(MOCK_FORMULA_CONFIG.formula);
          setFieldId(MOCK_FORMULA_CONFIG.fieldId);
          setFieldContextId(MOCK_FORMULA_CONFIG.fieldContextId);
          setLoading(false);
          return;
        }

        // Log full context for debugging
        console.log('[CalculatedFieldConfig] Full context object:', JSON.stringify(ctx, null, 2));

        const ext = (ctx as unknown as {
          extension?: {
            fieldId?: string;
            fieldType?: string;
            configurationId?: number;
            fieldContextId?: number;
            field?: { id?: string };
            context?: { id?: number };
          }
        }).extension || {};

        const fId: string = ext.fieldId || ext.field?.id || '';
        // configurationId is the correct property for contextConfig entry point
        // fieldContextId may be present in some contexts; configurationId takes priority
        const fCtxId: number = ext.configurationId ?? ext.fieldContextId ?? ext.context?.id ?? 0;

        console.log('[CalculatedFieldConfig] Extracted fieldId:', fId, 'fieldContextId:', fCtxId);

        setFieldId(fId);
        setFieldContextId(fCtxId);

        const [fields, existingConfig] = await Promise.all([
          invoke('getAvailableFields') as Promise<AvailableField[]>,
          invoke('getFormulaConfig', { fieldId: fId, fieldContextId: fCtxId }) as Promise<FormulaConfig | null>,
        ]);

        setAvailableFields(fields || []);
        if (existingConfig) {
          setConfig(existingConfig);
          setFormula(existingConfig.formula);
        } else {
          setConfig({
            fieldId: fId,
            fieldContextId: fCtxId,
            formula: '',
            trackedFields: [],
            createdAt: '',
            updatedAt: '',
          });
        }
      } catch (err) {
        console.error('Failed to load config', err);
        setSaveError('Failed to load configuration. Please check the logs.');
        setSaveStatus('error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fieldOptions = (availableFields || []).map((f) => ({
    label: `${f.name} (${f.key})`,
    value: f.key,
  }));

  const handleAddField = () => {
    if (!selectedFieldKey || !config) return;
    const already = (config.trackedFields || []).some((r) => r.fieldKey === selectedFieldKey);
    if (already) return;
    const field = availableFields.find((f) => f.key === selectedFieldKey);
    if (!field) return;
    const newRule: FieldRule = {
      fieldKey: field.key,
      fieldName: field.name,
      conditions: [],
      defaultScore: 0,
    };
    setConfig({ ...config, trackedFields: [...(config.trackedFields || []), newRule] });
    setSelectedFieldKey('');
  };

  const handleRemoveField = (fieldKey: string) => {
    if (!config) return;
    setConfig({
      ...config,
      trackedFields: (config.trackedFields || []).filter((r) => r.fieldKey !== fieldKey),
    });
  };

  const handleAddCondition = (fieldKey: string, condition: Condition) => {
    if (!config) return;
    setConfig({
      ...config,
      trackedFields: (config.trackedFields || []).map((r) =>
        r.fieldKey === fieldKey
          ? { ...r, conditions: [...(r.conditions || []), condition] }
          : r,
      ),
    });
  };

  const handleRemoveCondition = (fieldKey: string, condIndex: number) => {
    if (!config) return;
    setConfig({
      ...config,
      trackedFields: (config.trackedFields || []).map((r) =>
        r.fieldKey === fieldKey
          ? { ...r, conditions: (r.conditions || []).filter((_, i) => i !== condIndex) }
          : r,
      ),
    });
  };

  const handleDefaultScoreChange = (fieldKey: string, score: number) => {
    if (!config) return;
    setConfig({
      ...config,
      trackedFields: (config.trackedFields || []).map((r) =>
        r.fieldKey === fieldKey ? { ...r, defaultScore: score } : r,
      ),
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaveStatus('idle');
    try {
      const ctx = await view.getContext();
      const isPreview = !ctx.cloudId || ctx.cloudId === PREVIEW_CLOUD_ID;

      if (isPreview) {
        setSaveStatus('success');
        return;
      }

      const now = new Date().toISOString();
      const payload: FormulaConfig = {
        ...config,
        formula,
        fieldId,
        fieldContextId: Number(fieldContextId), // ensure it's a number
        updatedAt: now,
        createdAt: config.createdAt || now,
      };
      const result = await invoke('saveFormulaConfig', payload) as { success: boolean; error?: string };
      if (result.success) {
        setSaveStatus('success');
        setSaveError('');
      } else {
        setSaveStatus('error');
        setSaveError(result.error || 'Unknown error saving configuration.');
      }
    } catch (err) {
      console.error('Failed to save config', err);
      setSaveStatus('error');
      setSaveError('Failed to save configuration. Please check the logs.');
    }
  };

  const handleReset = () => {
    setSaveStatus('idle');
    setSaveError('');
  };

  if (loading) {
    return (
      <Box xcss={containerStyle}>
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <Box xcss={containerStyle}>
      <Stack space="space.300">

        {/* Section 1 – Tracked Fields */}
        <Box xcss={sectionStyle}>
          <Stack space="space.200">
            <Heading size="medium">Tracked Fields</Heading>

            <Inline space="space.100" alignBlock="center">
              <Box xcss={xcss({ minWidth: '260px' })}>
                <Label labelFor="add-field-select">Add Field to Track</Label>
                <Select
                  inputId="add-field-select"
                  options={fieldOptions}
                  value={fieldOptions.find((o) => o.value === selectedFieldKey) || null}
                  onChange={(opt) => setSelectedFieldKey(String((opt as SelectOption)?.value ?? ''))}
                  placeholder="Select a field..."
                  isClearable
                />
              </Box>
              <Box xcss={xcss({ paddingTop: 'space.300' })}>
                <Button appearance="primary" onClick={handleAddField}>
                  Add Field
                </Button>
              </Box>
            </Inline>

            {(config?.trackedFields || []).length === 0 ? (
              <SectionMessage appearance="information" title="No Fields Tracked">
                <Text>Select a field above and click Add Field to start building your formula.</Text>
              </SectionMessage>
            ) : (
              <Stack space="space.200">
                {(config?.trackedFields || []).map((rule) => (
                  <FieldCard
                    key={rule.fieldKey}
                    rule={rule}
                    onRemoveField={() => handleRemoveField(rule.fieldKey)}
                    onAddCondition={(cond) => handleAddCondition(rule.fieldKey, cond)}
                    onRemoveCondition={(idx) => handleRemoveCondition(rule.fieldKey, idx)}
                    onDefaultScoreChange={(score) => handleDefaultScoreChange(rule.fieldKey, score)}
                  />
                ))}
              </Stack>
            )}

            {/* Bug 2: Formula Variables reference box */}
            {(config?.trackedFields || []).length > 0 && (
              <Box xcss={xcss({ padding: 'space.150', backgroundColor: 'color.background.neutral.subtle', borderRadius: 'radius.small' })}>
                <Stack space="space.100">
                  <Text weight="bold">Formula Variables</Text>
                  <Text>Use these variable names in your formula expression:</Text>
                  {(config?.trackedFields || []).map((rule) => (
                    <Inline key={rule.fieldKey} space="space.100" alignBlock="center">
                      <Text>{rule.fieldName}:</Text>
                      <Text weight="bold">{getVariableName(rule.fieldKey)}</Text>
                    </Inline>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Section 2 – Formula Expression */}
        <Box xcss={sectionStyle}>
          <Stack space="space.150">
            <Heading size="medium">Formula Expression</Heading>
            {/* Bug 2: Updated help text */}
            <Stack space="space.050">
              <Text>
                Combine field scores using arithmetic operators (+, -, *, /). Use the variable name shown under each field above.
              </Text>
              <Text>
                Leave blank to automatically sum all field scores.
              </Text>
            </Stack>
            <Label labelFor="formula-input">Formula</Label>
            <Textfield
              id="formula-input"
              name="formula"
              value={formula}
              onChange={(e) => setFormula(String((e as ForgeChangeEvent).target?.value ?? ''))}
              placeholder="e.g. priority_score + status_score"
            />
            {formula ? (
              <Inline space="space.050" alignBlock="center">
                <Text weight="bold">Preview:</Text>
                <Text>{formula}</Text>
              </Inline>
            ) : null}
            {/* Bug 4: Empty formula UX */}
            {!formula && (
              <SectionMessage appearance="information" title="Auto-sum mode">
                <Text>No formula entered — all field scores will be automatically summed.</Text>
              </SectionMessage>
            )}
          </Stack>
        </Box>

        {/* Section 3 – Actions */}
        <Box xcss={sectionStyle}>
          <Stack space="space.150">
            <ButtonGroup>
              <Button appearance="primary" onClick={handleSave}>
                Save Configuration
              </Button>
              <Button appearance="default" onClick={handleReset}>
                Reset
              </Button>
            </ButtonGroup>

            {saveStatus === 'success' && (
              <SectionMessage appearance="success" title="Saved">
                <Text>Configuration saved successfully.</Text>
              </SectionMessage>
            )}
            {saveStatus === 'error' && (
              <SectionMessage appearance="error" title="Error">
                <Text>{saveError || 'Failed to save configuration.'}</Text>
              </SectionMessage>
            )}
          </Stack>
        </Box>

      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<CalculatedFieldConfig />);
