// Offline equivalent of `forge lint` (which needs `forge login`): runs Forge's own manifest
// validator and client-side linters from the globally installed @forge/cli.
// Usage: node scripts/validate-offline.cjs
const { execSync } = require('child_process');
const G = execSync('npm root -g').toString().trim() + '/@forge/cli/node_modules/@forge';
const L = require(G + '/lint'); const M = require(G + '/manifest'); const fs=require('fs'); const path=require('path');
const statsig = new Proxy({}, { get: (t, p) => async () => (/Runtimes|List|Array/.test(String(p)) ? [] : false) });
const logger = { info: console.log, warn: console.log, error: console.log, debug: ()=>{}, trace: ()=>{} , logger: console};
(async () => {
  const v = await M.validate(false, process.cwd()+'/manifest.yml');
  console.log('manifest valid:', v.success); for (const e of v.errors || []) console.log(e.message);
  if (!v.success) process.exit(1);
  const manifest = v.manifestObject?.typedContent || v.manifestObject;
  const files = []; (function walk(d){ for (const f of fs.readdirSync(d)) { const p=path.join(d,f); fs.statSync(p).isDirectory()? walk(p) : /\.(js|jsx)$/.test(f) && files.push(p);} })('src');
  const res = await L.lint(files, manifest, 'development', logger, statsig, { linter: { mode: 'client-side' } });
  const c = L.problemCount(res); console.log('problems', JSON.stringify(c));
  L.reportLintResults({ info: console.log, warn: console.log, error: console.log }, res, true);
  if (c.errors) process.exit(1);
})().catch(e => { console.error('ERR', e.stack); process.exit(1); });
