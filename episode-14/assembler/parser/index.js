const A = require('arcsecond');
const instructionsParser = require('./instructions');
const {data8, data16} = require('./data');
const constantParser = require('./constant');
const {label} = require('./common');

module.exports = A.many (A.choice([
  data8,
  data16,
  constantParser,
  instructionsParser,
  label
])).chain(res => A.endOfInput.map(() => res));
