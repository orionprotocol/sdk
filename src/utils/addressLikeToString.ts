import type { AddressLike } from "ethers";

export async function addressLikeToString(address: AddressLike): Promise<string> {
  address = await address
  if (typeof address !== 'string') {
    address = await address.getAddress()
  }
  return address.toLowerCase()
}