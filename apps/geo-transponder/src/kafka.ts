import {
  type Consumer,
  type ConsumerConfig,
  Kafka,
  Partitioners,
} from "kafkajs";

export interface MessagingProvider {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  createTopic: ({ name }: { name: string }) => Promise<boolean>;
  consumer: (config: ConsumerConfig) => Consumer;
  sendBinary: (
    topic: string,
    value: { key?: string; value: Buffer }[],
  ) => Promise<void>;
}

export const createKafkaProvider = ({
  clientId,
  brokers,
}: {
  clientId: string;
  brokers: string[];
}): MessagingProvider => {
  const kafka = new Kafka({ clientId, brokers });
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });

  return {
    connect: () => producer.connect(),
    disconnect: () => producer.disconnect(),
    createTopic: ({ name }) =>
      kafka.admin().createTopics({
        topics: [{ topic: name }],
        waitForLeaders: true,
      }),
    consumer: (config: ConsumerConfig) => kafka.consumer(config),
    sendBinary: async (
      topic: string,
      value: { key?: string; value: Buffer }[],
    ) => {
      await producer.send({ topic, messages: value });
    },
  };
};
