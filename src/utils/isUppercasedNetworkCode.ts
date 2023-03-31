import { networkCodes } from '../constants/index.js';
import toUpperCase from './toUpperCase.js';

const isUppercasedNetworkCode = (value: string): value is Uppercase<typeof networkCodes[number]> => networkCodes
  .map(toUpperCase).some((networkCode) => networkCode === value);

export default isUppercasedNetworkCode;
