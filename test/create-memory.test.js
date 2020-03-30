const createMemory = require('../episode-4/create-memory');

describe('createMemory', () => {
  it('should create a chunk of memory', () => {
    const memory = createMemory(256);

    expect(memory.byteLength).toBe(256);
    expect(memory.byteOffset).toBe(0);
  });
});