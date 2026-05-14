const { execFileSync } = require('child_process');
const path = require('path');

jest.setTimeout(30000);

test('Android manifest allows HTTP API traffic', () => {
  const root = path.resolve(__dirname, '..');
  const expoCli = require.resolve('expo/bin/cli');
  const output = execFileSync(process.execPath, [expoCli, 'config', '--type', 'introspect', '--json'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 25000,
  });
  const config = JSON.parse(output);
  const application = config._internal.modResults.android.manifest.manifest.application[0];

  expect(application.$['android:usesCleartextTraffic']).toBe('true');
});
