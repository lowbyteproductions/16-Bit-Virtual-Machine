const A = require('arcsecond');
const instructionsParser = require('./instructions');
const {label} = require('./common');

module.exports = A.many (A.choice([
  instructionsParser,
  label
])).chain(res => A.endOfInput.map(() => res));
