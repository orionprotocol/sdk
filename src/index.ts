import { BigNumber } from 'bignumber.js';
import { simpleFetch, fetchWithValidation } from 'simple-typed-fetch';
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

export * as config from './config/index.js';
export { default as OrionUnit } from './initOrionUnit.js';
export { default as Orion } from './Orion/index.js';
export { default as initOrionUnit } from './initOrionUnit.js';
export * as utils from './utils/index.js';
export * as services from './services/index.js';
export * as crypt from './crypt/index.js';
export * from './constants/index.js';
export * from './types.js';
export { simpleFetch, fetchWithValidation };
