import WebSocket from 'isomorphic-ws';
import { z } from 'zod';
import tickerInfoSchema from './schemas/tickerInfoSchema';

const schema = z.tuple([
  z.number(), // timestamp
  tickerInfoSchema,
]);

export default class PriceFeedTickerWS {
  priceWebSocket: WebSocket;

  constructor(
    symbol: string,
    url: string,
    updateData: (pair: z.infer<typeof tickerInfoSchema>) => void,
  ) {
    this.priceWebSocket = new WebSocket(`${url}${symbol}`);

    setInterval(() => {
      this.priceWebSocket.send('heartbeat');
    }, 15000);

    this.priceWebSocket.onmessage = (e) => {
      if (e.data === 'pong') return;
      const data: unknown = JSON.parse(e.data.toString());
      const [, tickerData] = schema.parse(data);

      if (tickerData === undefined) return;
      updateData(tickerData);
    };
  }

  kill() {
    this.priceWebSocket.close();
  }
}
