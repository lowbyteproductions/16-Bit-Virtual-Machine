const parser = require('./parser');
const instructions = require('../instructions');
const registers = require('../registers');
const {instructionTypes: I} = require('../instructions/meta');

const registerMap = registers.reduce((map, regName, index) => {
  map[regName] = index;
  return map;
}, {});

const assemble = (asmCode, offset = 0) => {
  const parsedOutput = parser.run(asmCode);

  if (parsedOutput.isError) {
    console.log(asmCode.slice(parsedOutput.index, parsedOutput.index + 100))
    throw new Error(parsedOutput.error);
  }

  // This can be used for debugging later
  const dissassembly = parsedOutput.result.map(x => {
    if (x.type === 'INSTRUCTION') {
      return [0, '\t' + x.value.instruction + ' ' + x.value.args.map(x => x.value).join(', '), x];
    }
    if (x.type === 'LABEL') {
      return [0, x.type + ' ' + x.value, x];
    }
    return null;
  });

  const machineCode = [];
  const symbolicNames = {};
  const structures = {};
  let currentAddress = offset;

  parsedOutput.result.forEach(node => {
    switch (node.type) {
      case 'LABEL': {
        if (node.value in symbolicNames || node.value in structures) {
          throw new Error(`Can't create label "${node.value}" because a binding with this name already exists.`);
        }
        symbolicNames[node.value] = currentAddress;
        break;
      }

      case 'STRUCTURE': {
        if (node.value.name in symbolicNames || node.value.name in structures) {
          throw new Error(`Can't create structure "${node.value.name}" because a binding with this name already exists.`);
        }

        structures[node.value.name] = {
          members: {}
        };

        let offset = 0;
        for (let {key, value} of node.value.members) {
          structures[node.value.name].members[key] = {
            offset,
            size: parseInt(value.value, 16) & 0xffff
          };
          offset += structures[node.value.name].members[key].size;
        }
        break;
      }

      case 'CONSTANT': {
        if (node.value.name in symbolicNames || node.value.name in structures) {
          throw new Error(
            `Can't create constant "${node.value.name}" because a binding` +
            ' with this name already exists.'
          );
        }
        symbolicNames[node.value.name] = parseInt(node.value.value.value, 16) & 0xffff;
        break;
      }

      case 'DATA': {
        if (node.value.name in symbolicNames || node.value.name in structures) {
          throw new Error(`Can't create data "${node.value.name}" because a binding with this name already exists.`);
        }
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

  const getNodeValue = node => {
    switch (node.type) {
      case 'VARIABLE': {
        if (!(node.value in symbolicNames)) {
          throw new Error(`label "${node.value}" wasn't resolved.`);
        }
        return symbolicNames[node.value];
      }

      case 'INTERPRET_AS': {
        const structure = structures[node.value.structure];

        if (!structure) {
          throw new Error(`structure "${node.value.structure}" wasn't resolved.`);
        }

        const member = structure.members[node.value.property];
        if (!member) {
          throw new Error(`property "${node.value.property}" in structure "${node.value.structure}" wasn't resolved.`);
        }

        if (!(node.value.symbol in symbolicNames)) {
          throw new Error(`symbol "${node.value.symbol}" wasn't resolved.`);
        }
        const symbol = symbolicNames[node.value.symbol];
        return symbol + member.offset;
      }

      case 'ADDRESS':
      case 'HEX_LITERAL': {
        return parseInt(node.value, 16);;
      }

      default: {
        throw new Error(`Unsupported node type: ${node.type}`);
      }
    }
  }

  const encodeLitOrMem = node => {
    const hexVal = getNodeValue(node);
    const highByte = (hexVal & 0xff00) >> 8;
    const lowByte  = hexVal & 0x00ff;
    machineCode.push(highByte, lowByte);
  };
  const encodeLit8 = node => {
    const hexVal = getNodeValue(node);
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

  parsedOutput.result.forEach((node, i) => {
    if (node.type === 'LABEL') {
      dissassembly[i][0] = symbolicNames[dissassembly[i][2].value];
    }

    if (node.type === 'LABEL' || node.type === 'CONSTANT' || node.type === 'STRUCTURE') {
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
      return;
    }

    if (I.regLit8 === metadata.type) {
      encodeReg(node.value.args[0]);
      encodeLit8(node.value.args[1]);
      return;
    }

    if ([I.regLit, I.regMem].includes(metadata.type)) {
      encodeReg(node.value.args[0]);
      encodeLitOrMem(node.value.args[1]);
      return;
    }

    if (I.litMem === metadata.type) {
      encodeLitOrMem(node.value.args[0]);
      encodeLitOrMem(node.value.args[1]);
      return;
    }

    if ([I.regReg, I.regPtrReg, I.regRegPtr].includes(metadata.type)) {
      encodeReg(node.value.args[0]);
      encodeReg(node.value.args[1]);
      return;
    }

    if (I.litOffReg === metadata.type) {
      encodeLitOrMem(node.value.args[0]);
      encodeReg(node.value.args[1]);
      encodeReg(node.value.args[2]);
      return;
    }

    if (I.singleReg === metadata.type) {
      encodeReg(node.value.args[0]);
      return;
    }

    if (I.singleLit === metadata.type) {
      encodeLitOrMem(node.value.args[0]);
      return;
    }

    if (I.litRegPtr === metadata.type) {
      encodeLitOrMem(node.value.args[0]);
      encodeReg(node.value.args[1]);
      return;
    }

    if (I.noArgs === metadata.type) {
      return;
    }

    debugger;
    throw new Error('Could not encode node');
  });

  console.log(dissassembly.map(d => {
    return !d ? '' : `0x${d[0].toString(16).padStart(4, '0')}: ${d[1]}`;
  }).join('\n'))

  return [machineCode, symbolicNames];
}

module.exports = assemble;
