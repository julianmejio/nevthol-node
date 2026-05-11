import { type Admin, Kafka, Partitioners } from "kafkajs";

export interface MessagingProvider {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  admin: () => Admin;
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
    admin: (): Admin => kafka.admin(),
    sendBinary: async (
      topic: string,
      value: { key?: string; value: Buffer }[],
    ) => {
      await producer.send({ topic, messages: value });
    },
  };
};
