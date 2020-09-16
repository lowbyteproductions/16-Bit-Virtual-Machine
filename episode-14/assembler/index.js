const parser = require('./parser');
const instructions = require('../instructions');
const registers = require('../registers');
const {instructionTypes: I} = require('../instructions/meta');

const registerMap = registers.reduce((map, regName, index) => {
  map[regName] = index;
  return map;
}, {});

const exampleProgram = `

constant code_constant = $C0DE

+data8 bytes = { $01,   $02,   $03,   $04   }
data16 words = { $0506, $0708, $090A, $0B0C }

code:
  mov [!code_constant], &1234

`.trim();

const parsedOutput = parser.run(exampleProgram);

if (parsedOutput.isError) {
  throw new Error(parsedOutput.error);
}

const machineCode = [];
const symbolicNames = {};
let currentAddress = 0;

// resolve the labels
parsedOutput.result.forEach(node => {
  switch (node.type) {
    case 'LABEL': {
      symbolicNames[node.value] = currentAddress;
      break;
    }

    case 'CONSTANT': {
      symbolicNames[node.value.name] = parseInt(node.value.value.value, 16) & 0xffff;
      break;
    }

    case 'DATA': {
      // record the address in the label table
      symbolicNames[node.value.name] = currentAddress;

      // calculate the next offset based on the size of the data
      const sizeOfEachValueInBytes = node.value.size === 16 ? 2 : 1;
      const totalSizeOfDataInBytes = node.value.values.length * sizeOfEachValueInBytes;
      currentAddress += totalSizeOfDataInBytes;
      break;
    }

    default: {
      const metadata = instructions[node.value.instruction];
      currentAddress += metadata.size;
      break;
    }
  }
});

const encodeLitOrMem = lit => {
  let hexVal;

  // Assume that variables are labels for now
  if (lit.type === 'VARIABLE') {
    if (!(lit.value in symbolicNames)) {
      throw new Error(`label "${lit.value}" wasn't resolved.`);
    }
    hexVal = symbolicNames[lit.value];
  } else {
    hexVal = parseInt(lit.value, 16);
  }

  const highByte = (hexVal & 0xff00) >> 8;
  const lowByte  = hexVal & 0x00ff;
  machineCode.push(highByte, lowByte);
};
const encodeLit8 = lit => {
  let hexVal;

  // Assume that variables are labels for now
  if (lit.type === 'VARIABLE') {
    hexVal = symbolicNames[lit.value];
  } else {
    hexVal = parseInt(lit.value, 16);
  }

  const lowByte  = hexVal & 0xff;
  machineCode.push(lowByte);
};
const encodeReg = reg => {
  const mappedReg = registerMap[reg.value];
  machineCode.push(mappedReg);
};
const encodeData8 = node => {
  for (let byte of node.value.values) {
    const parsed = parseInt(byte.value, 16);
    machineCode.push(parsed & 0xff);
  }
}
const encodeData16 = node => {
  for (let byte of node.value.values) {
    const parsed = parseInt(byte.value, 16);
    machineCode.push((parsed & 0xff00) >> 8);
    machineCode.push(parsed & 0x00ff);
  }
}

parsedOutput.result.forEach(node => {
  if (node.type === 'LABEL' || node.type === 'CONSTANT') {
    return;
  }

  // encode data
  if (node.type === 'DATA') {
    if (node.value.size === 8) {
      encodeData8(node);
    } else {
      encodeData16(node);
    }
    return;
  }

  const metadata = instructions[node.value.instruction];
  machineCode.push(metadata.opcode);

  if ([I.litReg, I.memReg].includes(metadata.type)) {
    encodeLitOrMem(node.value.args[0]);
    encodeReg(node.value.args[1]);
  }

  if (I.regLit8 === metadata.type) {
    encodeReg(node.value.args[0]);
    encodeLit8(node.value.args[1]);
  }

  if ([I.regLit, I.regMem].includes(metadata.type)) {
    encodeReg(node.value.args[0]);
    encodeLitOrMem(node.value.args[1]);
  }

  if (I.litMem === metadata.type) {
    encodeLitOrMem(node.value.args[0]);
    encodeLitOrMem(node.value.args[1]);
  }

  if ([I.regReg, I.regPtrReg].includes(metadata.type)) {
    encodeReg(node.value.args[0]);
    encodeReg(node.value.args[1]);
  }

  if (I.litOffReg === metadata.type) {
    encodeLitOrMem(node.value.args[0]);
    encodeReg(node.value.args[1]);
    encodeReg(node.value.args[2]);
  }

  if (I.singleReg === metadata.type) {
    encodeReg(node.value.args[0]);
  }

  if (I.singleLit === metadata.type) {
    encodeLitOrMem(node.value.args[0]);
  }
});

console.log(machineCode.map(x => '0x' + x.toString(16).padStart(2, '0')).join(', '));
