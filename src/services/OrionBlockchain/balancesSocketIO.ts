import io from 'socket.io-client';
import { z } from 'zod';
import balancesSchema from './schemas/balancesSchema';

const handleMessage = (
  rawData: unknown,
  updateData: (balancesData: z.infer<typeof balancesSchema>) => void,
) => {
  const data = balancesSchema.parse(rawData);
  updateData(data);
};
export default class OrionBlockchainBalancesSocketIO {
  private balancesSocket: typeof io.Socket;

  constructor(
    orionBlockchainWSUrl: string,
    updateData: (balancesData: z.infer<typeof balancesSchema>) => void,
  ) {
    const url = new URL(orionBlockchainWSUrl);
    this.balancesSocket = io(url.origin, {
      path: `${url.pathname}socket.io`,
      transports: ['websocket'],
    });

    this.balancesSocket.on('balanceChange', (data: unknown) => handleMessage(data, updateData));
    this.balancesSocket.on('balances', (data: unknown) => handleMessage(data, updateData));
  }

  resetConnection() {
    // Because Orion Blockchain does not have a subscription / unsubscribe system
    // Only way to "unsubscribe" is reset connection
    this.balancesSocket.disconnect();
    this.balancesSocket.open();
  }

  subscribeBalancesUpdate(walletAddress: string) {
    if (this.balancesSocket.connected) {
      this.balancesSocket.emit('clientAddress', walletAddress);
    } else {
      this.balancesSocket.on('connect', () => {
        this.balancesSocket.emit('clientAddress', walletAddress);
      });
    }
  }

  updateAllBalances(walletAddress: string) {
    this.balancesSocket.emit('getAllBalances', walletAddress);
  }

  // killBalancesWS() {
  //   this.balancesSocket.disconnect();
  // }
}
