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

describe("GEO transponder", () => {
  let serverToken: us_listen_socket | null = null;
  const LISTEN_PORT = 9001;

  beforeAll(async () => {
    const { token } = await createServer(LISTEN_PORT);
    serverToken = token;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
    if (null === serverToken) {
      return;
    }
    us_listen_socket_close(serverToken);
  });

  it("should log success when receiving valid data", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const client = new WebSocket(`ws://localhost:${LISTEN_PORT}`);
    client.binaryType = "arraybuffer";

    await new Promise<void>((resolve) => {
      client.onopen = () => {
        const validPayload = create(PlayerPositionSchema, {
          mapId: 1,
          lat: 100,
          long: 100,
        });
        client.send(toBinary(PlayerPositionSchema, validPayload));
        resolve();
      };
    });

    await new Promise((res) => setTimeout(res, 50));

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Received"),
      expect.objectContaining({
        mapId: 1,
        lat: 100,
        long: 100,
      }),
    );
    client.close();
  });

  it("should log error when receiving non-binary data", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Discarded"));
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
          lat: 100,
          long: 100,
        });
        const validBinaryPayload = toBinary(PlayerPositionSchema, validPayload);
        // Tamper payload intentionally
        validBinaryPayload[0] = 0xff;
        validBinaryPayload[1] = 0xff;
        client.send(validBinaryPayload);
      };
      resolve();
    });

    await new Promise((res) => setTimeout(res, 50));

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("malformed"),
      expect.any(Error),
    );
  });
});
