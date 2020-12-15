const {createRAM, createROM} = require('./create-memory');
const CPU = require('./cpu');
const MemoryMapper = require('./memory-mapper.js');

const assemble = require('./assembler');

const {
  r,
  Drawing,
} = require('./fantasy');

const MM = new MemoryMapper();

const BACKGROUND_OFFSET = 0x2220;
const SPRITE_TABLE_OFFSET= 0x2020;
const CODE_OFFSET = 0x2670;
const INPUT_OFFSET = 0x2620;
const INTERUPT_VECTOR_OFFSET = 0x2000;

const tileMemory = createROM(0x2000);
const RAMSegment1 = createRAM(0x628);
const inputMemory = createROM(0x08);
const RAMSegment2 = createRAM(0xd9d7 + 1);

MM.map(tileMemory, 0, 0x2000 - 1);
MM.map(RAMSegment1, 0x2000, 0x2620 - 1);
MM.map(inputMemory, 0x2620, 0x2628 - 1);
MM.map(RAMSegment2, 0x2628, 0x10000);

const CYCLES_PER_ANIMATION_FRAME = 15;
const FPS_TARGET = 15;
const TIME_PER_FRAME = 1000 / FPS_TARGET;
const SCALE_FACTOR = 10;
const TILE_WIDTH = 32;
const TILE_HEIGHT = 16;

const fullColourTile = c => Array.from({length: 32}, () => (c << 4) | c);

const fullColourTiles = [];
for (let i = 0; i < 16; i++) {
  fullColourTiles.push(...fullColourTile(i));
}

const createTile = data => {
  const tileCanvas = document.createElement('canvas');
  tileCanvas.setAttribute('width', 8 * SCALE_FACTOR);
  tileCanvas.setAttribute('height', 8 * SCALE_FACTOR);
  const tileDrawing = new Drawing(tileCanvas);
  tileDrawing.cacheTile(data);

  return tileCanvas;
};

tileMemory.load(fullColourTiles);

// Load background data
for (let i = 0; i < (32*16); i++) {
  const x = i % TILE_WIDTH;
  const y = Math.floor(i / TILE_WIDTH);
  MM.setUint8(BACKGROUND_OFFSET + i, (x+y) % 2 === 0 ? 0xf : (x+y) % 3 === 0 ? 0xa : 0xb);
}

// Load some sprite data
MM.setUint16(SPRITE_TABLE_OFFSET + 0, 0); // X = 0
MM.setUint16(SPRITE_TABLE_OFFSET + 2, TILE_HEIGHT * 3 + TILE_HEIGHT/2); // Y = middle
MM.setUint8(SPRITE_TABLE_OFFSET + 4, 6); // Use tile 4

MM.setUint16((16 * 1) + SPRITE_TABLE_OFFSET + 0, 64);
MM.setUint16((16 * 1) + SPRITE_TABLE_OFFSET + 2, 20);
MM.setUint8((16 * 1) + SPRITE_TABLE_OFFSET + 4, 8);

// Load the game code into RAM
const [gameCode, symbols] = assemble(`

structure Input {
  Up: $1, Down: $1, Left: $1, Right: $1,
  A: $1, B: $1,
  Start: $1, Select: $1
}

structure Sprite {
  x: $2, y: $2,
  tile: $1,
  animationOffset: $1
}

constant INPUT_OFFSET = $${INPUT_OFFSET.toString(16)}
constant SPRITE_TABLE_OFFSET = $${SPRITE_TABLE_OFFSET.toString(16)}
constant SPRITE_2 = $${(SPRITE_TABLE_OFFSET + 16).toString(16)}

start:
check_up:
  mov8 &[ <Input> INPUT_OFFSET.Up ], acu
  jne $1, &[!check_down]

  mov &[ <Sprite> SPRITE_TABLE_OFFSET.y ], r1
  sub $1, r1
  and acu, $3F
  mov acu, &[ <Sprite> SPRITE_TABLE_OFFSET.y ]
  mov [!check_left], ip

check_down:
  mov8 &[ <Input> INPUT_OFFSET.Down ], acu
  jne $1, &[!check_left]

  mov &[ <Sprite> SPRITE_TABLE_OFFSET.y ], r1
  inc r1
  and r1, $3F
  mov acu, &[ <Sprite> SPRITE_TABLE_OFFSET.y ]

check_left:
  mov8 &[ <Input> INPUT_OFFSET.Left ], acu
  jne $1, &[!check_right]

  mov &[ <Sprite> SPRITE_TABLE_OFFSET.x ], r1
  dec r1
  and r1, $7F
  mov acu, &[ <Sprite> SPRITE_TABLE_OFFSET.x ]
  mov [!update_other_sprites], ip

check_right:
  mov8 &[ <Input> INPUT_OFFSET.Right ], acu
  jne $1, &[!wait]

  mov &[ <Sprite> SPRITE_TABLE_OFFSET.x ], r1
  inc r1
  and r1, $7F
  mov acu, &[ <Sprite> SPRITE_TABLE_OFFSET.x ]
  mov [!update_other_sprites], ip

update_other_sprites:
  mov &[ <Sprite> SPRITE_2.x ], r1
  inc r1
  and r1, $7F
  mov acu, &[ <Sprite> SPRITE_2.x ]

  mov [!wait], ip

wait:
  mov [!wait], ip

after_frame:
  pop r1
  psh [!start]
  mov &[!frame_count], acu
  inc acu
  mov acu, &[!frame_count]
  rti

code_end:

data16 frame_count = { $0000 }

`.trim(), CODE_OFFSET);

// Register the reset vector and post frame code
MM.setUint16(INTERUPT_VECTOR_OFFSET, CODE_OFFSET);
MM.setUint16(INTERUPT_VECTOR_OFFSET + 2, symbols.after_frame);

// Load the game code
gameCode.forEach((byte, i) => MM.setUint8(CODE_OFFSET + i, byte));

// After everything is loaded, initialise the CPU
const cpu = new CPU(MM, INTERUPT_VECTOR_OFFSET);


const tileCache = [];
for (let i = 0; i < 0x2000; i += 32) {
  tileCache.push(createTile(tileMemory.slice(i, i+32)));
}

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

inputMemory.load([1]);


let last = Date.now();
const drawCallback = () => {
  const now = Date.now();
  const diff = now - last;
  if (diff > TIME_PER_FRAME) {
    last = now;

    // Latch input
    inputMemory.load(inputStates);
    for (let i = 0; i < inputStates.length; i++) {
      inputStates[i] = 0;
    }

    for (let i = 0; i < (32*16); i++) {
      const x = i % TILE_WIDTH;
      const y = Math.floor(i / TILE_WIDTH);
      const tile = tileCache[ MM.getUint8(BACKGROUND_OFFSET + i) ];
      r.d.drawGridAlignedTile(x, y, tile);
    }

    for (let i = 0; i < 32; i++) {
      const x = MM.getUint16(SPRITE_TABLE_OFFSET + (i * 16) + 0);
      const y = MM.getUint16(SPRITE_TABLE_OFFSET + (i * 16) + 2);
      const tile = MM.getUint8(SPRITE_TABLE_OFFSET + (i * 16) + 4);
      r.d.drawPixelAlignedTile(x, y, tileCache[tile]);
    }

    // Call the after frame interrupt
    cpu.handleInterupt(1);
  } else {
    for (let i = 0; i < CYCLES_PER_ANIMATION_FRAME; i++) {
      cpu.step();
    }
  }

  requestAnimationFrame(drawCallback);
};

drawCallback();

// const n = 1000;
// const samples = new Array(n);
// for (let i = 0; i < n; i++) {
//   samples[i] = Date.now();
//   cpu.step();
// }

// console.log(samples);
// console.log(samples[samples.length-1] - samples[0]); 