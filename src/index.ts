import BigNumber from 'bignumber.js';
import { simpleFetch, fetchWithValidation } from 'simple-typed-fetch';
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

export * as config from './config';
export { default as OrionUnit } from './OrionUnit';
export { default as Orion } from './Orion';
export { default as initOrionUnit } from './initOrionUnit';
export * as utils from './utils';
export * as services from './services';
export * as crypt from './crypt';
export * from './constants';
export * from './types';
export { simpleFetch, fetchWithValidation };
