import { z } from 'zod';
import { SupportedChainId } from '../types.js';

const isValidChainId = (chainId: string): chainId is SupportedChainId => {
  const { success } = z.nativeEnum(SupportedChainId).safeParse(chainId);
  return success;
};

export default isValidChainId;
