import { z } from 'zod';
import { SupportedChainId } from '../types';

const isValidChainId = (chainId: string): chainId is SupportedChainId => {
  try {
    z.nativeEnum(SupportedChainId).parse(chainId);
    return true;
  } catch {
    return false;
  }
};

export default isValidChainId;
