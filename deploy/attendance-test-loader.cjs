const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function loadSource(relative, pb) {
  const cache = new Map();
  const load = file => {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = readFileSync(file, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true } }).outputText;
    const localRequire = name => {
      if (name.includes('core/pocketbase')) return { __esModule: true, default: pb };
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
      return require(name);
    };
    vm.runInNewContext(code, { exports, require: localRequire, Map, Set, Error }, { filename: file });
    return exports;
  };
  return load(path.resolve(__dirname, '../src/modules/asistencias', relative));
}

module.exports = { loadSource };
