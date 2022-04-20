import WebsocketHeartbeatJs from 'websocket-heartbeat-js';
import { z } from 'zod';
import tickerInfoSchema from './schemas/tickerInfoSchema';

const schema = z.array(z.union([
  z.number(),
  tickerInfoSchema,
]));
export default class PriceFeedAllTickersWS {
  private pairsWebSocket: WebsocketHeartbeatJs;

  constructor(
    url: string,
    updateData: (pairs: z.infer<typeof tickerInfoSchema>[]) => void,
  ) {
    this.pairsWebSocket = new WebsocketHeartbeatJs({ url });

    this.pairsWebSocket.onmessage = (e) => {
      if (e.data === 'pong') return;
      const json = JSON.parse(e.data);
      const data = schema.parse(json);
      data.shift(); // Unnecessary timestamp
      const tickersData = z.array(tickerInfoSchema).parse(data);

      updateData(tickersData);
    };
  }

  kill() {
    this.pairsWebSocket.close();
  }
}
