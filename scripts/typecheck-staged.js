#!/usr/bin/env node
const path = require('path');
const ts = require('typescript');

const projectPath = path.resolve(process.cwd(), 'tsconfig.json');

const formatHost = {
  getCanonicalFileName: fileName => fileName,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

const reportDiagnostics = diagnostics => {
  diagnostics.forEach(diagnostic => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      formatHost.getNewLine()
    );

    if (diagnostic.file && typeof diagnostic.start === 'number') {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      );
      const relativeFile = path.relative(
        process.cwd(),
        diagnostic.file.fileName
      );
      console.error(
        `${relativeFile}:${line + 1}:${character + 1} - error TS${diagnostic.code}: ${message}`
      );
    } else {
      console.error(`TS${diagnostic.code}: ${message}`);
    }
  });
};

const configFile = ts.readConfigFile(projectPath, ts.sys.readFile);

if (configFile.error) {
  reportDiagnostics([configFile.error]);
  process.exit(1);
}

const parseConfigHost = {
  fileExists: ts.sys.fileExists,
  readDirectory: ts.sys.readDirectory,
  readFile: ts.sys.readFile,
  useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
};

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  parseConfigHost,
  path.dirname(projectPath),
  undefined,
  projectPath
);

const inputFiles = Array.from(
  new Set(
    process.argv
      .slice(2)
      .map(file => path.resolve(process.cwd(), file))
      .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
  )
);

const supportFiles = parsedConfig.fileNames.filter(
  file => file.endsWith('.d.ts') || file.includes(`${path.sep}types${path.sep}`)
);

const rootNames = Array.from(new Set([...supportFiles, ...inputFiles]));

if (!inputFiles.length) {
  process.exit(0);
}

const compilerOptions = {
  ...parsedConfig.options,
  noEmit: true,
  configFilePath: projectPath,
};

const program = ts.createProgram({
  rootNames,
  options: compilerOptions,
  projectReferences: parsedConfig.projectReferences,
});

const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length > 0) {
  reportDiagnostics(diagnostics);
  process.exit(1);
}
