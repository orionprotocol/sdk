import { random } from '@lukeed/csprng';
import { ethers } from 'ethers';

const generateSecret = () => {
  const RANDOM_BITS = 256;
  const rand = random(RANDOM_BITS);
  const secret = ethers.utils.keccak256(rand);
  return secret;
};

export default generateSecret;
