import { describe, it, expect, beforeEach } from "vitest";

interface BatchEvent {
  eventType: string;
  timestamp: bigint;
  location: string;
  actor: string;
  details: string;
}

interface MockContract {
  admin: string;
  paused: boolean;
  eventCounter: bigint;
  trustedOracles: Map<string, boolean>;
  batchEvents: Map<string, BatchEvent>;
  addOracle(caller: string, oracle: string): { value: boolean } | { error: number };
  logEvent(caller: string, batchId: bigint, eventType: string, location: string, details: string): { value: bigint } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  eventCounter: 0n,
  trustedOracles: new Map(),
  batchEvents: new Map(),
  addOracle(caller, oracle) {
    if (caller !== this.admin) return { error: 100 };
    if (oracle === "SP000000000000000000002Q6VF78") return { error: 105 };
    this.trustedOracles.set(oracle, true);
    return { value: true };
  },
  logEvent(caller, batchId, eventType, location, details) {
    if (this.paused) return { error: 104 };
    if (!this.trustedOracles.get(caller)) return { error: 106 };
    const eventId = this.eventCounter + 1n;
    this.batchEvents.set(`${batchId}:${eventId}`, { eventType, timestamp: 100n, location, actor: caller, details });
    this.eventCounter = eventId;
    return { value: eventId };
  },
  setPaused(caller, pause) {
    if (caller !== this.admin) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  }
};

describe("Supply Chain Tracking Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.eventCounter = 0n;
    mockContract.trustedOracles = new Map();
    mockContract.batchEvents = new Map();
  });

  it("should add trusted oracle", () => {
    const result = mockContract.addOracle(mockContract.admin, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.trustedOracles.get("ST2CY5...")).toBe(true);
  });

  it("should log event by trusted oracle", () => {
    mockContract.addOracle(mockContract.admin, "ST2CY5...");
    const result = mockContract.logEvent("ST2CY5...", 1n, "harvest", "Colombia", "Organic certified");
    expect(result).toEqual({ value: 1n });
    expect(mockContract.batchEvents.get("1:1")).toEqual({
      eventType: "harvest",
      timestamp: 100n,
      location: "Colombia",
      actor: "ST2CY5...",
      details: "Organic certified"
    });
  });

  it("should prevent logging by non-trusted oracle", () => {
    const result = mockContract.logEvent("ST2CY5...", 1n, "harvest", "Colombia", "Organic certified");
    expect(result).toEqual({ error: 106 });
  });

  it("should prevent actions when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    mockContract.addOracle(mockContract.admin, "ST2CY5...");
    const result = mockContract.logEvent("ST2CY5...", 1n, "harvest", "Colombia", "Organic certified");
    expect(result).toEqual({ error: 104 });
  });

  it("should prevent non-admin from adding oracle", () => {
    const result = mockContract.addOracle("ST2CY5...", "ST3NB...");
    expect(result).toEqual({ error: 100 });
  });
});