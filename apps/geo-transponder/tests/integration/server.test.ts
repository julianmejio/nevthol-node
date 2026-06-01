import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { type us_listen_socket, us_listen_socket_close } from "uWebSockets.js";
import { createServer } from "../../src/server";
import { PlayerPositionSchema } from "@repo/contracts/pb/player_position/v1/player_position_pb.js";
import { create, toBinary } from "@bufbuild/protobuf";
import { Violation } from "@bufbuild/protovalidate";
import { type IMessagePublisher } from "@repo/messaging/message-broker.js";
import { createKafkaPublisher } from "@repo/kafka-adapter/node-rdkafka";
import { type IInitializable } from "@repo/core/lifecycle.js";

describe("GEO transponder", () => {
  let serverToken: us_listen_socket | null = null;
  let messenger: IInitializable & IMessagePublisher;
  const LISTEN_PORT = 9001;

  beforeAll(async () => {
    messenger = createKafkaPublisher({
      clientId: "geo-transponder-test",
      brokers: [process.env.KAFKA_BROKERS!],
      queueBufferingMaxMessages: 1000000,
      queueBufferingMaxMs: 50,
      batchNumMessages: 10000,
      compressionCodec: "none",
      requestRequiredAcks: 1,
      eventCb: true,
    });
    await messenger.connect();
    const { token } = await createServer({
      listeningPort: LISTEN_PORT,
      messenger,
      topicName: "player-position-v1",
    });
    serverToken = token;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await messenger.disconnect();
    if (null === serverToken) {
      return;
    }
    us_listen_socket_close(serverToken);
  });

  it("should log success when receiving valid data", async () => {
    const logSpy = vi.spyOn(messenger, "publish");

    const client = new WebSocket(`ws://localhost:${LISTEN_PORT}`);
    client.binaryType = "arraybuffer";

    const validPayload = create(PlayerPositionSchema, {
      mapId: 1,
      x: 10000,
      y: 100,
      z: 100,
    });

    await new Promise<void>((resolve) => {
      client.onopen = () => {
        client.send(toBinary(PlayerPositionSchema, validPayload));
        resolve();
      };
    });

    await new Promise((res) => setTimeout(res, 50));

    expect(logSpy).toHaveBeenCalledWith({
      key: "Nevthol",
      topic: "player-position-v1",
      message: Buffer.from(
        new Uint8Array(toBinary(PlayerPositionSchema, validPayload)),
      ),
    });
    client.close();
  });

  it("should log error when receiving non-binary data", async () => {
    const logSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const client = new WebSocket(`ws://localhost:${LISTEN_PORT}`);

    await new Promise<void>((resolve) => {
      client.onopen = () => {
        const invalidPayload = {
          mapId: 300,
          lat: 250,
          long: 1283,
        };
        // Send non-binary payload
        client.send(JSON.stringify(invalidPayload));
        resolve();
      };
    });

    await new Promise((res) => setTimeout(res, 50));

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching("Message received is not binary"),
    );
    client.close();
  });

  it("should log error when receiving invalid payload", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const client = new WebSocket(`ws://localhost:${LISTEN_PORT}`);
    client.binaryType = "arraybuffer";

    await new Promise<void>((resolve) => {
      client.onopen = () => {
        const validPayload = create(PlayerPositionSchema, {
          mapId: 1,
        });
        const validBinaryPayload = toBinary(PlayerPositionSchema, validPayload);
        client.send(validBinaryPayload);
      };
      resolve();
    });

    await new Promise((res) => setTimeout(res, 50));

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching("Invalid message received"),
      expect.any(Array<Violation>),
    );
  });
});
