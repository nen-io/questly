const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptName = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!scriptName) {
    console.error('Missing DB script name.');
    process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const compiledScript = path.join(rootDir, 'dist', 'api', 'src', 'db', `${scriptName}.js`);
const sourceScript = path.join(rootDir, 'src', 'db', `${scriptName}.ts`);

const useCompiledScript = fs.existsSync(compiledScript);
const command = useCompiledScript ? 'node' : 'tsx';
const scriptPath = useCompiledScript ? compiledScript : sourceScript;

// Production containers only install runtime dependencies, so fall back to the
// compiled JS build when it exists instead of requiring tsx to be present.
const result = spawnSync(command, [scriptPath, ...extraArgs], {
    stdio: 'inherit',
    env: process.env,
});

if (result.error) {
    if (result.error.code === 'ENOENT' && command === 'tsx') {
        console.error('tsx is not installed and no compiled DB script was found. Run `pnpm build` first or install dev dependencies.');
    } else {
        console.error(result.error.message);
    }
}

process.exit(result.status ?? 1);
