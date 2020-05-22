const {inspect} = require('util');
const instructionsParser = require('./instructions');

const deepLog = x => console.log(inspect(x, {
  depth: Infinity,
  colors: true
}));


const res = instructionsParser.run('hlt');
deepLog(res);