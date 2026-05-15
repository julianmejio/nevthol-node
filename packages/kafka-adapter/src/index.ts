import { type IMessagePublisher } from "@repo/messaging/message-broker.js";
import { type IInitializable } from "@repo/core/lifecycle.js";
import { Kafka, type Message, Partitioners } from "kafkajs";

export interface KafkaAdapterParams {
  clientId: string;
  brokers: string[];
}

export function createKafkaPublisher(
  params: KafkaAdapterParams,
): IInitializable & IMessagePublisher {
  const { clientId, brokers } = params;
  const kafka = new Kafka({ clientId, brokers });
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });

  return {
    connect: () => producer.connect(),
    disconnect: () => producer.disconnect(),
    publish: async (params) => {
      const { topic, key, message } = params;
      const messages: Message[] = [
        {
          key: key || null,
          value: message,
        },
      ];
      await producer.send({ topic, messages });
    },
  };
}
