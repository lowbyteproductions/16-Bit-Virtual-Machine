const A = require('arcsecond');
const T = require('./types');
const { mapJoin } = require('./util');

const upperOrLowerStr = s => A.choice([
  A.str(s.toUpperCase()),
  A.str(s.toLowerCase())
]);

const register = A.choice([
  upperOrLowerStr('r1'),
  upperOrLowerStr('r2'),
  upperOrLowerStr('r3'),
  upperOrLowerStr('r4'),
  upperOrLowerStr('r5'),
  upperOrLowerStr('r6'),
  upperOrLowerStr('r7'),
  upperOrLowerStr('r8'),
  upperOrLowerStr('sp'),
  upperOrLowerStr('fp'),
  upperOrLowerStr('ip'),
  upperOrLowerStr('acc'),
]).map(T.register);

const hexDigit = A.regex(/^[0-9A-Fa-f]/);
const hexLiteral = A.char('$')
  .chain(() => mapJoin(A.many1(hexDigit)))
  .map(T.hexLiteral);

const address = A.char('&')
  .chain(() => mapJoin(A.many1(hexDigit)))
  .map(T.address);

const validIdentifier = mapJoin(A.sequenceOf([
  A.regex(/^[a-zA-Z_]/),
  A.possibly(A.regex(/^[a-zA-Z0-9_]+/)).map(x => x === null ? '' : x)
]));
const variable = A.char('!')
  .chain(() => validIdentifier)
  .map(T.variable);

const label = A.sequenceOf([
  validIdentifier,
  A.char(':'),
  A.optionalWhitespace
]).map(([labelName]) => labelName).map(T.label);

const operator = A.choice([
  A.char('+').map(T.opPlus),
  A.char('-').map(T.opMinus),
  A.char('*').map(T.opMultiply),
]);

const peek = A.lookAhead(A.regex(/^./));


module.exports = {
  register,
  hexLiteral,
  address,
  validIdentifier,
  variable,
  operator,
  upperOrLowerStr,
  peek,
  label
};
