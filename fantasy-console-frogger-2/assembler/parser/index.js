const A = require('arcsecond');
const instructionsParser = require('./instructions');
const structureParser = require('./structure');
const {data8, data16} = require('./data');
const constantParser = require('./constant');
const commentParser = require('./comment');
const {label} = require('./common');

module.exports = A.many (A.choice([
  data8,
  data16,
  constantParser,
  structureParser,
  instructionsParser,
  label,
  commentParser
])).chain(res => A.endOfInput.map(() => res));
