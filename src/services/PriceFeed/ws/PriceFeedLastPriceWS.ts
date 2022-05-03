import WebSocket from 'isomorphic-ws';
import { z } from 'zod';

const schema = z.tuple([
  z.number(), // unix timestamp
  z.string(), // pair
  z.number(), // price
]);
export default class PriceFeedLastPriceWS {
  private pairsWebSocket: WebSocket;

  constructor(
    url: string,
    pair: string,
    updateData: (price: number) => void,
  ) {
    this.pairsWebSocket = new WebSocket(url + pair);

    setInterval(() => {
      this.pairsWebSocket.send('heartbeat');
    }, 15000);

    this.pairsWebSocket.onmessage = (e) => {
      if (e.data === 'pong') return;
      const json: unknown = JSON.parse(e.data.toString());
      const [,, price] = schema.parse(json);

      updateData(price);
    };
  }

  kill() {
    this.pairsWebSocket.close();
  }
}
