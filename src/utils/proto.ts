export interface ProtoField {
  type: "varint" | "64bit" | "msg" | "string" | "bytes" | "32bit";
  value: any;
}

export type ProtoDict = Record<number, ProtoField[]>;

/** Return the first varint value for `fieldNum`, or `fallback` if absent. */
export const getVarint = (dict: ProtoDict, fieldNum: number, fallback = 0): number => {
  const list = dict[fieldNum];
  if (list) {
    for (const f of list) {
      if (f.type === "varint") return f.value;
    }
  }
  return fallback;
};

/** Return the first string value for `fieldNum`, or `fallback` if absent. */
export const getString = (dict: ProtoDict, fieldNum: number, fallback = ""): string => {
  const list = dict[fieldNum];
  if (list) {
    for (const f of list) {
      if (f.type === "string") return f.value;
    }
  }
  return fallback;
};

/** Return all sub-message dicts for `fieldNum`. */
export const getSubMessages = (dict: ProtoDict, fieldNum: number): ProtoDict[] => {
  const list = dict[fieldNum];
  if (!list) return [];
  return list.filter((f) => f.type === "msg").map((f) => f.value as ProtoDict);
};

/** Return the first sub-message dict for `fieldNum`, or `null` if absent. */
export const getFirstSubMessage = (dict: ProtoDict, fieldNum: number): ProtoDict | null => {
  const list = dict[fieldNum];
  if (list) {
    for (const f of list) {
      if (f.type === "msg") return f.value as ProtoDict;
    }
  }
  return null;
};

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export const parseVarint = (data: Uint8Array, state: { pos: number }): number => {
  let val = 0;
  let shift = 0;
  while (true) {
    if (state.pos >= data.length) {
      throw new Error("Unexpected EOF reading varint");
    }
    const b = data[state.pos++];
    // Use BigInt representation if shift exceeds 28 bits to prevent precision loss,
    // but standard varints fit in number.
    val |= (b & 0x7f) << shift;
    if (!(b & 0x80)) {
      break;
    }
    shift += 7;
  }
  return val;
};

export const parseProtoToDict = (data: Uint8Array, start = 0, end?: number): ProtoDict => {
  const result: ProtoDict = {};
  const state = { pos: start };
  const stop = end ?? data.length;

  while (state.pos < stop) {
    if (state.pos >= data.length) break;

    const tag = parseVarint(data, state);
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;

    // Proto fields are 1-indexed; field 0 is invalid and usually means corruption.
    if (fieldNum === 0) break;

    if (!result[fieldNum]) {
      result[fieldNum] = [];
    }

    switch (wireType) {
      case 0: {
        // Varint
        const val = parseVarint(data, state);
        result[fieldNum].push({ type: "varint", value: val });
        break;
      }
      case 1: {
        // 64-bit fixed
        if (state.pos + 8 > data.length) return result;
        const buf = data.subarray(state.pos, state.pos + 8);
        state.pos += 8;
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        result[fieldNum].push({ type: "64bit", value: Number(view.getBigUint64(0, true)) });
        break;
      }
      case 2: {
        // Length-delimited (string, bytes, or sub-message)
        const length = parseVarint(data, state);
        if (state.pos + length > data.length) return result;
        const val = data.subarray(state.pos, state.pos + length);
        state.pos += length;

        // Try recursive sub-message parse first
        if (tryPushSubMessage(result, fieldNum, val)) break;

        // Fall back to string or raw bytes
        pushStringOrBytes(result, fieldNum, val);
        break;
      }
      case 5: {
        // 32-bit fixed
        if (state.pos + 4 > data.length) return result;
        const buf = data.subarray(state.pos, state.pos + 4);
        state.pos += 4;
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        result[fieldNum].push({ type: "32bit", value: view.getUint32(0, true) });
        break;
      }
      default:
        throw new Error(`Unknown wire type ${wireType} at pos ${state.pos}`);
    }
  }

  return result;
};

/** Attempt to parse `bytes` as a nested proto message. Returns true on success. */
const tryPushSubMessage = (result: ProtoDict, fieldNum: number, bytes: Uint8Array): boolean => {
  try {
    const sub = parseProtoToDict(bytes);
    if (Object.keys(sub).length > 0) {
      result[fieldNum].push({ type: "msg", value: sub });
      return true;
    }
  } catch {
    // Not a valid sub-message – fall through
  }
  return false;
};

/** Push `bytes` as either a UTF-8 string or raw bytes. */
const pushStringOrBytes = (result: ProtoDict, fieldNum: number, bytes: Uint8Array): void => {
  try {
    const s = utf8Decoder.decode(bytes);
    const isPrintable = isPrintableString(s);
    result[fieldNum].push(
      isPrintable ? { type: "string", value: s } : { type: "bytes", value: bytes },
    );
  } catch {
    result[fieldNum].push({ type: "bytes", value: bytes });
  }
};

const isPrintableString = (s: string): boolean => {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      return false;
    }
  }
  return true;
};

// ── Metadata extraction ────────────────────────────────────────────────

export interface ExtractedUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

export const extractMetadata = (parsedProto: ProtoDict): ExtractedUsage => {
  let model = "Unknown Model";
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let cachedTokens = 0;

  // Outer field 1 contains the top-level metadata message(s)
  for (const f1 of getSubMessages(parsedProto, 1)) {
    // Model display name (field 21) preferred; fall back to system model id (field 19)
    const displayName = getString(f1, 21);
    const systemId = getString(f1, 19);
    if (displayName) {
      model = displayName;
    } else if (systemId) {
      model = systemId;
    }

    // Field 3 inside field 1 is a top-level input token count
    const topInput = getVarint(f1, 3);
    if (topInput) inputTokens = topInput;

    // Field 4 inside field 1 contains detailed token-usage sub-messages
    for (const usage of getSubMessages(f1, 4)) {
      // Sub-field mapping:  1=input, 2=cached, 3=output, 5=total
      const inp = getVarint(usage, 1);
      if (inp) inputTokens = inp;

      const out = getVarint(usage, 3);
      if (out) outputTokens = out;

      const cached = getVarint(usage, 2);
      if (cached) cachedTokens = cached;

      const total = getVarint(usage, 5);
      if (total) totalTokens = total;
    }
  }

  return { model, inputTokens, outputTokens, cachedTokens, totalTokens };
};

// ── Workspace extraction ───────────────────────────────────────────────

export const extractWorkspaceFromBlob = (data: Uint8Array): string | null => {
  try {
    const parsed = parseProtoToDict(data);
    return findFileURI(parsed);
  } catch {
    return null;
  }
};

/** Recursively search a parsed proto tree for the first `file:///` URI string. */
const findFileURI = (val: unknown): string | null => {
  if (typeof val === "string" && val.startsWith("file:///")) {
    return val;
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const res = findFileURI(item);
      if (res) return res;
    }
  } else if (val && typeof val === "object") {
    if ("value" in (val as Record<string, unknown>)) {
      return findFileURI((val as Record<string, unknown>).value);
    }
    for (const key of Object.keys(val as Record<string, unknown>)) {
      const res = findFileURI((val as Record<string, unknown>)[key]);
      if (res) return res;
    }
  }
  return null;
};
