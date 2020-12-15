const A = require('arcsecond');
const {
  validIdentifier,
  hexLiteral,
} = require('./common');
const t = require('./types');

const constantParser = A.coroutine(function* () {
  const isExport = Boolean(yield A.possibly(A.char('+')));
  yield A.str('constant');
  yield A.whitespace;
  const name = yield validIdentifier;
  yield A.whitespace;
  yield A.char('=');
  yield A.whitespace;
  const value = yield hexLiteral;
  yield A.optionalWhitespace;

  return t.constant({
    isExport,
    name,
    value
  });
});

module.exports = constantParser;
