/**
 * Generates the Nex Attender app assets (icon / adaptive icon / splash /
 * favicon) as real PNG files — no image library required (encodes PNG directly
 * via Node's zlib). Re-run any time with: `node scripts/gen-assets.cjs`.
 *
 * The artwork recreates the Nexus Infotech badge: a double ring (indigo outer,
 * teal inner) around a two-tone "Ni" monogram. To use a different logo, replace
 * the generated PNGs in /assets directly (see assets/README.md).
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Brand colours sampled from the office logo.
const TEAL = [30, 140, 160, 255]; // #1e8ca0
const INDIGO = [58, 43, 140, 255]; // #3a2b8c
const RING_INDIGO = [97, 84, 158, 255]; // #61549e (outer ring, slightly lighter)
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

// ---- PNG encoding ---------------------------------------------------------
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- geometry helpers (normalised 0..1 coords) ----------------------------
function inRoundRect(u, v, cx, cy, bx, by, r) {
  const qx = Math.abs(u - cx) - bx + r;
  const qy = Math.abs(v - cy) - by + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r <= 0;
}
function ring(u, v, R, hw) {
  return Math.abs(Math.hypot(u - 0.5, v - 0.5) - R) <= hw;
}
function disc(u, v, R) {
  return Math.hypot(u - 0.5, v - 0.5) <= R;
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function capsule(u, v, ax, ay, bx, by, r) {
  return segDist(u, v, ax, ay, bx, by) <= r;
}
function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}
function inTri(p, A, B, C) {
  const d1 = sign(p[0], p[1], A[0], A[1], B[0], B[1]);
  const d2 = sign(p[0], p[1], B[0], B[1], C[0], C[1]);
  const d3 = sign(p[0], p[1], C[0], C[1], A[0], A[1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// ---- the "Ni" monogram ----------------------------------------------------
function indigoMark(u, v) {
  const p = [u, v];
  // bold rounded left stem of the N
  if (capsule(u, v, 0.375, 0.40, 0.345, 0.62, 0.062)) return true;
  // thick diagonal sweeping to a sharp point at lower-right
  if (inTri(p, [0.72, 0.74], [0.33, 0.46], [0.42, 0.58])) return true;
  return false;
}
function tealMark(u, v) {
  const p = [u, v];
  // top blade sweeping up-right, sharp point at the left
  if (inTri(p, [0.285, 0.44], [0.60, 0.235], [0.66, 0.33])) return true;
  // right stem of the "i"
  if (capsule(u, v, 0.645, 0.345, 0.625, 0.56, 0.05)) return true;
  // dot of the "i"
  if ((u - 0.655) ** 2 + (v - 0.225) ** 2 <= 0.05 ** 2) return true;
  return false;
}

// scale around the centre, then draw rings + monogram
function logo(u, v, scale, withRings) {
  const lu = 0.5 + (u - 0.5) / scale;
  const lv = 0.5 + (v - 0.5) / scale;
  if (tealMark(lu, lv)) return TEAL;
  if (indigoMark(lu, lv)) return INDIGO;
  if (withRings) {
    if (ring(lu, lv, 0.475, 0.011)) return RING_INDIGO;
    if (ring(lu, lv, 0.435, 0.009)) return TEAL;
  }
  return null;
}

// ---- per-asset shaders ----------------------------------------------------
function iconPixel(u, v) {
  return logo(u, v, 1, true) || (inRoundRect(u, v, 0.5, 0.5, 0.5, 0.5, 0.22) ? WHITE : CLEAR);
}
function splashPixel(u, v) {
  return logo(u, v, 1, true) || (disc(u, v, 0.49) ? WHITE : CLEAR);
}
function adaptivePixel(u, v) {
  // transparent; Android composes over adaptiveIcon.backgroundColor (#ffffff)
  return logo(u, v, 0.66, true) || CLEAR;
}

// ---- render (4x supersampled, premultiplied edges) ------------------------
function render(size, fn) {
  const out = Buffer.alloc(size * size * 4);
  const ss = 4;
  const n = ss * ss;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let pr = 0, pg = 0, pb = 0, pa = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = fn((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size);
          const a = c[3];
          pr += c[0] * a; pg += c[1] * a; pb += c[2] * a; pa += a;
        }
      }
      const i = (y * size + x) * 4;
      const a = pa / n;
      if (a > 0) {
        out[i] = Math.round(pr / pa);
        out[i + 1] = Math.round(pg / pa);
        out[i + 2] = Math.round(pb / pa);
        out[i + 3] = Math.round(a);
      }
    }
  }
  return out;
}

const dir = path.join(__dirname, "..", "assets");
fs.mkdirSync(dir, { recursive: true });
const jobs = [
  ["icon.png", 1024, iconPixel],
  ["adaptive-icon.png", 1024, adaptivePixel],
  ["splash-icon.png", 1024, splashPixel],
  ["favicon.png", 48, iconPixel],
];
for (const [name, size, fn] of jobs) {
  const png = encodePNG(size, render(size, fn));
  fs.writeFileSync(path.join(dir, name), png);
  console.log(`wrote assets/${name} (${size}x${size}, ${png.length} bytes)`);
}
console.log("done");
