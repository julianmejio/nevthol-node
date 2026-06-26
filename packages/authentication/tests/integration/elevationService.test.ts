import { describe, expect, it } from "vitest";
import { createElevationService } from "../../src/elevationService";
import { createMockAccountApi, createMockStore } from "../mocks";

describe("Elevation service", () => {
  const accountApi = createMockAccountApi();
  const store = createMockStore();
  const elevationService = createElevationService({
    accountApi,
    store,
    privateKey:
      "-----BEGIN EC PRIVATE KEY-----\n" +
      "MHcCAQEEIJ0B0kE6h5fP1kbC8upwCLARaozUoPy9oFEDtQcVQDNNoAoGCCqGSM49\n" +
      "AwEHoUQDQgAE8xwxjXKIgcKCbkPHXm7lQGP3y2OLNZV1aPYqqEkDHFgWtMJTSCcO\n" +
      "kv/3X8Gl4qlJiDAqjFcsUFZpyKM7qLPkDg==\n" +
      "-----END EC PRIVATE KEY-----",
    publicKey:
      "-----BEGIN PUBLIC KEY-----\n" +
      "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8xwxjXKIgcKCbkPHXm7lQGP3y2OL\n" +
      "NZV1aPYqqEkDHFgWtMJTSCcOkv/3X8Gl4qlJiDAqjFcsUFZpyKM7qLPkDg==\n" +
      "-----END PUBLIC KEY-----",
    ikm: Buffer.from("PAcR9G2CbwEC2GJMjtwCmE82uXxJ06YUUSUAYK64ATM=", "base64"),
  });
  it("should create a challenge for a given token", async () => {
    const challenge = await elevationService.challenge("token-test", 300);
    expect(challenge).toHaveProperty("test");
  });
  it("should verify a challenge-response", async () => {
    const valid = await elevationService.solve({
      id: "00000",
      solution: "token-test",
    });
    console.log(valid);
    expect(valid).toBeTypeOf("string");
  });
});
