const A = require('arcsecond');
const {
  validIdentifier,
  hexLiteral,
  commaSeparated
} = require('./common');
const t = require('./types');

const keyValuePair = A.coroutine(function* () {
  yield A.optionalWhitespace;
  const key = yield validIdentifier;
  yield A.optionalWhitespace;
  yield A.char(':');
  yield A.optionalWhitespace;
  const value = yield hexLiteral;
  yield A.optionalWhitespace;

  return { key, value };
});

const structureParser = A.coroutine(function* () {
  const isExport = Boolean(yield A.possibly(A.char('+')));

  yield A.str('structure');
  yield A.whitespace;
  const name = yield validIdentifier;
  yield A.whitespace;
  yield A.char('{')
  yield A.whitespace;

  const members = yield commaSeparated(keyValuePair);

  yield A.optionalWhitespace;
  yield A.char('}');
  yield A.optionalWhitespace;

  return t.structure({
    isExport,
    name,
    members
  });
});

module.exports = structureParser;