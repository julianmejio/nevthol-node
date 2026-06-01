export interface PublisherParams {
  topic: string;
  key?: string;
  message: Buffer;
}
export interface ConsumerMessageCbParams {
  key: string | null;
  headers: unknown;
  contents: Buffer;
}

export interface ConsumerParams {
  topic: string;
  onmessage: ({
    key,
    headers,
    contents,
  }: ConsumerMessageCbParams) => Promise<void>;
}

export interface IMessagePublisher {
  publish(params: PublisherParams): Promise<void>;
}

export interface IMessageConsumer {
  subscribe(params: ConsumerParams): Promise<void>;
}
