const eraseScreen = () => {
  process.stdout.write('\x1b[2J');
}

const moveTo = (x, y) => {
  process.stdout.write(`\x1b[${y};${x}H`);
}

const setBold = () => {
  process.stdout.write('\x1b[1m');
}

const setRegular = () => {
  process.stdout.write('\x1b[0m');
}

const createScreenDevice = () => {
  return {
    getUint16: () => 0,
    getUint8: () => 0,
    setUint16: (address, data) => {
      const command = (data & 0xff00) >> 8;
      const characterValue = data & 0x00ff;

      if (command === 0xff) {
        eraseScreen();
      } else if (command === 0x01) {
        setBold();
      } else if (command === 0x02) {
        setRegular();
      }

      const x = (address % 16) + 1;
      const y = Math.floor(address / 16) + 1;
      moveTo(x * 2, y);
      const character = String.fromCharCode(characterValue);
      process.stdout.write(character);
    }
  }
};

module.exports = createScreenDevice;