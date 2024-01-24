import { ethers } from 'ethers';
class XorShift128Plus {
  private x: number;
  private y: number;

  constructor(seed: number) {
    this.x = seed;
    this.y = seed ^ 0x6d2b79f5; // 0x6d2b79f5 is the golden ratio
  }

  public nextInt32(): number {
    let x = this.x;
    const y = this.y;

    this.x = y;
    x ^= x << 23;
    x ^= x >> 17;
    x ^= y ^ (y >> 26);

    this.y = x;
    return x + y;
  }
}

function generateSeed(): number {
  return Math.floor(Date.now() * Math.random());
}

function generateRandomBytes(size: number, rng: XorShift128Plus): Uint8Array {
  const buffer = new Uint8Array(size);

  for (let i = 0; i < size; i++) {
    buffer[i] = rng.nextInt32() & 0xff;
  }

  return buffer;
}

function isomorphicCryptoRandomBytes(size: number): Uint8Array {
  const seed = generateSeed();
  const rng = new XorShift128Plus(seed);
  return generateRandomBytes(size, rng);
}

const generateSecret = () => {
  const RANDOM_BITS = 256;
  const rand = isomorphicCryptoRandomBytes(RANDOM_BITS);
  const secret = ethers.keccak256(rand);
  return secret;
};

export default generateSecret;
