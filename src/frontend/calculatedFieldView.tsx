import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Heading,
  Inline,
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  DynamicTable,
  xcss,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';
import type { ScoreBreakdown } from '../types';

// ---------------------------------------------------------------------------
// Mock data – shown only in preview mode (cloudId === 'preview-mode')
// ---------------------------------------------------------------------------
const MOCK_SCORE_BREAKDOWN: ScoreBreakdown = {
  totalScore: 7,
  contributions: [
    { fieldKey: 'priority', fieldName: 'Priority', fieldValue: 'High', score: 3 },
    { fieldKey: 'status', fieldName: 'Status', fieldValue: 'In Progress', score: 2 },
    { fieldKey: 'customfield_10020', fieldName: 'Story Points', fieldValue: '5', score: 2 },
  ],
};

const PREVIEW_CLOUD_ID = 'preview-mode';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const containerStyle = xcss({
  padding: 'space.200',
});

const scoreBoxStyle = xcss({
  padding: 'space.200',
  backgroundColor: 'color.background.accent.blue.subtlest',
  borderRadius: 'radius.medium',
  marginBottom: 'space.150',
});

// ---------------------------------------------------------------------------
// DynamicTable helpers
// ---------------------------------------------------------------------------
const tableHead = {
  cells: [
    { key: 'fieldName', content: 'Field Name', isSortable: false },
    { key: 'fieldValue', content: 'Current Value', isSortable: false },
    { key: 'score', content: 'Score Contribution', isSortable: false },
  ],
};

const buildRows = (contributions: ScoreBreakdown['contributions']) =>
  (contributions || []).map((c) => ({
    key: c.fieldKey,
    cells: [
      { key: 'fieldName', content: <Text>{c.fieldName}</Text> },
      { key: 'fieldValue', content: <Text>{c.fieldValue}</Text> },
      {
        key: 'score',
        content: (
          <Lozenge appearance={c.score > 0 ? 'success' : 'default'}>{String(c.score)}</Lozenge>
        ),
      },
    ],
  }));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const CalculatedFieldView = (): JSX.Element => {
  const [loading, setLoading] = useState<boolean>(true);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await view.getContext();
        const isPreview = !ctx.cloudId || ctx.cloudId === PREVIEW_CLOUD_ID;

        if (isPreview) {
          setBreakdown(MOCK_SCORE_BREAKDOWN);
          setLoading(false);
          return;
        }

        // Log full context for debugging — this reveals the real property paths at runtime
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log('[CalculatedFieldView] FULL RAW CTX:', JSON.stringify(ctx, null, 2));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ext = (ctx as any).extension || {};

        // Log the full extension object too
        console.log('[CalculatedFieldView] FULL RAW EXTENSION:', JSON.stringify(ext, null, 2));

        const issueKey: string = ext.issue?.key || ext.issue?.id || '';
        const fieldId: string = ext.fieldId || ext.field?.id || '';

        // Per Forge docs: fieldContextId and configurationId are ONLY available in contextConfig entry point.
        // In the view entry point, they are never present. Always pass 0 and rely on the resolver's
        // fieldId fallback scan (getFormulaConfigsByFieldId) to find the correct config.
        const fieldContextId: number = 0;

        console.log('[CalculatedFieldView] Extracted — issueKey:', issueKey, 'fieldId:', fieldId, 'fieldContextId:', fieldContextId, '(always 0 in view entry point — resolver will use fieldId fallback)');

        const result = await invoke('getCalculatedValue', { issueKey, fieldId, fieldContextId });
        setBreakdown(result as ScoreBreakdown);
      } catch (err) {
        console.error('Failed to load calculated value', err);
        setError('Failed to load score. Please check the logs.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <Box xcss={containerStyle}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box xcss={containerStyle}>
        <SectionMessage appearance="error" title="Error">
          <Text>{error}</Text>
        </SectionMessage>
      </Box>
    );
  }

  if (!breakdown || breakdown.contributions.length === 0) {
    return (
      <Box xcss={containerStyle}>
        <SectionMessage appearance="information" title="Not Configured">
          <Text>No formula configured. Set up this field in the field context settings.</Text>
        </SectionMessage>
      </Box>
    );
  }

  const rows = buildRows(breakdown.contributions || []);

  return (
    <Box xcss={containerStyle}>
      <Stack space="space.200">
        <Box xcss={scoreBoxStyle}>
          <Stack space="space.100" alignInline="center">
            <Heading size="xlarge">{String(breakdown.totalScore)}</Heading>
            <Lozenge appearance="inprogress">Score: {breakdown.totalScore}</Lozenge>
          </Stack>
        </Box>
        <DynamicTable
          head={tableHead}
          rows={rows}
          emptyView={<Text>No field contributions found.</Text>}
        />
        <Inline space="space.100" alignBlock="center">
          <Text weight="bold">Total Score:</Text>
          <Lozenge appearance="success">{String(breakdown.totalScore)}</Lozenge>
        </Inline>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<CalculatedFieldView />);
