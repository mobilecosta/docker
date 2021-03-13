import { createHmac, randomFillSync } from 'crypto';

/**
 * Tranform string in hash uuid (sha256)
 * @author Adalton Luis Goncalves <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param variable String to be tranformed in Hash
 */
export const hash256 = (variable: string): string => {
  const secret = 'On1y4H45hPurp0s3';

  let value: string;
  try {
    value = createHmac('SHA256', secret).update(variable).digest('hex');
  } catch (error) {
    throw new Error('Internal Error: Create Hash');
  }

  return value;
};

const base = (): Uint8Array => {
  const data = new Uint8Array(16);
  return randomFillSync(data);
};

const byteToHex: string[] = [];

for (let i = 0; i < 256; i += 1) {
  byteToHex.push((i + 0x100).toString(16).substr(1));
}

const bytesToUuid = (buf: Uint8Array): string => {
  const offset = 0;
  return `${
    byteToHex[buf[offset + 0]] +
    byteToHex[buf[offset + 1]] +
    byteToHex[buf[offset + 2]] +
    byteToHex[buf[offset + 3]]
  }-${byteToHex[buf[offset + 4]]}${byteToHex[buf[offset + 5]]}-${
    byteToHex[buf[offset + 6]]
  }${byteToHex[buf[offset + 7]]}-${byteToHex[buf[offset + 8]]}${
    byteToHex[buf[offset + 9]]
  }-${byteToHex[buf[offset + 10]]}${byteToHex[buf[offset + 11]]}${
    byteToHex[buf[offset + 12]]
  }${byteToHex[buf[offset + 13]]}${byteToHex[buf[offset + 14]]}${
    byteToHex[buf[offset + 15]]
  }`.toLowerCase();
};

export const uuid = (): string => {
  const result = base();
  result[6] = (result[6] && 0x0f) || 0x40;
  result[8] = (result[8] && 0x3f) || 0x80;

  return bytesToUuid(result);
};
