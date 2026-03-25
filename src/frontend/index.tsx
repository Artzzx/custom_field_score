import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Button, Box, xcss } from '@forge/react';
import { invoke } from '@forge/bridge';
// Utility to set up global error handlers to log UI errors to the backend
import { setupGlobalErrorHandlers, logError, ErrorBoundary } from './utils/errorLogger';
// Import types for when you need them (e.g., custom components, prop objects)
// import type { ButtonProps, TextProps, BoxProps } from '../types';

// xcss provides type-safe styling using Atlassian Design Tokens.
// Note: borderRadius tokens use 'radius.*' format (not 'border.radius.*').
// Valid values: radius.xsmall, radius.small, radius.medium, radius.large, etc.
const containerStyle = xcss({
  padding: 'space.200',
  borderRadius: 'radius.medium',
});

const App = (): JSX.Element => {
  const [data, setData] = useState<string | null>(null);

  const handleButtonClick = (): void => {
    console.log('Forge button clicked!');
  };

  useEffect(() => {
    // Set up global error handlers on app initialization
    setupGlobalErrorHandlers();

    invoke('getText', { example: 'my-invoke-variable' })
      .then((response: unknown) => setData(response as string))
      .catch((error) => {
        console.error('Failed to fetch data:', error);
        // Log error to backend
        logError({
          message: 'Failed to fetch data from getText resolver',
          stack: error?.stack || String(error),
        });
        setData('Error loading data');
      });
  }, []);

  return (
    <Box xcss={containerStyle}>
      <Text color="color.text" size="medium" weight="bold">
        Hello world!
      </Text>
      
      <Text color="color.text.subtle" size="small" weight="regular">
        {data ? data : 'Loading...'}
      </Text>
      
      <Button appearance="primary" onClick={handleButtonClick}>
        Click me!
      </Button>
      
      <Text color="color.text.accent.blue" size="large" weight="semibold">
        All props are type-safe!
      </Text>
    </Box>
  );
};

// Render the app with automatic error handling
ForgeReconciler.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
