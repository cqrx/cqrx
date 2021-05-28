import {
  ConnectionSettings,
  GossipSeed,
  TcpEndPoint,
} from 'node-eventstore-client';

export interface Config {
  connection: ConnectionSettings;
  tcpEndpoint?: TcpEndPoint | string;
  gossipSeeds?: GossipSeed[];
}
