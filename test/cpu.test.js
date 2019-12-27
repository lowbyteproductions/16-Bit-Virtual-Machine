jest.useFakeTimers();

const createMemory = require('../episode-5/create-memory');
const CPU = require('../episode-5/cpu');
const instructions = require('../episode-5/instructions');

const IP = 0;
const ACC = 1;
const R1 = 2;
const R2 = 3;
const R3 = 4;
const R4 = 5;
const R5 = 6;
const R6 = 7;
const R7 = 8;
const R8 = 9;
const SP = 10;
const FP = 11;

const createCPU = (cb = writeableBytes => {}, sizeInBytes = 256 * 256) => {
  const memory = createMemory(sizeInBytes);
  const writeableBytes = new Uint8Array(memory.buffer);

  cb(writeableBytes);

  return new CPU(memory);
}

const createCPUWithInstructions = (sizeInBytes = 256 * 256) => {
  return createCPU(writeableBytes => {
    let i = 0;
    writeableBytes[i++] = instructions.MOV_LIT_REG;
    writeableBytes[i++] = 0x33;
    writeableBytes[i++] = 0x33;
    writeableBytes[i++] = 2;

    writeableBytes[i++] = instructions.MOV_LIT_REG;
    writeableBytes[i++] = 0x22;
    writeableBytes[i++] = 0x22;
    writeableBytes[i++] = 3;

    writeableBytes[i++] = instructions.MOV_LIT_REG;
    writeableBytes[i++] = 0x11;
    writeableBytes[i++] = 0x11;
    writeableBytes[i++] = 4;

    writeableBytes[i++] = instructions.MOV_LIT_REG;
    writeableBytes[i++] = 0x12;
    writeableBytes[i++] = 0x34;
    writeableBytes[i++] = 5;

    writeableBytes[i++] = instructions.MOV_LIT_REG;
    writeableBytes[i++] = 0x56;
    writeableBytes[i++] = 0x78;
    writeableBytes[i++] = 6;
  }, sizeInBytes);
}

describe('CPU', () => {
  describe('CPU.debug', () => {
    it('prints internal register values to the console', () => {
      const cpu = createCPUWithInstructions();

      let output = '';
      const storeLog = inputs => inputs ? (output += `\n${inputs}`): (output += '');
      console.log = jest.fn(storeLog);

      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();

      cpu.debug();

      expect(output).toBe(`
ip: 0x0014
acc: 0x0000
r1: 0x3333
r2: 0x2222
r3: 0x1111
r4: 0x1234
r5: 0x5678
r6: 0x0000
r7: 0x0000
r8: 0x0000
sp: 0xfffe
fp: 0xfffe`);
    });
  });

  describe('CPU.viewMemoryAt', () => {
    it('prints internal memory values to the console', () => {
      const cpu = createCPUWithInstructions();

      let output = '';
      const storeLog = inputs => (output += inputs);
      console.log = jest.fn(storeLog);

      cpu.viewMemoryAt(cpu.getRegister('ip'));

      expect(output).toBe('0x0000: 0x10 0x33 0x33 0x02 0x10 0x22 0x22 0x03');
    });
  });

  describe('CPU.getRegister', () => {
    it('should return the value of a register', () => {
      const cpu = createCPU();

      expect(cpu.getRegister('ip')).toBe(0x0000);
      expect(cpu.getRegister('acc')).toBe(0x0000);
      expect(cpu.getRegister('r1')).toBe(0x0000);
      expect(cpu.getRegister('r2')).toBe(0x0000);
      expect(cpu.getRegister('r3')).toBe(0x0000);
      expect(cpu.getRegister('r4')).toBe(0x0000);
      expect(cpu.getRegister('r5')).toBe(0x0000);
      expect(cpu.getRegister('r6')).toBe(0x0000);
      expect(cpu.getRegister('r7')).toBe(0x0000);
      expect(cpu.getRegister('r8')).toBe(0x0000);
      expect(cpu.getRegister('sp')).toBe(0xfffe);
      expect(cpu.getRegister('fp')).toBe(0xfffe);
    });

    it('should throw an error if the register does not exist', () => {
      const cpu = createCPU();

      expect(() => cpu.getRegister('non-existent')).toThrowError(`getRegister: No such register 'non-existent'`);
    });
  });

  describe('CPU.setRegister', () => {
    it('should set the value of a register', () => {
      const cpu = createCPU();

      cpu.setRegister('r1', 24);
      cpu.setRegister('r2', 42);

      expect(cpu.getRegister('r1')).toBe(24);
      expect(cpu.getRegister('r2')).toBe(42);
    });

    it('should throw an error if the register does not exist', () => {
      const cpu = createCPU();

      expect(() => cpu.setRegister('non-existent', 2)).toThrowError(`setRegister: No such register 'non-existent'`);
    });
  });

  describe('CPU.fetch', () => {
    it('should fetch the next 8 bits of memory and increment the instruction pointer by 1', () => {
      const cpu = createCPUWithInstructions();

      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();

      const address = cpu.getRegister('ip');
      const value = cpu.memory.getUint8(address);

      expect(cpu.fetch()).toBe(value);
      expect(cpu.getRegister('ip')).toBe(address + 1);
    });
  });

  describe('CPU.fetch16', () => {
    it('should fetch the next 16 bits of memory and increment the instruction pointer by 2', () => {
      const cpu = createCPUWithInstructions();

      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();

      const address = cpu.getRegister('ip');
      const value = cpu.memory.getUint16(address);

      expect(cpu.fetch16()).toBe(value);
      expect(cpu.getRegister('ip')).toBe(address + 2);
    });
  });

  describe('CPU.push', () => {
    it('should push a value onto the stack', () => {
      const cpu = createCPUWithInstructions();

      const spAddress = cpu.getRegister('sp');
      const stackFrameSize = cpu.stackFrameSize;
      const value = 0x0001;

      cpu.push(value);

      expect(cpu.memory.getUint16(spAddress)).toBe(value);
      expect(cpu.getRegister('sp')).toBe(spAddress - 2);
      expect(cpu.stackFrameSize).toBe(stackFrameSize + 2);
    });
  });

  describe('CPU.pushState', () => {
    it('should push a stack frame onto the stack', () => {
      const cpu = createCPUWithInstructions();

      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();

      cpu.pushState();

      expect(cpu.stackFrameSize).toBe(0);
      expect(cpu.getRegister('sp')).toBe(0xffea);
      expect(cpu.getRegister('fp')).toBe(0xffea);
      expect(cpu.memory.getUint16(0xfffe)).toBe(0x3333); // r1
      expect(cpu.memory.getUint16(0xfffc)).toBe(0x2222); // r2
      expect(cpu.memory.getUint16(0xfffa)).toBe(0x1111); // r3
      expect(cpu.memory.getUint16(0xfff8)).toBe(0x1234); // r4
      expect(cpu.memory.getUint16(0xfff6)).toBe(0x5678); // r5
      expect(cpu.memory.getUint16(0xfff4)).toBe(0x0000); // r6
      expect(cpu.memory.getUint16(0xfff2)).toBe(0x0000); // r7
      expect(cpu.memory.getUint16(0xfff0)).toBe(0x0000); // r8
      expect(cpu.memory.getUint16(0xffee)).toBe(0x0014); // ip
      expect(cpu.memory.getUint16(0xffec)).toBe(0x0014); // stack frame size
    });
  });

  describe('CPU.pop', () => {
    it('should pop a value off of the stack', () => {
      const cpu = createCPUWithInstructions();

      cpu.push(0x1111);

      const spAddress = cpu.getRegister('sp');
      const stackFrameSize = cpu.stackFrameSize;

      expect(cpu.pop()).toBe(0x1111);
      expect(cpu.getRegister('sp')).toBe(spAddress + 2);
      expect(cpu.stackFrameSize).toBe(stackFrameSize - 2);
    });
  });

  describe('CPU.popState', () => {
    it('should pop a frame off of the stack', () => {
      const cpu = createCPUWithInstructions();

      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();
      cpu.step();

      const ip = cpu.getRegister('ip');
      const r8 = cpu.getRegister('r8');
      const r7 = cpu.getRegister('r7');
      const r6 = cpu.getRegister('r6');
      const r5 = cpu.getRegister('r5');
      const r4 = cpu.getRegister('r4');
      const r3 = cpu.getRegister('r3');
      const r2 = cpu.getRegister('r2');
      const r1 = cpu.getRegister('r1');

      cpu.push(0x0000); // n args
      cpu.pushState();

      // Reset registers to simulate other instructions occurring in the cpu
      cpu.setRegister('ip', 0x0000);
      cpu.setRegister('r8', 0x0000);
      cpu.setRegister('r7', 0x0000);
      cpu.setRegister('r6', 0x0000);
      cpu.setRegister('r5', 0x0000);
      cpu.setRegister('r4', 0x0000);
      cpu.setRegister('r3', 0x0000);
      cpu.setRegister('r2', 0x0000);
      cpu.setRegister('r1', 0x0000);

      cpu.popState();

      expect(cpu.getRegister('fp')).toBe(cpu.memory.byteLength - 2);
      expect(cpu.getRegister('sp')).toBe(cpu.memory.byteLength - 2);
      expect(cpu.getRegister('ip')).toBe(ip);
      expect(cpu.getRegister('r8')).toBe(r8);
      expect(cpu.getRegister('r7')).toBe(r7);
      expect(cpu.getRegister('r6')).toBe(r6);
      expect(cpu.getRegister('r5')).toBe(r5);
      expect(cpu.getRegister('r4')).toBe(r4);
      expect(cpu.getRegister('r3')).toBe(r3);
      expect(cpu.getRegister('r2')).toBe(r2);
      expect(cpu.getRegister('r1')).toBe(r1);
    });
  });

  describe('CPU.fetchRegisterIndex', () => {
    it('should fetch the register index from the memory buffer', () => {
      const cpu = createCPUWithInstructions();

      cpu.step();
      cpu.step();

      cpu.fetch(); // instruction
      cpu.fetch16(); // literal
      const register = cpu.fetchRegisterIndex(); // register


      expect(register).toBe(0x0008); // r4
    });
  });

  describe('CPU.execute', () => {
    describe('MOV_LIT_REG', () => {
      it('should handle moving a literal value into a register', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;
          writeableBytes[i++] = R1;
        });

        cpu.step();

        expect(cpu.getRegister('r1')).toBe(0x1234);
      });
    });

    describe('MOV_REG_REG', () => {
      it('should handle moving the value of a register into another register', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x56;
          writeableBytes[i++] = 0x78;
          writeableBytes[i++] = R2;

          writeableBytes[i++] = instructions.MOV_REG_REG;
          writeableBytes[i++] = R2;
          writeableBytes[i++] = R1;
        });

        cpu.step();
        cpu.step();
        cpu.step();

        expect(cpu.getRegister('r1')).toBe(0x5678);
      });
    });

    describe('MOV_REG_MEM', () => {
      it('should handle moving the value of a register into memory', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.MOV_REG_MEM;
          writeableBytes[i++] = R1;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x10;
        });

        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(0x0010)).toBe(0x1234);
      });
    });

    describe('MOV_MEM_REG', () => {
      const cpu = createCPU(writeableBytes => {
        let i = 0;

        writeableBytes[i++] = instructions.MOV_LIT_REG;
        writeableBytes[i++] = 0x12;
        writeableBytes[i++] = 0x34;
        writeableBytes[i++] = R1;

        writeableBytes[i++] = instructions.MOV_REG_MEM;
        writeableBytes[i++] = R1;
        writeableBytes[i++] = 0x00;
        writeableBytes[i++] = 0x10;

        writeableBytes[i++] = instructions.MOV_MEM_REG;
        writeableBytes[i++] = 0x00;
        writeableBytes[i++] = 0x10;
        writeableBytes[i++] = R2;
      });

      cpu.step();
      cpu.step();
      cpu.step();

      expect(cpu.getRegister('r2')).toBe(0x1234);
    });

    describe('ADD_REG_REG', () => {
      const cpu = createCPU(writeableBytes => {
        let i = 0;

        writeableBytes[i++] = instructions.MOV_LIT_REG;
        writeableBytes[i++] = 0x12;
        writeableBytes[i++] = 0x34;
        writeableBytes[i++] = R1;

        writeableBytes[i++] = instructions.MOV_LIT_REG;
        writeableBytes[i++] = 0x56;
        writeableBytes[i++] = 0x78;
        writeableBytes[i++] = R2;

        writeableBytes[i++] = instructions.ADD_REG_REG;
        writeableBytes[i++] = R1;
        writeableBytes[i++] = R2;
      });

      cpu.step();
      cpu.step();
      cpu.step();

      expect(cpu.getRegister('acc')).toBe(0x1234 + 0x5678);
    });

    describe('JMP_NOT_EQ', () => {
      it('should branch if the accumulator value is not equal to the provided value', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.MOV_MEM_REG;
          writeableBytes[i++] = 0x01;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x01;
          writeableBytes[i++] = R2;

          writeableBytes[i++] = instructions.ADD_REG_REG;
          writeableBytes[i++] = R1;
          writeableBytes[i++] = R2;

          writeableBytes[i++] = instructions.MOV_REG_MEM;
          writeableBytes[i++] = ACC;
          writeableBytes[i++] = 0x01;
          writeableBytes[i++] = 0x00;

          writeableBytes[i++] = instructions.JMP_NOT_EQ;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x03;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x00;
        });

        // Setup
        cpu.step();
        cpu.step();
        cpu.step();
        cpu.step();

        expect(cpu.getRegister('r1')).toBe(0x0000);
        expect(cpu.getRegister('r2')).toBe(0x0001);
        expect(cpu.getRegister('acc')).toBe(0x0001);
        expect(cpu.memory.getUint16(0x0100)).toBe(0x0001);
        expect(cpu.getRegister('ip')).toBe(15);

        // Branch
        cpu.step();

        expect(cpu.getRegister('r1')).toBe(0x0000);
        expect(cpu.getRegister('r2')).toBe(0x0001);
        expect(cpu.getRegister('acc')).toBe(0x0001);
        expect(cpu.memory.getUint16(0x0100)).toBe(0x0001);
        expect(cpu.getRegister('ip')).toBe(0x0000);
      });

      it('should not branch if the accumulator value is equal to the provided value', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.MOV_MEM_REG;
          writeableBytes[i++] = 0x01;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x01;
          writeableBytes[i++] = R2;

          writeableBytes[i++] = instructions.ADD_REG_REG;
          writeableBytes[i++] = R1;
          writeableBytes[i++] = R2;

          writeableBytes[i++] = instructions.MOV_REG_MEM;
          writeableBytes[i++] = ACC;
          writeableBytes[i++] = 0x01;
          writeableBytes[i++] = 0x00;

          writeableBytes[i++] = instructions.JMP_NOT_EQ;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x01;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x00;
        });

        // Setup
        cpu.step();
        cpu.step();
        cpu.step();
        cpu.step();

        expect(cpu.getRegister('r1')).toBe(0x0000);
        expect(cpu.getRegister('r2')).toBe(0x0001);
        expect(cpu.getRegister('acc')).toBe(0x0001);
        expect(cpu.memory.getUint16(0x0100)).toBe(0x0001);
        expect(cpu.getRegister('ip')).toBe(0x000F);

        // Branch
        cpu.step();

        expect(cpu.getRegister('r1')).toBe(0x0000);
        expect(cpu.getRegister('r2')).toBe(0x0001);
        expect(cpu.getRegister('acc')).toBe(0x0001);
        expect(cpu.memory.getUint16(0x0100)).toBe(0x0001);
        expect(cpu.getRegister('ip')).toBe(0x0014);
      });
    });

    describe('PSH_LIT', () => {
      it('should push a literal value onto the stack', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;
        });

        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x1234);
        expect(cpu.getRegister('sp')).toBe(cpu.memory.byteLength - 4);
        expect(cpu.stackFrameSize).toBe(2);
      });
    });

    describe('PSH_REG', () => {
      it('should push the value of a register onto the stack', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.PSH_REG;
          writeableBytes[i++] = R1;
        });

        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x1234);
        expect(cpu.getRegister('sp')).toBe(cpu.memory.byteLength - 4);
        expect(cpu.stackFrameSize).toBe(2);
      });
    });

    describe('POP', () => {
      it('should pop a value off of the stack', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;

          writeableBytes[i++] = instructions.POP;
          writeableBytes[i++] = R1;
        });

        cpu.step();
        cpu.step();

        expect(cpu.getRegister('r1')).toBe(0x1234);
      });
    });

    describe('CAL_LIT', () => {
      it('should call a subroutine with a literal address', () => {
        const cpu = createCPU(writeableBytes => {
          const subroutineAddress = 0x3000;

          let i = 0;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x33;
          writeableBytes[i++] = 0x33;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x56;
          writeableBytes[i++] = 0x78;

          // Number of arguments for subroutine
          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x01;

          writeableBytes[i++] = instructions.CAL_LIT;
          writeableBytes[i++] = (subroutineAddress & 0xff00) >> 8;
          writeableBytes[i++] = (subroutineAddress & 0x00ff);

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x44;
          writeableBytes[i++] = 0x44;

          i = subroutineAddress;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x07;
          writeableBytes[i++] = 0x08;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.RET;
        });

        // Setup
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.getRegister('r1')).toBe(0x1234);

        // Call subroutine
        cpu.step();
        cpu.step();
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 8)).toBe(0x1234); // Previous r1 value
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 6)).toBe(0x0001); // Number of subroutine arguments
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 4)).toBe(0x5678); // Subroutine argument
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.getRegister('r1')).toBe(0x0708);

        // Return from subroutine
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 4)).toBe(0x4444);
        expect(cpu.getRegister('r1')).toBe(0x1234);
      });
    });

    describe('CAL_REG', () => {
      it('should call a subroutine with an address specified in a register', () => {
        const cpu = createCPU(writeableBytes => {
          const subroutineAddress = 0x3000;

          let i = 0;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x33;
          writeableBytes[i++] = 0x33;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = (subroutineAddress & 0xff00) >> 8;
          writeableBytes[i++] = (subroutineAddress & 0x00ff);
          writeableBytes[i++] = R8;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x56;
          writeableBytes[i++] = 0x78;

          // Number of arguments for subroutine
          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x01;

          writeableBytes[i++] = instructions.CAL_REG;
          writeableBytes[i++] = R8;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x44;
          writeableBytes[i++] = 0x44;

          i = subroutineAddress;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x07;
          writeableBytes[i++] = 0x08;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.RET;
        });

        // Setup
        cpu.step();
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.getRegister('r1')).toBe(0x1234);

        // Call subroutine
        cpu.step();
        cpu.step();
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 8)).toBe(0x1234); // Previous r1 value
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 6)).toBe(0x0001); // Number of subroutine arguments
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 4)).toBe(0x5678); // Subroutine argument
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.getRegister('r1')).toBe(0x0708);

        // Return from subroutine
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 4)).toBe(0x4444);
        expect(cpu.getRegister('r1')).toBe(0x1234);
      });
    });

    describe('RET', () => {
      it('should return from a subroutine', () => {
        const cpu = createCPU(writeableBytes => {
          const subroutineAddress = 0x3000;

          let i = 0;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x33;
          writeableBytes[i++] = 0x33;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x12;
          writeableBytes[i++] = 0x34;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x56;
          writeableBytes[i++] = 0x78;

          // Number of arguments for subroutine
          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x00;
          writeableBytes[i++] = 0x01;

          writeableBytes[i++] = instructions.CAL_LIT;
          writeableBytes[i++] = (subroutineAddress & 0xff00) >> 8;
          writeableBytes[i++] = (subroutineAddress & 0x00ff);

          writeableBytes[i++] = instructions.PSH_LIT;
          writeableBytes[i++] = 0x44;
          writeableBytes[i++] = 0x44;

          i = subroutineAddress;

          writeableBytes[i++] = instructions.MOV_LIT_REG;
          writeableBytes[i++] = 0x07;
          writeableBytes[i++] = 0x08;
          writeableBytes[i++] = R1;

          writeableBytes[i++] = instructions.RET;
        });

        // Setup
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.getRegister('r1')).toBe(0x1234);

        // Call subroutine
        cpu.step();
        cpu.step();
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 8)).toBe(0x1234); // Previous r1 value
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 6)).toBe(0x0001); // Number of subroutine arguments
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 4)).toBe(0x5678); // Subroutine argument
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.getRegister('r1')).toBe(0x0708);

        // Return from subroutine
        cpu.step();
        cpu.step();

        expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x3333);
        expect(cpu.memory.getUint16(cpu.memory.byteLength - 4)).toBe(0x4444);
        expect(cpu.getRegister('r1')).toBe(0x1234);
      });
    });

    describe('HLT', () => {
      it('should return true', () => {
        const cpu = createCPU(writeableBytes => {
          let i = 0;

          writeableBytes[i++] = instructions.HLT;
        });

        expect(cpu.step()).toBeTruthy();
      });
    });
  });

  describe('CPU.run', () => {
    it('should run a program', () => {
      const cpu = createCPU(writeableBytes => {
        let i = 0;

        writeableBytes[i++] = instructions.PSH_LIT;
        writeableBytes[i++] = 0x01;
        writeableBytes[i++] = 0x02;

        writeableBytes[i++] = instructions.MOV_LIT_REG;
        writeableBytes[i++] = 0x12;
        writeableBytes[i++] = 0x34;
        writeableBytes[i++] = R1;

        writeableBytes[i++] = instructions.MOV_LIT_REG;
        writeableBytes[i++] = 0x56;
        writeableBytes[i++] = 0x78;
        writeableBytes[i++] = R2;

        writeableBytes[i++] = instructions.HLT;
      });

      cpu.run();

      jest.runAllTimers();

      expect(cpu.getRegister('r1')).toBe(0x1234);
      expect(cpu.getRegister('r2')).toBe(0x5678);
      expect(cpu.memory.getUint16(cpu.memory.byteLength - 2)).toBe(0x0102);
    });
  });
});