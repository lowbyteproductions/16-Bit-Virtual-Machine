const {createRAM, createROM} = require('./create-memory');
const MemoryMapper = require('./memory-mapper.js');
const CPU = require('./cpu');
const assemble = require('./assembler');
const { Renderer, Tile } = require('./fantasy');

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

// Load background data
for (let i = 0; i < (32*16); i++) {
  const x = i % TILES_X;
  const y = Math.floor(i / TILES_X);

  if ((x+y) % 2 === 0) {
    MM.setUint8(BACKGROUND_OFFSET + i,  0xf);
  } else if ((x+y) % 3 === 0) {
    MM.setUint8(BACKGROUND_OFFSET + i, 0xa);
  } else {
    MM.setUint8(BACKGROUND_OFFSET + i, 0x4);
  }
}

const SPRITE_TABLE_OFFSET = 0x2020;

// Load some sprite data
MM.setUint16(SPRITE_TABLE_OFFSET + 0, 0); // X = 0
MM.setUint16(SPRITE_TABLE_OFFSET + 2, 32); // Y = middle
MM.setUint8(SPRITE_TABLE_OFFSET + 4, 6); // Use tile 4

MM.setUint16((16 * 1) + SPRITE_TABLE_OFFSET + 0, 64);
MM.setUint16((16 * 1) + SPRITE_TABLE_OFFSET + 2, 20);
MM.setUint8((16 * 1) + SPRITE_TABLE_OFFSET + 4, 8);

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
const [gameMachineCode, symbols] = assemble(`

start:

wait:
  mov [!wait], ip

after_frame:
  rti

`.trim(), CODE_OFFSET);

// Load the game code into RAM
// const [gameCode, symbols] = assemble(`

// structure Input {
//   Up: $1, Down: $1, Left: $1, Right: $1,
//   A: $1, B: $1,
//   Start: $1, Select: $1
// }

// structure Sprite {
//   x: $2, y: $2,
//   tile: $1,
//   animationOffset: $1
// }

// constant INPUT_OFFSET = $${INPUT_OFFSET.toString(16)}
// constant SPRITE_TABLE_OFFSET = $${SPRITE_TABLE_OFFSET.toString(16)}
// constant SPRITE_2 = $${(SPRITE_TABLE_OFFSET + 16).toString(16)}

// start:
// check_up:
//   mov8 &[ <Input> INPUT_OFFSET.Up ], acu
//   jne $1, &[!check_down]

//   mov &[ <Sprite> SPRITE_TABLE_OFFSET.y ], r1
//   sub $1, r1
//   and acu, $3F
//   mov acu, &[ <Sprite> SPRITE_TABLE_OFFSET.y ]
//   mov [!check_left], ip

// check_down:
//   mov8 &[ <Input> INPUT_OFFSET.Down ], acu
//   jne $1, &[!check_left]

//   mov &[ <Sprite> SPRITE_TABLE_OFFSET.y ], r1
//   inc r1
//   and r1, $3F
//   mov acu, &[ <Sprite> SPRITE_TABLE_OFFSET.y ]

// check_left:
//   mov8 &[ <Input> INPUT_OFFSET.Left ], acu
//   jne $1, &[!check_right]

//   mov &[ <Sprite> SPRITE_TABLE_OFFSET.x ], r1
//   dec r1
//   and r1, $7F
//   mov acu, &[ <Sprite> SPRITE_TABLE_OFFSET.x ]
//   mov [!update_other_sprites], ip

// check_right:
//   mov8 &[ <Input> INPUT_OFFSET.Right ], acu
//   jne $1, &[!wait]

//   mov &[ <Sprite> SPRITE_TABLE_OFFSET.x ], r1
//   inc r1
//   and r1, $7F
//   mov acu, &[ <Sprite> SPRITE_TABLE_OFFSET.x ]
//   mov [!update_other_sprites], ip

// update_other_sprites:
//   mov &[ <Sprite> SPRITE_2.x ], r1
//   inc r1
//   and r1, $7F
//   mov acu, &[ <Sprite> SPRITE_2.x ]

//   mov [!wait], ip

// wait:
//   mov [!wait], ip

// after_frame:
//   pop r1
//   psh [!start]
//   mov &[!frame_count], acu
//   inc acu
//   mov acu, &[!frame_count]
//   rti


// `.trim(), CODE_OFFSET);

// Load the game code
gameMachineCode.forEach((byte, i) => MM.setUint8(CODE_OFFSET + i, byte));

const INTERUPT_VECTOR_OFFSET = 0x2000;

// Register the reset vector and post frame code
MM.setUint16(INTERUPT_VECTOR_OFFSET, CODE_OFFSET);
MM.setUint16(INTERUPT_VECTOR_OFFSET + 2, symbols.after_frame);

// After everything is loaded, initialise the CPU
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

    // Latch input
    inputMemory.load(inputStates);
    for (let i = 0; i < inputStates.length; i++) {
      inputStates[i] = 0;
    }

    for (let i = 0; i < (32*16); i++) {
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

    for (let i = 0; i < (32*16); i++) {
      const x = i % TILES_X;
      const y = Math.floor(i / TILES_X);
      const tile = tileCache[ MM.getUint8(FOREGROUND_OFFSET + i) ];
      r.drawGridAlignedTile(x, y, tile);
    }

    // Call the after frame interrupt
    cpu.handleInterupt(1);
  }

  // Run game logic for a fixed number of ticks
  for (let i = 0; i < CYCLES_PER_ANIMATION_FRAME; i++) {
    cpu.step();
  }

  requestAnimationFrame(drawCallback);
};

drawCallback();
