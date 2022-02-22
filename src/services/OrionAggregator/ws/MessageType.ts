enum MessageType {
  ERROR = 'e',
  PING_PONG = 'pp',
  INITIALIZATION = 'i',
  AGGREGATED_ORDER_BOOK_UPDATE = 'aobu',
  ASSET_PAIRS_CONFIG_UPDATE = 'apcu',
  ADDRESS_UPDATE = 'au',
  BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATE = 'btasabu'
}

export default MessageType;
