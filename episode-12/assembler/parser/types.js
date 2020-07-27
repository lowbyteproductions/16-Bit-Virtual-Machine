const { asType } = require('./util');

const register = asType('REGISTER');
const hexLiteral = asType('HEX_LITERAL');
const address = asType('ADDRESS');
const variable = asType('VARIABLE');

const opPlus = asType('OP_PLUS');
const opMinus = asType('OP_MINUS');
const opMultiply = asType('OP_MULTIPLY');

const binaryOperation = asType('BINARY_OPERATION');
const bracketedExpression = asType('BRACKETED_EXPRESSION');
const squareBracketExpression = asType('SQUARE_BRACKET_EXPRESSION');

const instruction = asType('INSTRUCTION');
const label = asType('LABEL');

module.exports = {
  register,
  hexLiteral,
  variable,
  address,
  opPlus,
  opMinus,
  opMultiply,
  binaryOperation,
  bracketedExpression,
  squareBracketExpression,
  instruction,
  label
};
