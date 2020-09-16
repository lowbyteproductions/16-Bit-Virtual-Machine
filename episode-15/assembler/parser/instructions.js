const A = require('arcsecond');
const F = require('./formats');
const {meta, instructionTypes} = require('../../instructions/meta');

const typeFormats = Object.entries(instructionTypes).reduce((table, [type, value]) => {
  table[value] = F[type];
  return table;
}, {});

const allInstructions = meta.map(instruction => {
  if (!(instruction.type in typeFormats)) {
    throw new Error('Unknown instruction format: ', instruction.type);
  }

  return typeFormats[instruction.type](instruction.mnemonic, instruction.instruction);
});

module.exports = A.choice(allInstructions);