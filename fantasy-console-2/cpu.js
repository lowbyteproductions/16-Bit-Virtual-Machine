const {createRAM} = require('./create-memory');
const registers = require('./registers');
const instructions = require('./instructions');

const IP = 0;
const ACU = 2;
const R1 = 4;
const R2 = 6;
const R3 = 8;
const R4 = 10;
const R5 = 12;
const R6 = 14;
const R7 = 16;
const R8 = 18;
const SP = 20;
const FP = 22;
const MB = 24;
const IM = 26;

class CPU {
  constructor(memory, interuptVectorAddress = 0x1000) {
    this.memory = memory;

    this.isPaused = false;

    this.registers = createRAM(registers.length * 2);
    this.registerMap = registers.reduce((map, name, i) => {
      map[name] = i * 2;
      return map;
    }, {});

    this.interuptVectorAddress = interuptVectorAddress;
    this.setRegister('ip', this.memory.getUint16(this.interuptVectorAddress));
    this.isInInteruptHandler = false;
    this.setRegister('im', 0xffff);

    this.setRegister('sp', 0xffff - 1);
    this.setRegister('fp', 0xffff - 1);

    this.stackFrameSize = 0;
  }

  debug() {
    registers.forEach(name => {
      console.log(`${name}: 0x${this.getRegister(name).toString(16).padStart(4, '0')}`);
    });
    console.log();
  }

  viewMemoryAt(address, n = 8) {
    // 0x0f01: 0x04 0x05 0xA3 0xFE 0x13 0x0D 0x44 0x0F ...
    const nextNBytes = Array.from({length: n}, (_, i) =>
      this.memory.getUint8(address + i)
    ).map(v => `0x${v.toString(16).padStart(2, '0')}`);

    console.log(`0x${address.toString(16).padStart(4, '0')}: ${nextNBytes.join(' ')}`);
  }

  getRegister(name) {
    return this.registers.getUint16(this.registerMap[name]);
  }

  setRegister(name, value) {
    return this.registers.setUint16(this.registerMap[name], value);
  }

  fetch() {
    const nextInstructionAddress = this.registers.getUint16(IP);
    const instruction = this.memory.getUint8(nextInstructionAddress);
    this.registers.setUint16(IP, nextInstructionAddress + 1);
    return instruction;
  }

  fetch16() {
    const nextInstructionAddress = this.registers.getUint16(IP);
    const instruction = this.memory.getUint16(nextInstructionAddress);
    this.registers.setUint16(IP, nextInstructionAddress + 2);
    return instruction;
  }

  push(value) {
    const spAddress = this.registers.getUint16(SP);
    this.memory.setUint16(spAddress, value);
    this.registers.setUint16(SP, spAddress - 2);
    this.stackFrameSize += 2;
  }

  pop() {
    const nextSpAddress = this.registers.getUint16(SP) + 2;
    this.registers.setUint16(SP, nextSpAddress);
    this.stackFrameSize -= 2;
    return this.memory.getUint16(nextSpAddress);
  }

  pushState() {
    this.push(this.registers.getUint16(R1));
    this.push(this.registers.getUint16(R2));
    this.push(this.registers.getUint16(R3));
    this.push(this.registers.getUint16(R4));
    this.push(this.registers.getUint16(R5));
    this.push(this.registers.getUint16(R6));
    this.push(this.registers.getUint16(R7));
    this.push(this.registers.getUint16(R8));
    this.push(this.registers.getUint16(IP));
    this.push(this.stackFrameSize + 2);

    this.registers.setUint16(FP, this.registers.getUint16(SP));
    this.stackFrameSize = 0;
  }

  popState() {
    const framePointerAddress = this.registers.getUint16(FP);
    this.registers.setUint16(SP, framePointerAddress);

    this.stackFrameSize = this.pop();
    const stackFrameSize = this.stackFrameSize;

    this.registers.setUint16(IP, this.pop());
    this.registers.setUint16(R8, this.pop());
    this.registers.setUint16(R7, this.pop());
    this.registers.setUint16(R6, this.pop());
    this.registers.setUint16(R5, this.pop());
    this.registers.setUint16(R4, this.pop());
    this.registers.setUint16(R3, this.pop());
    this.registers.setUint16(R2, this.pop());
    this.registers.setUint16(R1, this.pop());

    const nArgs = this.pop();
    for (let i = 0; i < nArgs; i++) {
      this.pop();
    }

    this.registers.setUint16(FP, framePointerAddress + stackFrameSize);
  }

  fetchRegisterIndex() {
    return this.fetch() * 2;
  }

  handleInterupt(value) {
    const interruptBit = value % 0xf;

    // If the interrupt is masked by the interrupt mask register
    // then do not enter the interrupt handler
    const isUnmasked = Boolean((1 << interruptBit) & this.registers.getUint16(IM));
    if (!isUnmasked) {
      return;
    }

    // Calculate where in the interupt vector we'll look
    const addressPointer = this.interuptVectorAddress + (interruptBit * 2);
    // Get the address from the interupt vector at that address
    const address = this.memory.getUint16(addressPointer);

    // We only save state when not already in an interupt
    if (!this.isInInteruptHandler) {
      // Save the return address
      this.push(this.registers.getUint16(IP));
    }

    this.isInInteruptHandler = true;

    // Jump to the interupt handler
    this.registers.setUint16(IP, address)
  }

  execute(instruction) {
    switch (instruction) {
      case instructions.MOV8_LIT_MEM.opcode: {
        // TODO: This is wasteful and can be easily fixed in at the parser level
        const value = this.fetch16() & 0xff;
        const address = this.fetch16();
        this.memory.setUint8(address, value);
        return;
      }

      case instructions.MOV8_MEM_REG.opcode: {
        const address = this.fetch16();
        const registerTo = this.fetchRegisterIndex();
        const value = this.memory.getUint8(address);
        this.registers.setUint16(registerTo, value);
        return;
      }

      case instructions.MOVL_REG_MEM.opcode: {
        const registerFrom = this.fetchRegisterIndex();
        const address = this.fetch16();
        const value = this.registers.getUint16(registerFrom) & 0xff;
        this.memory.setUint8(address, value);
        return;
      }

      case instructions.MOVH_REG_MEM.opcode: {
        const registerFrom = this.fetchRegisterIndex();
        const address = this.fetch16();
        const value = this.registers.getUint8(registerFrom);
        this.memory.setUint8(address, value);
        return;
      }

      case instructions.MOV8_REG_PTR_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const ptr = this.registers.getUint16(r1);
        const value = this.memory.getUint16(ptr) & 0xff;
        this.registers.setUint8(r2, value);
        return;
      }

      case instructions.MOV8_REG_REG_PTR.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1) & 0xff;
        const addr = this.registers.getUint16(r2);
        this.memory.setUint8(addr, value);
        return;
      }

      case instructions.MOV_REG_REG_PTR.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const addr = this.registers.getUint16(r2);
        this.memory.setUint16(addr, value);
        return;
      }

      case instructions.RET_INT.opcode: {
        this.isInInteruptHandler = false;
        this.registers.setUint16(IP, this.pop());
        return;
      }

      case instructions.INT.opcode: {
        // We're only looking at the least significant nibble
        const interuptValue = this.fetch16() & 0xf;
        this.handleInterupt(interuptValue);
        return;
      }

      // Move literal into register
      case instructions.MOV_LIT_REG.opcode: {
        const literal = this.fetch16();
        const register = this.fetchRegisterIndex();
        this.registers.setUint16(register, literal);
        return;
      }

      // Move register to register
      case instructions.MOV_REG_REG.opcode: {
        const registerFrom = this.fetchRegisterIndex();
        const registerTo = this.fetchRegisterIndex();
        const value = this.registers.getUint16(registerFrom);
        this.registers.setUint16(registerTo, value);
        return;
      }

      // Move register to memory
      case instructions.MOV_REG_MEM.opcode: {
        const registerFrom = this.fetchRegisterIndex();
        const address = this.fetch16();
        const value = this.registers.getUint16(registerFrom);
        this.memory.setUint16(address, value);
        return;
      }

      // Move memory to register
      case instructions.MOV_MEM_REG.opcode: {
        const address = this.fetch16();
        const registerTo = this.fetchRegisterIndex();
        const value = this.memory.getUint16(address);
        this.registers.setUint16(registerTo, value);
        return;
      }

      // Move literal to memory
      case instructions.MOV_LIT_MEM.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();
        this.memory.setUint16(address, value);
        return;
      }

      // Move register* to register
      case instructions.MOV_REG_PTR_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const ptr = this.registers.getUint16(r1);
        const value = this.memory.getUint16(ptr);
        this.registers.setUint16(r2, value);
        return;
      }

      // Move value at [literal + register]* to register
      case instructions.MOV_LIT_OFF_REG.opcode: {
        const baseAddress = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const offset = this.registers.getUint16(r1);

        const value = this.memory.getUint16(baseAddress + offset);
        this.registers.setUint16(r2, value);
        return;
      }

      // Add register to register
      case instructions.ADD_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.registers.setUint16(ACU, registerValue1 + registerValue2);
        return;
      }

      // Add literal to register
      case instructions.ADD_LIT_REG.opcode: {
        const literal = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        this.registers.setUint16(ACU, literal + registerValue);
        return;
      }

      // Subtract literal from register value
      case instructions.SUB_LIT_REG.opcode: {
        const literal = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        const res = registerValue - literal;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Subtract register value from literal
      case instructions.SUB_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);
        const res = literal - registerValue;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Subtract register value from register value
      case instructions.SUB_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        const res = registerValue1 - registerValue2;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Multiply literal by register value
      case instructions.MUL_LIT_REG.opcode: {
        const literal = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        const res = literal * registerValue;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Multiply register value by register value
      case instructions.MUL_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        const res = registerValue1 * registerValue2;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Increment value in register (in place)
      case instructions.INC_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const newValue = oldValue + 1;
        this.registers.setUint16(r1, newValue);
        return;
      }

      // Decrement value in register (in place)
      case instructions.DEC_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const newValue = oldValue - 1;
        this.registers.setUint16(r1, newValue);
        return;
      }

      // Left shift register by literal (in place)
      case instructions.LSF_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch();
        const oldValue = this.registers.getUint16(r1);
        const res = oldValue << literal;
        this.registers.setUint16(r1, res);
        return;
      }

      // Left shift register by register (in place)
      case instructions.LSF_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const shiftBy = this.registers.getUint16(r2);
        const res = oldValue << shiftBy;
        this.registers.setUint16(r1, res);
        return;
      }

      // Right shift register by literal (in place)
      case instructions.RSF_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch();
        const oldValue = this.registers.getUint16(r1);
        const res = oldValue >> literal;
        this.registers.setUint16(r1, res);
        return;
      }

      // Right shift register by register (in place)
      case instructions.RSF_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const shiftBy = this.registers.getUint16(r2);
        const res = oldValue >> shiftBy;
        this.registers.setUint16(r1, res);
        return;
      }

      // And register with literal
      case instructions.AND_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);

        const res = registerValue & literal;
        this.registers.setUint16(ACU, res);
        return;
      }

      // And register with register
      case instructions.AND_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);

        const res = registerValue1 & registerValue2;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Or register with literal
      case instructions.OR_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);

        const res = registerValue | literal;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Or register with register
      case instructions.OR_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);

        const res = registerValue1 | registerValue2;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Xor register with literal
      case instructions.XOR_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);

        const res = registerValue ^ literal;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Xor register with register
      case instructions.XOR_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);

        const res = registerValue1 ^ registerValue2;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Not (invert) register
      case instructions.NOT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);

        const res = (~registerValue) & 0xffff;
        this.registers.setUint16(ACU, res);
        return;
      }

      // Jump if literal not equal
      case instructions.JMP_NOT_EQ.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value !== this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if register not equal
      case instructions.JNE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value !== this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if literal equal
      case instructions.JEQ_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value === this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if register equal
      case instructions.JEQ_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value === this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if literal less than
      case instructions.JLT_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value < this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if register less than
      case instructions.JLT_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value < this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if literal greater than
      case instructions.JGT_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value > this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if register greater than
      case instructions.JGT_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value > this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if literal less than or equal to
      case instructions.JLE_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value <= this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if register less than or equal to
      case instructions.JLE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value <= this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if literal greater than or equal to
      case instructions.JGE_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value >= this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Jump if register greater than or equal to
      case instructions.JGE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value >= this.registers.getUint16(ACU)) {
          this.registers.setUint16(IP, address)
          return;
        }

        return;
      }

      // Push Literal
      case instructions.PSH_LIT.opcode: {
        const value = this.fetch16();
        this.push(value);
        return;
      }

      // Push Register
      case instructions.PSH_REG.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        this.push(this.registers.getUint16(registerIndex));
        return;
      }

      // Pop
      case instructions.POP.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        const value = this.pop();
        this.registers.setUint16(registerIndex, value);
        return;
      }

      // Call literal
      case instructions.CAL_LIT.opcode: {
        const address = this.fetch16();
        this.pushState();
        this.registers.setUint16(IP, address)
        return;
      }

      // Call register
      case instructions.CAL_REG.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        const address = this.registers.getUint16(registerIndex);
        this.pushState();
        this.registers.setUint16(IP, address)
        return;
      }

      // Return from subroutine
      case instructions.RET.opcode: {
        this.popState();
        return;
      }

      // Halt all computation
      case instructions.HLT.opcode: {
        return true;
      }
    }
  }

  step() {
    const instruction = this.fetch();
    return this.execute(instruction);
  }

  run() {
    // No setImmediate in the browser
  }
}

module.exports = CPU;