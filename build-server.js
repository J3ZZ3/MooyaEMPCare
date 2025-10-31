import { build } from 'esbuild';
import fs from 'fs';

const external = [];

// Add all dependencies to external list
try {
  const pkgContent = fs.readFileSync('./package.json', 'utf8');
  const pkg = JSON.parse(pkgContent);
  const dependencies = Object.keys(pkg.dependencies || {});
  const devDependencies = Object.keys(pkg.devDependencies || {});
  
  // All node_modules are external
  external.push(...dependencies, ...devDependencies);
} catch (err) {
  console.error('Could not load package.json:', err);
  process.exit(1);
}

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  external,
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
  }
}).catch(() => process.exit(1));

console.log('✓ Build complete');

