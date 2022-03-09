import rand from 'csprng';
import { ethers } from 'ethers';

const generateSecret = () => {
  const RANDOM_RADIX = 16;
  const RANDOM_BITS = 256;
  const random = rand(RANDOM_BITS, RANDOM_RADIX);
  const secret = ethers.utils.keccak256(`0x${random}`);
  return secret;
};

export default generateSecret;
