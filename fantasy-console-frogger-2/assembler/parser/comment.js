const A = require('arcsecond');
const t = require('./types');

const bytesToString = bytes => bytes.map(byte => String.fromCharCode(byte)).join('');

const commentParser = A.coroutine(function* () {
  yield A.optionalWhitespace;
  yield A.char(';');
  const value = yield A.everythingUntil(A.char('\n'))
    .map(bytesToString);
  yield A.optionalWhitespace;

  return t.comment({ value });
});

module.exports = commentParser;
