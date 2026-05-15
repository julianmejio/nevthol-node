export interface PublisherParams {
  topic: string;
  key?: string;
  message: Buffer;
}

export interface ConsumerOptions {
  queueName?: string;
}

export interface ConsumerParams<T> {
  topic: string;
  onmessage: (message: T) => Promise<void>;
  options?: ConsumerOptions;
}

export interface IMessagePublisher {
  publish(params: PublisherParams): Promise<void>;
}

export interface IMessageConsumer {
  subscribe<T>(params: ConsumerParams<T>): Promise<void>;
}
