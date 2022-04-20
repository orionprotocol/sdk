/* eslint-disable camelcase */
import { ethers } from 'ethers';
import invariant from 'tiny-invariant';
import { ERC20__factory } from '../artifacts/contracts';

const checkIsToken = async (address: string, provider?: ethers.providers.Provider) => {
  invariant(provider, 'No provider for token checking');
  const tokenContract = ERC20__factory.connect(address, provider);
  try {
    const results = await Promise.all(
      [
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
        tokenContract.balanceOf(ethers.constants.AddressZero),
      ],
    );

    return Boolean(results);
  } catch (err) {
    return false;
  }
};

export default checkIsToken;
