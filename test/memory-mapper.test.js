const createMemory = require('../episode-5/create-memory');
const MemoryMapper = require('../episode-5/memory-mapper');

const createMockDevice = () => ({
  getUint16: jest.fn(),
  getUint8: jest.fn(),
  setUint16: jest.fn(),
  setUint8: jest.fn(),
});

describe('MemoryMapper', () => {
  describe('MemoryMapper.map', () => {
    it('should map devices to memory regions', () => {
      const memory = createMemory(256 * 256);
      const device = createMockDevice();
      const MM = new MemoryMapper();

      MM.map(device, 0x3000, 0x30ff);
      MM.map(memory, 0x0000, 0xffff, false);

      expect(MM.regions[1].start).toBe(0x3000);
      expect(MM.regions[1].end).toBe(0x30ff);
      expect(MM.regions[1].remap).toBeTruthy();

      expect(MM.regions[0].start).toBe(0x0000);
      expect(MM.regions[0].end).toBe(0xffff);
      expect(MM.regions[0].remap).toBeFalsy();
    });

    it('should unmap devices from memory regions', () => {
      const memory = createMemory(256 * 256);
      const MM = new MemoryMapper();

      const mappedMemory = MM.map(memory, 0x0000, 0xffff, false);
      const region = MM.findRegion(0x1000);

      expect(region.start).toBe(0x0000);
      expect(region.end).toBe(0xffff);
      expect(region.remap).toBeFalsy();

      mappedMemory();

      expect(() => MM.findRegion(0x1000)).toThrowError(`No memory region found for address ${0x1000}`);
    });
  });

  describe('MemoryMapper.findRegion', () => {
    it('should find a region', () => {
      const MM = new MemoryMapper();
      const memory = createMemory(256 * 256);

      MM.map(memory, 0x3000, 0x30ff);
      const region = MM.findRegion(0x3015);

      expect(region.start).toBe(0x3000);
      expect(region.end).toBe(0x30ff);
      expect(region.remap).toBeTruthy();
    });

    it('should throw an error if the region does not exist', () => {
      const MM = new MemoryMapper();
      const memory = createMemory(256 * 256);

      MM.map(memory, 0x3000, 0x30ff);

      expect(() => MM.findRegion(0x2000)).toThrowError(`No memory region found for address ${0x2000}`);
    });
  });

  describe('MemoryMapper.getUint16', () => {
    it('should get a 16 bit value', () => {
      const memory = createMemory(256 * 256);
      const MM = new MemoryMapper();

      MM.map(memory, 0x1000, 0x2000);
      MM.map(memory, 0x3000, 0x4000, false);

      MM.setUint16(0x1100, 0x1234);
      MM.setUint16(0x3100, 0x5678);

      expect(MM.getUint16(0x1100)).toBe(0x1234);
      expect(MM.getUint16(0x3100)).toBe(0x5678);
  });
  });

  describe('MemoryMapper.getUint8', () => {
    it('should get an 8 bit value', () => {
      const memory = createMemory(256 * 256);
      const MM = new MemoryMapper();

      MM.map(memory, 0x1000, 0x2000);
      MM.map(memory, 0x3000, 0x4000, false);

      MM.setUint8(0x1100, 0x12);
      MM.setUint8(0x3100, 0x34);

      expect(MM.getUint8(0x1100)).toBe(0x12);
      expect(MM.getUint8(0x3100)).toBe(0x34);
    });
  });

  describe('MemoryMapper.setUint16', () => {
    it ('should set a 16 bit value', () => {
      const memory = createMemory(256 * 256);
      const MM = new MemoryMapper();

      MM.map(memory, 0x1000, 0x2000);
      MM.map(memory, 0x3000, 0x4000, false);

      MM.setUint16(0x1100, 0x1234);
      MM.setUint16(0x3100, 0x5678);

      expect(MM.getUint16(0x1100)).toBe(0x1234);
      expect(MM.getUint16(0x3100)).toBe(0x5678);
    });
  });


  describe('MemoryMapper.setUint8', () => {
    it('should set an 8 bit value', () => {
      const memory = createMemory(256 * 256);
      const MM = new MemoryMapper();

      MM.map(memory, 0x1000, 0x2000);
      MM.map(memory, 0x3000, 0x4000, false);

      MM.setUint8(0x1100, 0x12);
      MM.setUint8(0x3100, 0x34);

      expect(MM.getUint8(0x1100)).toBe(0x12);
      expect(MM.getUint8(0x3100)).toBe(0x34);
    });
  });
});