import { networkCodes } from '../constants';
import toUpperCase from './toUpperCase';

const isUppercasedNetworkCode = (value: string): value is Uppercase<typeof networkCodes[number]> => networkCodes
  .map(toUpperCase).some((networkCode) => networkCode === value);

export default isUppercasedNetworkCode;
