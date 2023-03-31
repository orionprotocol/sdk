import { randomBytes } from 'crypto';
import { ethers } from 'ethers';

const generateSecret = () => {
  const RANDOM_BITS = 256;
  const rand = randomBytes(RANDOM_BITS);
  const secret = ethers.utils.keccak256(rand);
  return secret;
};

export default generateSecret;
