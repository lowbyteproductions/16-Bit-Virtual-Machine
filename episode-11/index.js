const createMemory = require('./create-memory');
const CPU = require('./cpu');
const MemoryMapper = require('./memory-mapper.js');

const MM = new MemoryMapper();

const memory = createMemory(256*256);
MM.map(memory, 0, 0xffff);

const cpu = new CPU(MM);
cpu.run();
