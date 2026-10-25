import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

// Validate proposed files against the real project/dependencies without changing that checkout.
const original = path.resolve(process.argv[2] ?? 'D:/meus documentos/flick');
const staged = fileURLToPath(new URL('./files/', import.meta.url));
const overlay = new Map();
const overlayFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else {
      const target = path.resolve(original, path.relative(staged, file).replace(/\.txt$/, ''));
      overlayFiles.push(target);
      overlay.set(target.toLowerCase(), fs.readFileSync(file, 'utf8'));
    }
  }
};
walk(staged);
const configFile = ts.readConfigFile(path.join(original, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, original, { noEmit: true });
const host = ts.createCompilerHost(parsed.options);
const originalRead = host.readFile.bind(host);
const originalExists = host.fileExists.bind(host);
host.readFile = (file) => overlay.get(path.resolve(file).toLowerCase()) ?? originalRead(file);
host.fileExists = (file) => overlay.has(path.resolve(file).toLowerCase()) || originalExists(file);
const originalSource = host.getSourceFile.bind(host);
host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => {
  const content = overlay.get(path.resolve(file).toLowerCase());
  return content === undefined ? originalSource(file, languageVersion, onError, shouldCreateNewSourceFile) : ts.createSourceFile(file, content, languageVersion, true);
};
const files = [...new Map([...parsed.fileNames, ...overlayFiles.filter((file) => /\.[cm]?tsx?$/.test(file))].map((file) => [file.toLowerCase(), file])).values()];
const program = ts.createProgram(files, parsed.options, host);
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => original, getCanonicalFileName: (file) => file, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else console.log(`Claquete overlay: typecheck passou (${overlay.size} arquivos propostos; origem preservada).`);
