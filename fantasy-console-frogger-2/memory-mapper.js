class MemoryMapper {
  constructor() {
    this.regions = [];
  }

  map(device, start, size, remap = true) {
    const region = {
      device,
      start,
      end: start + size - 1,
      remap
    };
    this.regions.unshift(region);

    console.log(`Mapping from 0x${start.toString(16)} to 0x${(start + size - 1).toString(16)}`);

    return () => {
      this.regions = this.regions.filter(x => x !== region);
    };
  }

  findRegion(address) {
    let region = this.regions.find(r => address >= r.start && address <= r.end);
    if (!region) {
      throw new Error(`No memory region found for address ${address}`);
    }
    return region;
  }

  getUint16(address) {
    const region = this.findRegion(address);
    const finalAddress = region.remap
      ? address - region.start
      : address;
    try {
      return region.device.getUint16(finalAddress);
    } catch (ex) {
      console.error(`Attempted read from address 0x${address.toString(16)} of mapped device (final address=0x${finalAddress.toString(16)})`);
      console.log(this);
      debugger;
    }
  }

  getUint8(address) {
    const region = this.findRegion(address);
    const finalAddress = region.remap
      ? address - region.start
      : address;
    try {
      return region.device.getUint8(finalAddress);
    } catch (ex) {
      console.error(`Attempted read from address 0x${address.toString(16)} of mapped device (final address=0x${finalAddress.toString(16)})`);
      console.log(this);
      debugger;
    }
  }

  setUint16(address, value) {
    const region = this.findRegion(address);
    const finalAddress = region.remap
      ? address - region.start
      : address;
    try {
      return region.device.setUint16(finalAddress, value);
    } catch (ex) {
      console.error(`Attempted write to address 0x${address.toString(16)} of mapped device (final address=0x${finalAddress.toString(16)})`);
      console.log(this);
      debugger;
    }
  }

  setUint8(address, value) {
    const region = this.findRegion(address);
    const finalAddress = region.remap
      ? address - region.start
      : address;
    try {
      return region.device.setUint8(finalAddress, value);
    } catch (ex) {
      console.error(`Attempted write to address 0x${address.toString(16)} of mapped device (final address=0x${finalAddress.toString(16)})`);
      console.log(this);
      debugger;
    }
  }

  load(startAddress, data) {
    data.forEach((byte, offset) => this.setUint8(startAddress + offset, byte));
  }
}

module.exports = MemoryMapper;
