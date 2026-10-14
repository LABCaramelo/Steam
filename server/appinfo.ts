// Reader for appcache/appinfo.vdf (binary KeyValues), versions 0x07564427/28/29.
// v29 replaced inline key strings with indices into a string table stored at the end of the file.

export interface AppInfoEntry {
  appid: number;
  data: BinKv;
}
export type BinKv = { [key: string]: string | number | bigint | BinKv };

const MAGIC_27 = 0x07564427;
const MAGIC_28 = 0x07564428;
const MAGIC_29 = 0x07564429;

const T_NONE = 0x00; // nested map
const T_STRING = 0x01;
const T_INT32 = 0x02;
const T_FLOAT32 = 0x03;
const T_POINTER = 0x04;
const T_WSTRING = 0x05;
const T_COLOR = 0x06;
const T_UINT64 = 0x07;
const T_END = 0x08;
const T_INT64 = 0x0a;
const T_END_ALT = 0x0b;

export function parseAppInfo(buf: Buffer): AppInfoEntry[] {
  let off = 0;
  const magic = buf.readUInt32LE(off);
  off += 8; // magic + universe
  if (magic !== MAGIC_27 && magic !== MAGIC_28 && magic !== MAGIC_29) {
    throw new Error(`appinfo.vdf: versão desconhecida 0x${magic.toString(16)}`);
  }

  let strings: string[] | null = null;
  if (magic === MAGIC_29) {
    const tableOff = Number(buf.readBigInt64LE(off));
    off += 8;
    strings = [];
    let p = tableOff;
    const count = buf.readUInt32LE(p);
    p += 4;
    for (let s = 0; s < count; s++) {
      const end = buf.indexOf(0, p);
      strings.push(buf.toString("utf8", p, end));
      p = end + 1;
    }
  }

  const readCString = (): string => {
    const end = buf.indexOf(0, off);
    const s = buf.toString("utf8", off, end);
    off = end + 1;
    return s;
  };
  const readKey = (): string => {
    if (strings) {
      const idx = buf.readUInt32LE(off);
      off += 4;
      return strings[idx] ?? `#${idx}`;
    }
    return readCString();
  };

  const readMap = (): BinKv => {
    const out: BinKv = {};
    for (;;) {
      const type = buf[off++];
      if (type === T_END || type === T_END_ALT) return out;
      const key = readKey();
      switch (type) {
        case T_NONE:
          out[key] = readMap();
          break;
        case T_STRING:
          out[key] = readCString();
          break;
        case T_INT32:
        case T_POINTER:
        case T_COLOR:
          out[key] = buf.readInt32LE(off);
          off += 4;
          break;
        case T_FLOAT32:
          out[key] = buf.readFloatLE(off);
          off += 4;
          break;
        case T_UINT64:
          out[key] = buf.readBigUInt64LE(off);
          off += 8;
          break;
        case T_INT64:
          out[key] = buf.readBigInt64LE(off);
          off += 8;
          break;
        case T_WSTRING: {
          let end = off;
          while (buf.readUInt16LE(end) !== 0) end += 2;
          out[key] = buf.toString("utf16le", off, end);
          off = end + 2;
          break;
        }
        default:
          throw new Error(`appinfo.vdf: tipo KV desconhecido ${type} em ${off - 1}`);
      }
    }
  };

  const entries: AppInfoEntry[] = [];
  for (;;) {
    const appid = buf.readUInt32LE(off);
    if (appid === 0) break;
    const size = buf.readUInt32LE(off + 4);
    const next = off + 8 + size;
    // infoState(4) lastUpdated(4) picsToken(8) sha1(20) changeNumber(4) [binarySha1(20) for v28+]
    off += 8 + 4 + 4 + 8 + 20 + 4 + (magic === MAGIC_27 ? 0 : 20);
    try {
      const data = readMap();
      entries.push({ appid, data: (data.appinfo as BinKv) ?? data });
    } catch {
      // A corrupt entry should not hide the rest of the library.
    }
    off = next;
  }
  return entries;
}
