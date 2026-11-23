import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box, Button, DynamicTable, Heading, Inline, Lozenge, ProgressBar, SectionMessage,
  Select, Spinner, Stack, Strong, Text, Textfield, Label,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const APPEARANCE = { GO: 'success', CAUTION: 'moved', 'NO-GO': 'removed' };
const SEV = { high: 'removed', medium: 'moved', low: 'default' };

function Trend({ delta, points }) {
  if (!points || points.length < 2) return <Text>First check for this release. Come back tomorrow to see the trend.</Text>;
  const sign = delta > 0 ? '+' : '';
  return <Text>Trend: {points.map((p) => p.score).join(' → ')} ({sign}{delta} since last check)</Text>;
}

const App = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(null);
  const [ticket, setTicket] = useState('');
  const [posted, setPosted] = useState(null);

  const load = async (versionName) => {
    setLoading(true);
    setData(await invoke('getReadiness', { versionName }));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <Spinner label="Scoring release" />;
  if (data?.error) return <SectionMessage appearance="warning" title="GoNoGo needs a release"><Text>{data.error}</Text></SectionMessage>;

  const rows = (data.checks || []).map((c) => ({
    key: c.key,
    cells: [
      { key: 'sev', content: <Lozenge appearance={SEV[c.severity]}>{c.severity}</Lozenge> },
      { key: 'label', content: c.label },
      { key: 'n', content: String(c.count) },
      { key: 'pen', content: `-${c.penalty}` },
      { key: 'issues', content: c.issues.map((i) => (i.key === '-' ? i.detail : `${i.key}: ${i.detail}`)).join(' · ') },
    ],
  }));

  return (
    <Stack space="space.200">
      <Inline space="space.200" alignBlock="center">
        <Heading as="h2">{data.version?.name}</Heading>
        <Lozenge appearance={APPEARANCE[data.verdict]} isBold>{data.verdict}</Lozenge>
        <Text><Strong>{data.score}/100</Strong> confidence</Text>
      </Inline>
      <ProgressBar value={data.score / 100} appearance={data.verdict === 'GO' ? 'success' : 'default'} />
      <Text>{data.totals.done}/{data.totals.issues} done · {data.totals.open} open{data.forecast?.daysLeft != null ? ` · ${data.forecast.daysLeft} days to release date` : ''}{data.forecast?.projectedDays != null ? ` · ~${data.forecast.projectedDays} days of work left at current pace` : ''}</Text>
      <Trend delta={data.trendDelta} points={data.trend} />
      <Box xcss={{ width: '320px' }}>
        <Select
          inputId="version"
          placeholder="Switch release"
          options={(data.versions || []).map((v) => ({ label: v, value: v }))}
          value={version}
          onChange={(o) => { setVersion(o); load(o?.value); }}
        />
      </Box>
      {rows.length ? (
        <DynamicTable
          caption="Why this score"
          head={{ cells: [{ key: 'sev', content: 'Severity' }, { key: 'label', content: 'Risk' }, { key: 'n', content: 'Issues' }, { key: 'pen', content: 'Impact' }, { key: 'issues', content: 'Evidence' }] }}
          rows={rows}
        />
      ) : <SectionMessage appearance="success" title="No risks found"><Text>Everything in this release looks ready.</Text></SectionMessage>}
      {data.nextActions?.length ? (
        <SectionMessage appearance="information" title="Do this next">
          {data.nextActions.map((a, i) => <Text key={i}>{i + 1}. {a}</Text>)}
        </SectionMessage>
      ) : null}
      <Inline space="space.100" alignBlock="end">
        <Stack>
          <Label labelFor="ticket">Post go/no-go record on issue</Label>
          <Textfield id="ticket" placeholder="SHOP-100" value={ticket} onChange={(e) => setTicket(e.target.value)} />
        </Stack>
        <Button appearance="primary" isDisabled={!ticket} onClick={async () => setPosted(await invoke('postReport', { issueKey: ticket.trim().toUpperCase(), versionName: data.version?.name }))}>Post report</Button>
        <Button onClick={() => load(version?.value)}>Re-score</Button>
      </Inline>
      {posted?.ok ? <SectionMessage appearance="success"><Text>Posted {posted.verdict} ({posted.score}/100) on {ticket.toUpperCase()}.</Text></SectionMessage> : null}
      {posted?.error ? <SectionMessage appearance="error"><Text>{posted.error}</Text></SectionMessage> : null}
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
