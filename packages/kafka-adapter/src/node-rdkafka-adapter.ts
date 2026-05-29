import type { IInitializable } from "@repo/core/lifecycle.js";
import type { IMessagePublisher } from "@repo/messaging/message-broker.js";
import Kafka from "node-rdkafka";

export interface KafkaRdAdapterParams {
  clientId: string;
  brokers: string[];
  queueBufferingMaxMessages: number;
  queueBufferingMaxMs: number;
  batchNumMessages: number;
  compressionCodec: "none";
  requestRequiredAcks: number;
  eventCb: boolean;
}

export function createKafkaPublisher(
  params: KafkaRdAdapterParams,
): IInitializable & IMessagePublisher {
  const kafka = new Kafka.HighLevelProducer(
    {
      "metadata.broker.list": params.brokers.join(","),
      "queue.buffering.max.messages": params.queueBufferingMaxMessages,
      "queue.buffering.max.ms": params.queueBufferingMaxMs,
      "batch.num.messages": params.batchNumMessages,
      "compression.codec": params.compressionCodec,
      dr_cb: true,
      "client.id": params.clientId,
      event_cb: true,
    },
    { acks: params.requestRequiredAcks },
  );

  return {
    connect: async () => {
      return new Promise((resolve) => {
        kafka.on("ready", () => {
          console.log("Connected");
          resolve();
        });
        kafka.connect();
      });
    },
    disconnect: async () => {
      kafka.disconnect();
    },
    publish: async (params) =>
      kafka.produce(
        params.topic,
        null,
        params.message,
        params.key,
        Date.now(),
        () => {},
      ),
  };
}
