import { z } from 'zod';
import WebSocket from 'isomorphic-ws';
import tickerInfoSchema from './schemas/tickerInfoSchema';

const schema = z.array(z.union([
  z.number(),
  tickerInfoSchema,
]));
export default class PriceFeedAllTickersWS {
  private pairsWebSocket: WebSocket;

  private heartbeatInterval: ReturnType<typeof setInterval>;

  constructor(
    url: string,
    updateData: (pairs: z.infer<typeof tickerInfoSchema>[]) => void,
  ) {
    this.pairsWebSocket = new WebSocket(url);

    this.heartbeatInterval = setInterval(() => {
      this.pairsWebSocket.send('heartbeat');
    }, 15000);

    this.pairsWebSocket.onmessage = (e) => {
      if (e.data === 'pong') return;
      const json: unknown = JSON.parse(e.data.toString());
      const data = schema.parse(json);
      data.shift(); // Unnecessary timestamp
      const tickersData = z.array(tickerInfoSchema).parse(data);

      updateData(tickersData);
    };
  }

  kill() {
    clearInterval(this.heartbeatInterval);
    this.pairsWebSocket.close();
  }
}
