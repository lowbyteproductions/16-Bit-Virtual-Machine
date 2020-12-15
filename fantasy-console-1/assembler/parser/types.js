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
const data = asType('DATA');
const structure = asType('STRUCTURE');
const constant = asType('CONSTANT');
const interpretAs = asType('INTERPRET_AS');
const moduleExportPath = asType('MODULE_EXPORT_PATH');
const importDeclaration = asType('IMPORT_DECLARATION');
const topLevelModule = asType('TOP_LEVEL_MODULE');

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
  label,
  data,
  structure,
  constant,
  interpretAs,
  moduleExportPath,
  importDeclaration,
  topLevelModule,
};
