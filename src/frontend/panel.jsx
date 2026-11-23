import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Inline, Lozenge, SectionMessage, Spinner, Stack, Strong, Text } from '@forge/react';
import { invoke } from '@forge/bridge';

const LEVEL = { HIGH: 'removed', MEDIUM: 'moved', LOW: 'success' };

const Panel = () => {
  const [data, setData] = useState(null);
  useEffect(() => { invoke('getIssueRisk').then(setData); }, []);
  if (!data) return <Spinner label="Checking ship risk" />;
  if (data.error) return <SectionMessage appearance="warning"><Text>{data.error}</Text></SectionMessage>;
  return (
    <Stack space="space.100">
      <Inline space="space.100" alignBlock="center">
        <Lozenge appearance={LEVEL[data.level]} isBold>{data.level} ship risk</Lozenge>
        {data.release ? <Text>for <Strong>{data.release}</Strong></Text> : <Text>not in a release yet</Text>}
      </Inline>
      {data.risks.length
        ? data.risks.map((r, i) => <Text key={i}>• {r.label}: {r.detail}</Text>)
        : <Text>No risk signals. Nice.</Text>}
      <Text>Ask the GoNoGo Release Captain agent in Rovo chat for the full release picture.</Text>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><Panel /></React.StrictMode>);
