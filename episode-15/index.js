const createMemory = require('./create-memory');
const CPU = require('./cpu');
const MemoryMapper = require('./memory-mapper.js');

const MM = new MemoryMapper();

const dataViewMethods = [
  'getUint8',
  'getUint16',
  'setUint8',
  'setUint16',
];
const createBankedMemory = (n, bankSize, cpu) => {
  const bankBuffers = Array.from({length: n}, () => new ArrayBuffer(bankSize));
  const banks = bankBuffers.map(ab => new DataView(ab));

  const forwardToDataView = name => (...args) => {
    const bankIndex = cpu.getRegister('mb') % n;
    const memoryBankToUse = banks[bankIndex];
    return memoryBankToUse[name](...args);
  };

  const interface = dataViewMethods.reduce((dvOut, fnName) => {
    dvOut[fnName] = forwardToDataView(fnName);
    return dvOut;
  }, {});

  return interface;
}

const bankSize = 0xff;
const nBanks = 8;
const cpu = new CPU(MM);

const memoryBankDevice = createBankedMemory(nBanks, bankSize, cpu);
MM.map(memoryBankDevice, 0, bankSize);

const regularMemory = createMemory(0xff01);
MM.map(regularMemory, bankSize, 0xffff, true);

// Setup the interupt vector
MM.setUint16(0x1000 + 0x00, 0x2000);
MM.setUint16(0x1000 + 0x02, 0x3000);

MM.load(0x2000, [
  // mov $42, r1
  0x10, 0x00, 0x42, 0x02,
  // mov $55, r2
  0x10, 0x00, 0x55, 0x03,
  // add r1, r2
  0x14, 0x02, 0x03,
  // rti
  0xfc
]);

MM.load(0x3000, [
  // mov $42, r1
  0x10, 0x00, 0x65, 0x02,
  // mov $55, r2
  0x10, 0x00, 0x22, 0x03,
  // xor r1, r2
  0x33, 0x02, 0x03,
  // rti
  0xfc
]);

MM.load(0x0000, [
  // mov $1, r1
  0x10, 0x00, 0x01, 0x02,
  // mov $2, r2
  0x10, 0x00, 0x02, 0x03,
  // mov $3, r3
  0x10, 0x00, 0x03, 0x04,
  // mov $4, r4
  0x10, 0x00, 0x04, 0x05,
  // psh $5
  0x17, 0x00, 0x05,
  // int $0
  0xfd, 0x00, 0x00,
  // pop r1
  0x1a, 0x02,
  // psh $6
  0x17, 0x00, 0x06,
  // psh $7
  0x17, 0x00, 0x07,
]);


while (1) {
  cpu.step();
  cpu.debug();
  cpu.viewMemoryAt(0xffff - 31, 16)
  cpu.viewMemoryAt(0xffff - 15, 16)
  console.clear();
}