const A = require('arcsecond');
const {
  regReg,
  litReg,
  memReg,
  regMem,
  litMem,
  regPtrReg,
  litOffReg,
  noArgs,
  singleReg,
  singleLit,
} = require('./formats');

const mov = A.choice([
  regReg('mov', 'MOV_REG_REG'),
  litReg('mov', 'MOV_LIT_REG'),
  memReg('mov', 'MOV_MEM_REG'),
  regMem('mov', 'MOV_REG_MEM'),
  litMem('mov', 'MOV_LIT_MEM'),
  regPtrReg('mov', 'MOV_REG_PTR_REG'),
  litOffReg('mov', 'MOV_LIT_OFF_REG')
]);

const add = A.choice([
  regReg('add', 'ADD_REG_REG'),
  litReg('add', 'ADD_LIT_REG'),
]);

const sub = A.choice([
  regReg('sub', 'SUB_REG_REG'),
  litReg('sub', 'SUB_LIT_REG'),
]);

const mul = A.choice([
  regReg('mul', 'MUL_REG_REG'),
  litReg('mul', 'MUL_LIT_REG'),
]);

const lsf = A.choice([
  regReg('lsf', 'LSF_REG_REG'),
  litReg('lsf', 'LSF_LIT_REG'),
]);

const rsf = A.choice([
  regReg('rsf', 'RSF_REG_REG'),
  litReg('rsf', 'RSF_LIT_REG'),
]);

const and = A.choice([
  regReg('and', 'AND_REG_REG'),
  litReg('and', 'AND_LIT_REG'),
]);

const or = A.choice([
  regReg('or', 'OR_REG_REG'),
  litReg('or', 'OR_LIT_REG'),
]);

const xor = A.choice([
  regReg('xor', 'XOR_REG_REG'),
  litReg('xor', 'XOR_LIT_REG'),
]);

const inc = singleReg('inc', 'INC_REG');
const dec = singleReg('dec', 'DEC_REG');
const not = singleReg('not', 'NOT');

const jeq = A.choice([
  regMem('jeq', 'JEQ_REG'),
  litMem('jeq', 'JEQ_LIT'),
]);

const jne = A.choice([
  regMem('jne', 'JNE_REG'),
  litMem('jne', 'JMP_NOT_EQ'),
]);

const jlt = A.choice([
  regMem('jlt', 'JLT_REG'),
  litMem('jlt', 'JLT_LIT'),
]);

const jgt = A.choice([
  regMem('jgt', 'JGT_REG'),
  litMem('jgt', 'JGT_LIT'),
]);

const jle = A.choice([
  regMem('jle', 'JLE_REG'),
  litMem('jle', 'JLE_LIT'),
]);

const jge = A.choice([
  regMem('jge', 'JGE_REG'),
  litMem('jge', 'JGE_LIT'),
]);

const psh = A.choice([
  singleLit('psh', 'PSH_LIT'),
  singleReg('psh', 'PSH_REG'),
]);

const pop = singleReg('pop', 'POP_REG');

const cal = A.choice([
  singleLit('cal', 'CAL_LIT'),
  singleReg('cal', 'CAL_REG'),
]);

const ret = noArgs('ret', 'RET');
const hlt = noArgs('hlt', 'HLT');

module.exports = A.choice([
  mov,
  add,
  sub,
  inc,
  dec,
  mul,
  lsf,
  rsf,
  and,
  or,
  xor,
  not,
  jne,
  jeq,
  jlt,
  jgt,
  jle,
  jge,
  psh,
  pop,
  cal,
  ret,
  hlt,
]);