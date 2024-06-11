import { ERC20__factory } from '@orionprotocol/contracts/lib/ethers-v6-cjs/index.js';
import { ethers } from 'ethers';
import invariant from 'tiny-invariant';

const checkIsToken = async (address: string, provider?: ethers.Provider) => {
  invariant(provider, 'No provider for token checking');
  const tokenContract = ERC20__factory.connect(address, provider);
  try {
    const results = await Promise.all(
      [
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
        tokenContract.balanceOf(ethers.ZeroAddress),
      ],
    );

    return Boolean(results);
  } catch (err) {
    return false;
  }
};

export default checkIsToken;
