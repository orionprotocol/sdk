import { type Factory } from '../types.js';
import { factories } from '../index.js';

const isValidFactory = (factory: string): factory is Factory => {
  return factories.some((f) => f === factory);
};

export default isValidFactory;
