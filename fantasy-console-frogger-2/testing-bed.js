const {createRAM, createROM} = require('./create-memory');
const MemoryMapper = require('./memory-mapper.js');
const CPU = require('./cpu');
const assemble = require('./assembler');

const frogger = require('./frogger');

const TILE_MEMORY_SIZE  = 0x2000;
const RAM1_SIZE         = 0x20 + 0x200 + 0x200 + 0x200;
const INPUT_SIZE        = 0x8;
const RAM2_SIZE         = 0x10000 - TILE_MEMORY_SIZE - RAM1_SIZE - INPUT_SIZE;

const tileMemory  = createROM(TILE_MEMORY_SIZE);
const RAMSegment1 = createRAM(RAM1_SIZE);
const inputMemory = createROM(INPUT_SIZE);
const RAMSegment2 = createRAM(RAM2_SIZE);

const MM = new MemoryMapper();
MM.map(tileMemory,  0x0000, TILE_MEMORY_SIZE);
MM.map(RAMSegment1, 0x2000, RAM1_SIZE);
MM.map(inputMemory, 0x2620, INPUT_SIZE);
MM.map(RAMSegment2, 0x2628, RAM2_SIZE);

const fullColourTile = c => Array.from({length: 32}, () => (c << 4) | c);
const fullColourTiles = [];
for (let i = 0; i < 16; i++) {
  fullColourTiles.push(...fullColourTile(i));
}
tileMemory.load(fullColourTiles);

const BACKGROUND_OFFSET = 0x2220;
const FOREGROUND_OFFSET = 0x2420;
const TILES_X = 32;
const TILES_Y = 16;

for (let i = 0; i < (TILES_X * TILES_Y); i++) {
  const x = i % TILES_X;
  const y = Math.floor(i / TILES_X);

  if ((x+y) % 2 === 0) {
    MM.setUint8(BACKGROUND_OFFSET + i,  0xf);
  } else {
    MM.setUint8(BACKGROUND_OFFSET + i, 0x1);
  }
}

const SPRITE_TABLE_OFFSET = 0x2020;
const XPOS = 0;
const YPOS = 2;
const TILEPOS = 4;

const frog = SPRITE_TABLE_OFFSET;

MM.setUint16(frog + XPOS,     120);
MM.setUint16(frog + YPOS,     112 - 8);
MM.setUint8(frog  + TILEPOS,  0xb);

const car0 = frog + 16;
const car1 = car0 + 16;
const CAR_SPEED = 0x7;

MM.setUint16(car0 + XPOS,         0);
MM.setUint16(car0 + YPOS,         112 - (8 * 3));
MM.setUint8(car0  + TILEPOS,      0x6);
MM.setUint16(car0  + CAR_SPEED,   2);

MM.setUint16(car1 + XPOS,         20*8);
MM.setUint16(car1 + YPOS,         112 - (8 * 4));
MM.setUint8(car1  + TILEPOS,      0x6);
MM.setUint16(car1  + CAR_SPEED,   (~2 & 0xffff) + 1);

const INPUT_OFFSET = 0x2620;

const inputStates = [
  0, /* UP */
  0, /* DOWN */
  0, /* LEFT */
  0, /* RIGHT */
  0, /* A */
  0, /* B */
  0, /* START */
  0, /* SELECT */
];

const CODE_OFFSET = 0x2668;
const [gameMachineCode, symbols] = assemble(frogger({
  frog,
  input: INPUT_OFFSET,
  cars: {
    addresses: [car0],
    speed: CAR_SPEED
  }
}), CODE_OFFSET);

gameMachineCode.forEach((byte, i) => MM.setUint8(CODE_OFFSET + i, byte));

const INTERUPT_VECTOR_OFFSET = 0x2000;

MM.setUint16(INTERUPT_VECTOR_OFFSET, CODE_OFFSET);
MM.setUint16(INTERUPT_VECTOR_OFFSET + 2, symbols.after_frame);

const cpu = new CPU(MM, INTERUPT_VECTOR_OFFSET);
cpu.debugMode = true;

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const parseCommand = (commandType, line) => {
  const [_, type, arg] = line.split(' ').map(a => a.trim());

  let address;
  if (type === 'symbol' || type === 's') {
    const symbolName = arg;
    if (!symbolName) {
      console.log('bad symbol name');
      return;
    }
    if (!(symbolName in symbols)) {
      console.log(`no known symbol "${symbolName}"`);
      return;
    }
    if (typeof symbols[symbolName] !== 'number') {
      console.log(`"${symbolName}" is not a label`);
      return;
    }

    address = symbols[symbolName];
  } else if (type === 'hex' || type === 'h') {
    address = parseInt(arg, 16);
  } else {
    console.log(`unrecognised ${commandType} format.`);
    return;
  }

  return address;
};

const isCommandType = (type, shortName, line) => {
  return line.startsWith(type) || line.startsWith(`${shortName} `) || line === shortName;
}

rl.on('line', line => {
  if (isCommandType('print', 'p', line)) {
    cpu.debug();
    return;
  }

  if (isCommandType('symbols', 'sym', line)) {
    Object.entries(symbols).forEach(([key, value]) => {
      console.log(`${key}:\t0x${value.toString(16).padStart(4, '0')}`);
    })
    return;
  }

  if (isCommandType('break', 'b', line)) {
    const address = parseCommand('break', line);

    if (typeof address !== 'number') {
      return;
    }

    while (cpu.getRegister('ip') !== address) {
      cpu.step();
    }
    console.log('--> break')
    return;
  }

  if (isCommandType('view', 'v', line)) {
    const address = parseCommand('view', line);

    if (typeof address !== 'number') {
      return;
    }

    const value = cpu.memory.getUint16(address);
    console.log(`0x${address.toString(16).padStart(4, 0)}: 0x${value.toString(16).padStart(4, 0)} (${value})`);
  }

  if (isCommandType('step', 's', line)) {
    cpu.step();
  }
});