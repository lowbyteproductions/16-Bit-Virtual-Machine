const {createRAM, createROM} = require('./create-memory');
const MemoryMapper = require('./memory-mapper.js');
const { Renderer, Tile } = require('./fantasy');
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
const tiles = [];
for (let i = 0; i < 16; i++) {
  tiles.push(...fullColourTile(i));
}
tiles.push(
  0xff, 0xff, 0xff, 0xff,
  0xf0, 0x00, 0x00, 0x0f,
  0xf0, 0x00, 0x00, 0x0f,
  0xf0, 0x00, 0x00, 0x0f,
  0xf0, 0x00, 0x00, 0x0f,
  0xf0, 0x00, 0x00, 0x0f,
  0xf0, 0x00, 0x00, 0x0f,
  0xff, 0xff, 0xff, 0xff,
);
tileMemory.load(tiles);

const BACKGROUND_OFFSET = 0x2220;
const FOREGROUND_OFFSET = 0x2420;
const TILES_X = 32;
const TILES_Y = 16;

for (let i = 0; i < (TILES_X * TILES_Y); i++) {
  MM.setUint8(BACKGROUND_OFFSET + i,  0x10);
}

const SPRITE_TABLE_OFFSET = 0x2020;

const frog = SPRITE_TABLE_OFFSET;

MM.setUint16(frog + 0, 14 * 8);
MM.setUint16(frog + 2, 13 * 8);
MM.setUint8(frog + 4, 0xb);

const cars = frog + 16;

MM.setUint16(cars + 0, 0);
MM.setUint16(cars + 2, 11 * 8);
MM.setUint8(cars + 4, 0x7);
MM.setUint16(cars + 9, 2);

MM.setUint16(cars + 16 + 0, 29 * 8);
MM.setUint16(cars + 16 + 2, 10 * 8);
MM.setUint8(cars + 16 + 4, 0x7);
MM.setUint16(cars + 16 + 9, (~2 & 0xffff) + 1);


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

document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp': {
      inputStates[0] = 1;
      return;
    }
    case 'ArrowDown': {
      inputStates[1] = 1;
      return;
    }
    case 'ArrowLeft': {
      inputStates[2] = 1;
      return;
    }
    case 'ArrowRight': {
      inputStates[3] = 1;
      return;
    }
    case 'a': {
      inputStates[4] = 1;
      return;
    }
    case 's': {
      inputStates[5] = 1;
      return;
    }
    case ' ': {
      inputStates[6] = 1;
      return;
    }
    case 'Enter': {
      inputStates[7] = 1;
      return;
    }
  }
});

const tileCache = [];
for (let i = 0; i < TILE_MEMORY_SIZE; i += 32) {
  tileCache.push(new Tile(tileMemory.slice(i, i+32)));
}

const CODE_OFFSET = 0x2668;
const [gameMachineCode, symbols] = assemble(frogger({
  frog,
  input: INPUT_OFFSET,
  cars
}), CODE_OFFSET);

gameMachineCode.forEach((byte, i) => MM.setUint8(CODE_OFFSET + i, byte));

const INTERUPT_VECTOR_OFFSET = 0x2000;

MM.setUint16(INTERUPT_VECTOR_OFFSET, CODE_OFFSET);
MM.setUint16(INTERUPT_VECTOR_OFFSET + 2, symbols.after_frame);

const cpu = new CPU(MM, INTERUPT_VECTOR_OFFSET);

const FPS_TARGET = 30;
const TIME_PER_FRAME_MS = 1000 / FPS_TARGET;
const CYCLES_PER_ANIMATION_FRAME = 200;

const r = new Renderer(document.getElementById('screen'));

let last = Date.now();

const drawCallback = () => {
  const now = Date.now();
  const diff = now - last;
  if (diff > TIME_PER_FRAME_MS) {
    last = now;

    inputMemory.load(inputStates);
    for (let i = 0; i < inputStates.length; i++) {
      inputStates[i] = 0;
    }

    r.clear();

    for (let i = 0; i < (TILES_X * TILES_Y); i++) {
      const x = i % TILES_X;
      const y = Math.floor(i / TILES_X);
      const tile = tileCache[ MM.getUint8(BACKGROUND_OFFSET + i) ];
      r.drawGridAlignedTile(x, y, tile);
    }

    for (let i = 0; i < 32; i++) {
      const spriteBase = SPRITE_TABLE_OFFSET + (i * 16);
      const x = MM.getUint16(spriteBase + 0);
      const y = MM.getUint16(spriteBase + 2);
      const tile = MM.getUint8(spriteBase + 4) + MM.getUint8(spriteBase + 5);
      r.drawPixelAlignedTile(x, y, tileCache[tile]);
    }

    for (let i = 0; i < (TILES_X * TILES_Y); i++) {
      const x = i % TILES_X;
      const y = Math.floor(i / TILES_X);
      const tile = tileCache[ MM.getUint8(FOREGROUND_OFFSET + i) ];
      r.drawGridAlignedTile(x, y, tile);
    }

    cpu.handleInterupt(1);
  }

  for (let i = 0; i < CYCLES_PER_ANIMATION_FRAME; i++) {
    cpu.step();
  }

  requestAnimationFrame(drawCallback);
};

drawCallback();