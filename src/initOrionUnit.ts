import OrionUnit from './OrionUnit';

// backward compatibility
export default function initOrionUnit(...params: ConstructorParameters<typeof OrionUnit>) {
  return new OrionUnit(
    ...params,
  );
}
