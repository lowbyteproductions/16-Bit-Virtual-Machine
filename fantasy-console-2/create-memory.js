const createRAM = sizeInBytes => {
  const ab = new ArrayBuffer(sizeInBytes);
  const dv = new DataView(ab);
  const bytes = new Uint8Array(ab);

  return {
    ab,
    load: data => data.forEach((d, i) => dv.setUint8(i, d)),
    slice: (from, to) => bytes.slice(from, to),
    getUint8: dv.getUint8.bind(dv),
    getUint16: dv.getUint16.bind(dv),
    setUint8: dv.setUint8.bind(dv),
    setUint16: dv.setUint16.bind(dv),
  };
};

const createROM = sizeInBytes => {
  const ab = new ArrayBuffer(sizeInBytes);
  const dv = new DataView(ab);
  const bytes = new Uint8Array(ab);

  return {
    ab,
    load: data => data.forEach((d, i) => dv.setUint8(i, d)),
    slice: (from, to) => bytes.slice(from, to),
    getUint8: dv.getUint8.bind(dv),
    getUint16: dv.getUint16.bind(dv),
    setUint8: () => 0,
    setUint16: () => 0,
  };
};

module.exports = {
  createRAM,
  createROM
};
