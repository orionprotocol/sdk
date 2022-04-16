import io from 'socket.io-client';
import { z } from 'zod';
import balancesSchema from './schemas/balancesSchema';

const handleBalancesMessage = (
  rawData: unknown,
  updateData: (balancesData: z.infer<typeof balancesSchema>) => void,
) => {
  const data = balancesSchema.parse(rawData);
  updateData(data);
};

type UpdateBalanceDataHandler = (balancesData: z.infer<typeof balancesSchema>) => void;

export default class OrionBlockchainSocketIO {
  private socket: typeof io.Socket;

  constructor(orionBlockchainWSUrl: string) {
    const url = new URL(orionBlockchainWSUrl);
    // https://stackoverflow.com/questions/29511404/connect-to-socket-io-server-with-specific-path-and-namespace
    this.socket = io(url.origin, {
      path: `${url.pathname}socket.io`,
      transports: ['websocket'],
      autoConnect: false,
    });
  }

  connect(updateDataHandler: UpdateBalanceDataHandler) {
    if (updateDataHandler) {
      this.socket.on('balanceChange', (data: unknown) => handleBalancesMessage(data, updateDataHandler));
      this.socket.on('balances', (data: unknown) => handleBalancesMessage(data, updateDataHandler));
    }
    this.socket.connect();
  }

  close() {
    this.socket.removeAllListeners();
    this.socket.close();
  }

  resetConnection() {
    // Because Orion Blockchain does not have a subscription / unsubscribe system
    // Only way to "unsubscribe" is reset connection
    this.socket.disconnect();
    this.socket.open();
  }

  subscribeBalancesUpdate(walletAddress: string) {
    if (this.socket.connected) {
      this.socket.emit('clientAddress', walletAddress);
    } else {
      this.socket.on('connect', () => {
        this.socket.emit('clientAddress', walletAddress);
      });
    }
  }

  updateAllBalances(walletAddress: string) {
    this.socket.emit('getAllBalances', walletAddress);
  }
}
