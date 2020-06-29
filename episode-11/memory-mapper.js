class MemoryMapper {
  constructor() {
    this.regions = [];
  }

  map(device, start, end, remap = true) {
    const region = {
      device,
      start,
      end,
      remap
    };
    this.regions.unshift(region);

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
    return region.device.getUint16(finalAddress);
  }

  getUint8(address) {
    const region = this.findRegion(address);
    const finalAddress = region.remap
      ? address - region.start
      : address;
    return region.device.getUint8(finalAddress);
  }

  setUint16(address, value) {
    const region = this.findRegion(address);
    const finalAddress = region.remap
      ? address - region.start
      : address;
    return region.device.setUint16(finalAddress, value);
  }

  setUint8(address, value) {
    const region = this.findRegion(address);
    const finalAddress = region.remap
      ? address - region.start
      : address;
    return region.device.setUint8(finalAddress, value);
  }
}

module.exports = MemoryMapper;
