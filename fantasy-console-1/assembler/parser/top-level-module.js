const A = require('arcsecond');
const { validIdentifier, hexLiteral, optionalWhitespaceSurrounded, commaSeparated } = require('./common');
const t = require('./types');

const keyword = kw => A.str(kw).chain(() => A.whitespace).map(() => kw);

const stringLiteral = A.coroutine(function* () {
  yield A.char('"');

  const chars = yield A.many(A.choice([
    A.str('\\"'),
    A.anyCharExcept(A.char('"')),
  ]));

  yield A.char('"');

  return chars.join('');
});

const moduleExportPath = A.coroutine(function* () {
  yield optionalWhitespaceSurrounded(A.char('['));

  const parts = [];
  while (true) {
    const pathPart = yield validIdentifier;
    const possibleDot = yield A.possibly(A.char('.'));
    if (!possibleDot) {
      break;
    }
    parts.push(pathPart);
  }

  yield optionalWhitespaceSurrounded(A.char(']'));

  return t.moduleExportPath(parts.join('.'));
});

const injectionEntry = A.coroutine(function* () {
  const name = yield optionalWhitespaceSurrounded(validIdentifier);
  yield optionalWhitespaceSurrounded(A.char(':'));
  const value = yield A.choice([
    hexLiteral,
    moduleExportPath
  ]);
  yield A.optionalWhitespace;

  return { name, value };
});

const injections = A.coroutine(function* () {
  yield A.optionalWhitespace;

  yield A.char('{');
  const values = yield commaSeparated(injectionEntry);
  yield A.char('}');

  return values;
});

const importDeclaration = A.coroutine(function* () {
  yield A.optionalWhitespace;
  yield keyword('import');

  const name = yield validIdentifier;
  yield A.whitespace;

  const targetAddress = yield hexLiteral;
  yield A.whitespace;

  const path = yield stringLiteral;
  yield A.whitespace;

  const injectionValues = yield injections;

  return t.importDeclaration({
    name,
    targetAddress,
    path,
    injectionValues
  });
});

const topLevelModule = A.coroutine(function* () {
  yield A.optionalWhitespace;

  yield keyword('module');

  const name = yield validIdentifier;
  yield A.whitespace;

  const imports = [];
  while (true) {
    const importDecl = yield A.possibly(importDeclaration);
    if (!importDecl) {
      break;
    }
    imports.push(importDecl);

    const ws = yield A.possibly(A.whitespace);
    if (!ws) {
      break;
    }
  }

  return t.topLevelModule({
    name,
    imports
  });
});

module.exports = topLevelModule;
