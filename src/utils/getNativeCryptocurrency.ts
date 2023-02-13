import { ethers } from 'ethers';

const getNativeCryptocurrency = (assetToAddress: Partial<Record<string, string>>) => {
  const addressToAsset = Object
    .entries(assetToAddress)
    .reduce<Partial<Record<string, string>>>((prev, [asset, address]) => {
    if (address === undefined) return prev;
    return {
      ...prev,
      [address]: asset,
    };
  }, {});

  const nativeCryptocurrency = addressToAsset[ethers.constants.AddressZero];
  if (nativeCryptocurrency === undefined) throw new Error('Native cryptocurrency asset is not found');
  return nativeCryptocurrency;
};

export default getNativeCryptocurrency;
