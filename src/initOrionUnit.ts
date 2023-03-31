import OrionUnit from './OrionUnit/index.js';

// backward compatibility
export default function initOrionUnit(...params: ConstructorParameters<typeof OrionUnit>) {
  return new OrionUnit(
    ...params,
  );
}
