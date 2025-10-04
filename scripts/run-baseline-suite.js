#!/usr/bin/env node

const { spawn } = require('node:child_process');

const steps = [
  { title: 'Lint', command: 'npm', args: ['run', 'lint'] },
  { title: 'Type Check', command: 'npm', args: ['run', 'type-check'] },
  { title: 'Unit Tests', command: 'npm', args: ['run', 'test:unit'] },
  { title: 'Smoke E2E', command: 'npm', args: ['run', 'test:e2e:smoke'] },
];

const runStep = (index = 0) => {
  if (index >= steps.length) {
    console.log('\n✅ Baseline test matrix completed successfully.');
    return;
  }

  const step = steps[index];
  console.log(`\n▶️  Running ${step.title}...`);

  const child = spawn(step.command, step.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('close', code => {
    if (code !== 0) {
      console.error(`\n❌ ${step.title} failed with exit code ${code}.`);
      process.exit(code ?? 1);
    }

    console.log(`\n✅ ${step.title} passed.`);
    runStep(index + 1);
  });
};

runStep();
