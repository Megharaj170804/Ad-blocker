import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, drawPixel) {
  // 8-byte signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Scanlines: width * 4 bytes + 1 filter byte per line
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // No filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      rawData.writeUInt8(r, offset++);
      rawData.writeUInt8(g, offset++);
      rawData.writeUInt8(b, offset++);
      rawData.writeUInt8(a, offset++);
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Icon Painter: A shield with an emerald/cyan modern gradient
function shieldPainter(x, y, w, h) {
  const nx = (x / (w - 1)) * 2 - 1; // -1 to 1
  const ny = (y / (h - 1)) * 2 - 1; // -1 to 1

  // Distance from center for rounded shield
  const inShield =
    ny >= -0.8 &&
    ny <= 0.85 &&
    Math.abs(nx) <= (ny < 0 ? 0.75 : 0.75 * (1 - Math.pow(ny / 0.85, 1.8)));

  if (!inShield) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Emerald to Cyan gradient
  const grad = (ny + 0.8) / 1.65;
  const r = Math.round(16 + grad * 10);
  const g = Math.round(185 - grad * 30);
  const b = Math.round(129 + grad * 80);

  // Border highlight
  const isBorder =
    Math.abs(nx) > (ny < 0 ? 0.65 : 0.65 * (1 - Math.pow(ny / 0.85, 1.8))) ||
    ny < -0.7 ||
    ny > 0.75;

  if (isBorder) {
    return [255, 255, 255, 220];
  }

  // Inner checkmark / slash
  const inCenter = Math.abs(nx) < 0.12 && Math.abs(ny) < 0.45;
  if (inCenter) {
    return [255, 255, 255, 255];
  }

  return [r, g, b, 255];
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of [16, 32, 48, 128]) {
  const png = createPng(size, size, shieldPainter);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
}
