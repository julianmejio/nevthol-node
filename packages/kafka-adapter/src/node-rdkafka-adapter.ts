import type { IInitializable } from "@repo/core/lifecycle";
import type {
  ConsumerParams,
  IMessageConsumer,
  IMessagePublisher,
} from "@repo/messaging/message-broker.js";
import Kafka, { type ConsumerTopicConfig } from "node-rdkafka";
import type {
  KafkaCommonAdapterParams,
  KafkaConsumerParams,
} from "./common.js";

export interface KafkaRdAdapterParams {
  clientId: string;
  queueBufferingMaxMessages: number;
  queueBufferingMaxMs: number;
  batchNumMessages: number;
  compressionCodec: "none";
  requestRequiredAcks: number;
  eventCb: boolean;
}

export interface KafkaRdConsumerParams {
  fetchMinBytes: number;
  fetchWaitMaxMs: number;
  fetchMessageMaxBytes: number;
  enableAutoCommit: boolean;
  queuedMinMessages: number;
  autoOffsetReset: ConsumerTopicConfig["auto.offset.reset"];
}

export function createKafkaConsumer(
  params: KafkaCommonAdapterParams &
    KafkaConsumerParams &
    KafkaRdConsumerParams,
): IMessageConsumer & IInitializable {
  const kafka = new Kafka.KafkaConsumer(
    {
      // 1. Connection settings
      "metadata.broker.list": params.brokers.join(","),
      "group.id": params.groupId,

      // 2. Optimizations
      "fetch.min.bytes": params.fetchMinBytes, // 1024 * 64, // Wait until 64KB of data is ready in the buffer
      "fetch.wait.max.ms": params.fetchWaitMaxMs, //50, // ...or wait a max of 50ms before delivering
      "fetch.message.max.bytes": params.fetchMessageMaxBytes, //1024 * 1024 * 10, // Max fetch size per request (10MB)

      // 3. Offset and Commit optimizations
      "enable.auto.commit": params.enableAutoCommit, //false, // Turn off individual message tracking

      // 4. Memory queuing
      "queued.min.messages": params.queuedMinMessages, //500000, // Keep up to 500k messages pre-fetched in native C++ memory
    },
    {
      "auto.offset.reset": params.autoOffsetReset, // "latest",
    },
  );
  return {
    connect: async () => {
      return new Promise((resolve) => {
        kafka.on("ready", () => {
          resolve();
        });
        kafka.connect();
      });
    },
    disconnect: async () => {
      kafka.disconnect();
    },
    subscribe: async (params: ConsumerParams) => {
      kafka.subscribe([params.topic]);
      kafka.consume();
      kafka.on("data", (message: Kafka.Message) => {
        const key: string | null =
          message.key instanceof Buffer
            ? message.key.toString()
            : message.key !== null && message.key !== undefined
              ? String(message.key)
              : null;
        params.onmessage({
          key,
          headers: (message.headers as unknown[]) || [],
          contents: Buffer.from(message.value as Buffer),
        });
      });
    },
  };
}

export function createKafkaPublisher(
  params: KafkaCommonAdapterParams & KafkaRdAdapterParams,
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
        -1,
        params.message,
        params.key,
        Date.now(),
        () => {},
      ),
  };
}
