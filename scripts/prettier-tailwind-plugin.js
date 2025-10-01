const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const requireFromCwd = createRequire(path.join(process.cwd(), 'package.json'));
const candidatePaths =
  require.resolve.paths('prettier-plugin-tailwindcss') || [];

const resolvedPath = candidatePaths
  .map(candidate => path.join(candidate, 'prettier-plugin-tailwindcss'))
  .find(
    candidate => fs.existsSync(candidate) || fs.existsSync(`${candidate}.js`)
  );

if (resolvedPath) {
  module.exports = requireFromCwd('prettier-plugin-tailwindcss');
} else {
  const message =
    '[prettier] prettier-plugin-tailwindcss not found, skipping Tailwind class sorting.';

  if (process.env.CI) {
    console.warn(message);
  }

  module.exports = {
    name: 'prettier-plugin-tailwindcss-stub',
  };
}
