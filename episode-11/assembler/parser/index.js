const A = require('arcsecond');
const instructionsParser = require('./instructions');
const {label} = require('./common');

module.exports = A.many (A.choice([
  instructionsParser,
  label
]));

// const Peek = new A.Parser(state => {
//   debugger;
//   return statel
// })

// module.exports = A.coroutine(function* () {

//   const res = yield Peek;
//   debugger;
// });