import { type SupportedChainId } from '../types';
import eip712DomainData from '../config/eip712DomainData.json';
import eip712DomainSchema from '../config/schemas/eip712DomainSchema';

const EIP712Domain = eip712DomainSchema.parse(eip712DomainData);

/**
 * See {@link https://eips.ethereum.org/EIPS/eip-712#definition-of-domainseparator}
 */
const getDomainData = (chainId: SupportedChainId) => ({
  ...EIP712Domain,
  chainId,
});

export default getDomainData;
