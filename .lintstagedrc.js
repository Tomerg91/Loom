const path = require('path');

const escapeFile = file => `"${file.replace(/(["$`\\])/g, '\\$1')}"`;

const normalizeFiles = files =>
  Array.from(new Set(files)).map(file =>
    escapeFile(path.relative(process.cwd(), file))
  );

const buildCommand = (bin, args, files, filterFn = () => true) => {
  const filteredFiles = files.filter(file =>
    filterFn(path.relative(process.cwd(), file))
  );

  if (!filteredFiles.length) {
    return [];
  }

  const normalized = normalizeFiles(filteredFiles);
  const command = [bin, args, normalized.join(' ')].filter(Boolean).join(' ');

  return command.trim();
};

module.exports = {
  '**/*.{ts,tsx}': files =>
    buildCommand(
      'node',
      'scripts/typecheck-staged.js',
      files.filter(file => !file.endsWith('.d.ts'))
    ),

  '**/*.{ts,tsx,js,jsx}': files =>
    buildCommand(
      'npx eslint',
      '--fix --max-warnings=0',
      files,
      relative => relative.startsWith('src/') || relative.startsWith('tests/')
    ),

  '**/*.{ts,tsx,js,jsx,json,css,scss,md,yaml,yml}': files =>
    buildCommand('npx prettier', '--write', files),

  'src/components/**/*.{ts,tsx,js,jsx}': files =>
    buildCommand('npx vitest', 'related --run', files, relative =>
      relative.startsWith('src/components/')
    ),
};
