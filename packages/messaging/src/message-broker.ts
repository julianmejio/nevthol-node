export interface PublisherParams {
  topic: string;
  key?: string;
  message: Buffer;
}

export interface ConsumerParams {
  topic: string;
  onmessage: (message: Buffer) => Promise<void>;
}

export interface IMessagePublisher {
  publish(params: PublisherParams): Promise<void>;
}

export interface IMessageConsumer {
  subscribe(params: ConsumerParams): Promise<void>;
}
