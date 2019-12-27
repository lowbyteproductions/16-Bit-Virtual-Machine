
const createScreenDevice = require('../episode-5/screen-device');

const mockProcessStdout = () => {
  const processStdout = process.stdout.write;

  if (processStdout.mockRestore) {
      processStdout.mockRestore();
  }

  const spyImplementation = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

  return spyImplementation
}

describe('createScreenDevice', () => {
  it('should create a screen device', () => {
    const screenDevice = createScreenDevice();

    expect(screenDevice).toHaveProperty('getUint16');
    expect(screenDevice).toHaveProperty('getUint8');
    expect(screenDevice).toHaveProperty('setUint16');
  });

  it('should return a default of 0 when getting values', () => {
    const screenDevice = createScreenDevice();

    expect(screenDevice.getUint16()).toBe(0);
    expect(screenDevice.getUint8()).toBe(0);
  });

  it('write erase the screen', () => {
    const mockStdout = mockProcessStdout();
    const screenDevice = createScreenDevice();

    const character = 'a';
    const address = 0x3010;
    const command = 0xff;
    const charCode = character.charCodeAt(0);

    screenDevice.setUint16(address, command << 8 | charCode);

    expect(mockStdout).toHaveBeenCalledTimes(3);
    expect(mockStdout).toHaveBeenLastCalledWith(String.fromCharCode(charCode));

    mockStdout.mockRestore();
  });

  it('write a bold character to the screen', () => {
    const mockStdout = mockProcessStdout();
    const screenDevice = createScreenDevice();

    const character = 'b';
    const address = 0x3010;
    const command = 0x01;
    const charCode = character.charCodeAt(0);

    screenDevice.setUint16(address, command << 8 | charCode);

    expect(mockStdout).toHaveBeenCalledTimes(3);
    expect(mockStdout).toHaveBeenLastCalledWith(String.fromCharCode(charCode));

    mockStdout.mockRestore();
  });

  it('write a regular character to the screen', () => {
    const mockStdout = mockProcessStdout();
    const screenDevice = createScreenDevice();

    const character = 'c';
    const address = 0x3010;
    const command = 0x02;
    const charCode = character.charCodeAt(0);

    screenDevice.setUint16(address, command << 8 | charCode);

    expect(mockStdout).toHaveBeenCalledTimes(3);
    expect(mockStdout).toHaveBeenLastCalledWith(String.fromCharCode(charCode));

    mockStdout.mockRestore();
  });
});