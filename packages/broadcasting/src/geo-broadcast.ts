import type { PlayerPosition } from "@repo/contracts/player";

export interface GeoTransmitterClientStateParams {
  clientId: string;
  altitude: number;
  flags: number;
  characterName: string;
  mapId: number;
  mountId?: number;
  professionId: number;
  raceId: number;
  specializationId: number;
  channel?: string;
}

export interface GeoReceiverSubscriptionParams {
  channel: string;
  handler: (message: PlayerPosition | GeoTransmitterClientStateParams) => void;
}

export interface IGeoBroadcastTransmitter {
  broadcastPosition: (params: PlayerPosition) => Promise<void>;
}

export type IGeoStateBroadcastTransmitter = IGeoBroadcastTransmitter & {
  broadcastState: (params: GeoTransmitterClientStateParams) => Promise<void>;
};

export interface IGeoBroadcastReceiver {
  subscribe: (params: GeoReceiverSubscriptionParams) => Promise<void>;
  unsubscribe: (channel: string) => Promise<void>;
}
