import WebsocketHeartbeatJs from 'websocket-heartbeat-js';
import { z } from 'zod';
import tickerInfoSchema from './schemas/tickerInfoSchema';

const schema = z.tuple([
  z.number(), // timestamp
  tickerInfoSchema,
]);

export default class PriceFeedTickerWS {
  priceWebSocket: WebsocketHeartbeatJs;

  constructor(
    symbol: string,
    url: string,
    updateData: (pair: z.infer<typeof tickerInfoSchema>) => void,
  ) {
    this.priceWebSocket = new WebsocketHeartbeatJs({
      url: `${url}${symbol}`,
    });

    this.priceWebSocket.onmessage = (e) => {
      if (e.data === 'pong') return;
      const data = JSON.parse(e.data);
      const [, tickerData] = schema.parse(data);

      if (tickerData === undefined) return;
      updateData(tickerData);
    };
  }

  kill() {
    this.priceWebSocket.close();
  }
}
