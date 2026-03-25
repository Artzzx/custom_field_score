import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Label,
  SectionMessage,
  Stack,
  Text,
  Textfield,
  xcss,
} from '@forge/react';
import { view } from '@forge/bridge';

interface ForgeChangeEvent {
  target?: {
    value?: string | number;
  };
}

const PREVIEW_CLOUD_ID = 'preview-mode';

const containerStyle = xcss({
  padding: 'space.200',
});

const CalculatedFieldEdit = (): JSX.Element => {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await view.getContext();
        const isPreview = !ctx.cloudId || ctx.cloudId === PREVIEW_CLOUD_ID;

        if (isPreview) {
          setValue('7');
          return;
        }

        const ext = (ctx as unknown as { extension?: { fieldValue?: string | number } }).extension || {};
        const fieldValue = ext.fieldValue;
        if (fieldValue !== undefined && fieldValue !== null) {
          setValue(String(fieldValue));
        }
      } catch (err) {
        console.error('Failed to load field value', err);
      }
    };
    load();
  }, []);

  return (
    <Box xcss={containerStyle}>
      <Stack space="space.200">
        <SectionMessage appearance="warning" title="Note">
          <Text>Manual values will be overwritten when tracked fields change.</Text>
        </SectionMessage>
        <Stack space="space.050">
          <Label labelFor="score-input">Score</Label>
          <Textfield
            id="score-input"
            name="score"
            type="number"
            value={value}
            onChange={(e) => setValue(String((e as ForgeChangeEvent).target?.value ?? ''))}
            placeholder="Enter a numeric score"
          />
        </Stack>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<CalculatedFieldEdit />);
