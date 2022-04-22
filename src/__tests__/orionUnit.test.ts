import initOrionUnit from '../initOrionUnit';
import OrionUnit from '../OrionUnit';

describe('OrionUnit', () => {
  test('OrionUnit init is defined', () => {
    const orionUnit = initOrionUnit('0x61', 'testing');
    expect(orionUnit).toBeDefined();
  });

  test('OrionUnit is instance of OrionUnit', () => {

    const orionUnit = initOrionUnit('0x61', 'testing');
    expect(orionUnit).toBeInstanceOf(OrionUnit);
  });
});

export {};
