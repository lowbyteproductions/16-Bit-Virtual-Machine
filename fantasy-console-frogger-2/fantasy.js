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

const colour = function ([r, g, b, a]) {
  this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
};

const drawPixel = function (x, y, c) {
  colour.call(this, c);
  this.ctx.fillRect(x * SCALE_FACTOR, y * SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
};

const drawTile = function (x, y, tileData) {
  for (let oy = 0; oy < PIXELS_PER_TILE; oy++) {
    for (let ox = 0; ox < PIXELS_PER_TILE; ox += 2) {
      const index = (oy * PIXELS_PER_TILE + ox)/2;
      const byte = tileData[index];

      const c1 = colours[byte >> 4];
      const c2 = colours[byte & 0xf];

      drawPixel.apply(this, [x+ox, y+oy, c1]);
      drawPixel.apply(this, [x+ox+1, y+oy, c2]);
    }
  }
}

class Tile {
  constructor(tileData) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = PIXELS_PER_TILE * SCALE_FACTOR;
    this.canvas.height = PIXELS_PER_TILE * SCALE_FACTOR;

    drawTile.apply(this, [0, 0, tileData]);
  }
};

class Renderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
  }

  drawGridAlignedTile(tileX, tileY, tile) {
    this.ctx.drawImage(tile.canvas, tileX * PIXELS_PER_TILE * SCALE_FACTOR, tileY * PIXELS_PER_TILE * SCALE_FACTOR);
  }

  drawPixelAlignedTile(x, y, tile) {
    this.ctx.drawImage(tile.canvas, x * SCALE_FACTOR, y * SCALE_FACTOR);
  }

  clear() {
    colour.call(this, [255, 255, 255, 1]);
    this.ctx.fillRect(0, 0, w, h);
  }
};

module.exports = {
  Renderer,
  Tile
};
