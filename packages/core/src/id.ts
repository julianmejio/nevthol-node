const LETTERS = "ABCDEFGHJKMNPRTUVWXY" as const; // Based on Crockford alphabet
const DIGITS = "0123456789" as const;

/**
 * Pattern representing LLL-DDDD-LLL specs
 */
const PATTERN: readonly string[] = [
  LETTERS,
  LETTERS,
  LETTERS,
  LETTERS,
  DIGITS,
  DIGITS,
  DIGITS,
  DIGITS,
  LETTERS,
  LETTERS,
  LETTERS,
  LETTERS,
];

// Buffering random bytes. Not too large to avoid side attack channels in case of.
const BUF_SIZE = 64;
const buf = new Uint8Array(BUF_SIZE);
let bufPos = BUF_SIZE;

/**
 * Generates an ID in the format LLLDDDDLLL. Best for connection IDs. Player may remember it better
 */
export const generateId = (): string => {
  let out = "";
  let byte;

  for (const alphabet of PATTERN) {
    const mask = alphabet.length <= 16 ? 15 : 31;

    do {
      if (bufPos >= BUF_SIZE) {
        crypto.getRandomValues(buf);
        bufPos = 0;
      }
      byte = buf[bufPos++]! & mask;
    } while (byte >= alphabet.length);

    out += alphabet[byte];
  }

  return out;
};

/**
 * Adds - in each slice for improving readability.
 * @param id
 */
export const formatId = (id: string): string => {
  return `${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8)}`;
};
