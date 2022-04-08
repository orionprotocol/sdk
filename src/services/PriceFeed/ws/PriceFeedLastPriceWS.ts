import WebsocketHeartbeatJs from 'websocket-heartbeat-js';
import { z } from 'zod';

const schema = z.tuple([
  z.number(), // unix timestamp
  z.string(), // pair
  z.number(), // price
]);
export default class PriceFeedLastPriceWS {
  private pairsWebSocket: WebsocketHeartbeatJs;

  constructor(
    url: string,
    pair: string,
    updateData: (price: number) => void,
  ) {
    this.pairsWebSocket = new WebsocketHeartbeatJs({ url: url + pair });

    this.pairsWebSocket.onmessage = (e) => {
      if (e.data === 'pong') return;
      const json = JSON.parse(e.data);
      const [,, price] = schema.parse(json);

      updateData(price);
    };
  }

  kill() {
    this.pairsWebSocket.close();
  }
}
