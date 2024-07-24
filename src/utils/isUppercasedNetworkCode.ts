import { networkCodes } from '../constants/index.js';
import toUpperCase from './toUpperCase.js';
import type { NetworkShortName } from '../types';

const isUppercasedNetworkCode = (value: string): value is NetworkShortName => networkCodes
  .map(toUpperCase).some((networkCode) => networkCode === value);

export default isUppercasedNetworkCode;
