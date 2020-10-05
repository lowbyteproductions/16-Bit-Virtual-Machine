const {meta} = require('./meta');

const indexBy = (array, prop) => array.reduce((output, item) => {
  output[item[prop]] = item;
  return output;
}, {});

module.exports = indexBy(meta, 'instruction');
