import { ethers } from 'ethers';

const getNativeCryptocurrencyName = (assetToAddress: Partial<Record<string, string>>) => {
  const addressToAssetName = Object
    .entries(assetToAddress)
    .reduce<Partial<Record<string, string>>>((prev, [assetName, address]) => {
      if (address === undefined) return prev;
      return {
        ...prev,
        [address]: assetName,
      };
    }, {});

  const nativeCryptocurrencyName = addressToAssetName[ethers.constants.AddressZero];
  if (nativeCryptocurrencyName === undefined) {
    throw new Error('Native cryptocurrency asset name is not found');
  }
  return nativeCryptocurrencyName;
};

export default getNativeCryptocurrencyName;
