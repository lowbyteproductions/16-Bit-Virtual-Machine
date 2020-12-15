const colours = [
  [0x00, 0x00, 0x00, 0],
  [0xff, 0xff, 0xff, 1],
  [0x3c, 0xbc, 0xfc, 1],
  [0x68, 0x88, 0xfc, 1],
  [0x98, 0x78, 0xf8, 1],
  [0xf8, 0x78, 0xf8, 1],
  [0xf8, 0x58, 0x98, 1],
  [0xf8, 0x78, 0x58, 1],
  [0xfc, 0xa0, 0x44, 1],
  [0xf8, 0xb8, 0x00, 1],
  [0xb8, 0xf8, 0x18, 1],
  [0x58, 0xd8, 0x54, 1],
  [0x58, 0xf8, 0x98, 1],
  [0x32, 0x32, 0x32, 1],
  [0x78, 0x78, 0x78, 1],
  [0x00, 0x00, 0x00, 1],
];

const TILE_WIDTH = 30;
const TILE_HEIGHT = 14;
const PIXELS_PER_TILE = 8;
const SCALE_FACTOR = 6;

const w = TILE_WIDTH * PIXELS_PER_TILE * SCALE_FACTOR;
const h = TILE_HEIGHT * PIXELS_PER_TILE * SCALE_FACTOR;

const canvas = document.getElementById('screen');
canvas.width = w;
canvas.height = h;

const ctx = canvas.getContext('2d');

// ctx.fillStyle = 'rgba(255, 0, 0, 1)';
// ctx.fillRect(64, 64, 8 * SCALE_FACTOR, 8 * SCALE_FACTOR);

const colour = ([r, g, b, a]) => ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
const drawPixel = (x, y, c) => {
  colour(c);
  ctx.fillRect(x * SCALE_FACTOR, y * SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
};

// for (let y = 0; y < TILE_HEIGHT * PIXELS_PER_TILE; y++) {
//   for (let x = 0; x < TILE_WIDTH * PIXELS_PER_TILE; x++) {
//     const index = x / y**0.5 & 0xf;
//     drawPixel(x, y, colours[index]);
//   }
// }

const tile = [
  0x00, 0x11, 0x22, 0x33,
  0x00, 0x11, 0x22, 0x33,
  0x44, 0x55, 0x66, 0x77,
  0x44, 0x55, 0x66, 0x77,
  0x88, 0x99, 0xaa, 0xbb,
  0x88, 0x99, 0xaa, 0xbb,
  0xcc, 0xdd, 0xee, 0xff,
  0xcc, 0xdd, 0xee, 0xff,
]

const drawTile = (x, y, tileData) => {
  for (let oy = 0; oy < PIXELS_PER_TILE; oy++) {
    for (let ox = 0; ox < PIXELS_PER_TILE; ox += 2) {
      const index = (oy * PIXELS_PER_TILE + ox)/2;
      const byte = tileData[index];

      const c1 = colours[byte >> 4];
      const c2 = colours[byte & 0xf];

      drawPixel(x+ox, y+oy, c1);
      drawPixel(x+ox+1, y+oy, c2);
    }
  }
}

// drawTile(0, 0, tile);

const blackTile = Array.from({length: 32}, () => 0xff);
const blueTile = Array.from({length: 32}, () => 0x33);

const position = {x: 0, y: 0};
const draw = () => {
  colour([255, 255, 255, 1]);
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < TILE_HEIGHT; y++) {
    for (let x = 0; x < TILE_WIDTH; x++) {
      if ((x + y) % 2 === 0) {
        drawTile(x*PIXELS_PER_TILE, y*PIXELS_PER_TILE, blackTile);
      } else {
        drawTile(x*PIXELS_PER_TILE, y*PIXELS_PER_TILE, blueTile);
      }
    }
  }

  position.x = (position.x + 1) % (TILE_WIDTH * PIXELS_PER_TILE);
  position.y = (position.y + 1) % (TILE_HEIGHT * PIXELS_PER_TILE);
  drawTile(position.x, position.y, tile);

  requestAnimationFrame(draw);
};

draw();
