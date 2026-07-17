import {
  type ConsumerParams,
  type IMessageConsumer,
  type IMessagePublisher,
} from "@repo/messaging/message-broker";
import { type IInitializable } from "@repo/core/lifecycle";
import { Kafka, type Message, Partitioners } from "kafkajs";
import type { KafkaConsumerParams } from "./common.js";

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

export function createKafkaConsumer(
  params: KafkaAdapterParams & KafkaConsumerParams,
): IInitializable & IMessageConsumer {
  const { clientId, brokers, groupId } = params;
  const kafka = new Kafka({ clientId, brokers });
  const consumer = kafka.consumer({ groupId });

  return {
    connect: () => consumer.connect(),
    disconnect: () => consumer.disconnect(),
    subscribe: async (params: ConsumerParams) => {
      await consumer.subscribe({
        topic: params.topic,
        fromBeginning: true,
      });

      await consumer.run({
        eachMessage: async ({ message }) => {
          if (null === message.value) {
            return;
          }
          const key: string | null =
            message.key instanceof Buffer
              ? message.key.toString()
              : message.key !== null && message.key !== undefined
                ? String(message.key)
                : null;
          await params.onmessage({
            key,
            headers: message.headers,
            contents: message.value,
          });
        },
      });
    },
  };
}
