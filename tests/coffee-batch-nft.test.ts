import { describe, it, expect, beforeEach } from "vitest";

interface BatchMetadata {
  farmId: string;
  harvestDate: string;
  certifications: string[];
  weight: bigint;
  variety: string;
}

interface MockContract {
  admin: string;
  paused: boolean;
  metadataFrozen: boolean;
  batchCounter: bigint;
  batchOwnership: Map<string, { owner: string }>;
  batchMetadata: Map<string, BatchMetadata>;
  mintBatch(caller: string, farmId: string, harvestDate: string, certifications: string[], weight: bigint, variety: string): { value: bigint } | { error: number };
  transferBatch(caller: string, batchId: bigint, recipient: string): { value: boolean } | { error: number };
  updateMetadata(caller: string, batchId: bigint, farmId: string, harvestDate: string, certifications: string[], weight: bigint, variety: string): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  metadataFrozen: false,
  batchCounter: 0n,
  batchOwnership: new Map(),
  batchMetadata: new Map(),
  mintBatch(caller, farmId, harvestDate, certifications, weight, variety) {
    if (caller !== this.admin) return { error: 100 };
    if (this.paused) return { error: 104 };
    const batchId = this.batchCounter + 1n;
    if (this.batchOwnership.has(batchId.toString())) return { error: 102 };
    this.batchOwnership.set(batchId.toString(), { owner: caller });
    this.batchMetadata.set(batchId.toString(), { farmId, harvestDate, certifications, weight, variety });
    this.batchCounter = batchId;
    return { value: batchId };
  },
  transferBatch(caller, batchId, recipient) {
    if (this.paused) return { error: 104 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
    const ownership = this.batchOwnership.get(batchId.toString());
    if (!ownership) return { error: 101 };
    if (ownership.owner !== caller) return { error: 103 };
    this.batchOwnership.set(batchId.toString(), { owner: recipient });
    return { value: true };
  },
  updateMetadata(caller, batchId, farmId, harvestDate, certifications, weight, variety) {
    if (caller !== this.admin) return { error: 100 };
    if (this.metadataFrozen) return { error: 106 };
    if (!this.batchOwnership.has(batchId.toString())) return { error: 101 };
    this.batchMetadata.set(batchId.toString(), { farmId, harvestDate, certifications, weight, variety });
    return { value: true };
  },
  setPaused(caller, pause) {
    if (caller !== this.admin) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  }
};

describe("Coffee Batch NFT Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.metadataFrozen = false;
    mockContract.batchCounter = 0n;
    mockContract.batchOwnership = new Map();
    mockContract.batchMetadata = new Map();
  });

  it("should mint new batch NFT", () => {
    const result = mockContract.mintBatch(mockContract.admin, "FARM001", "2025-01-01", ["organic"], 1000n, "Arabica");
    expect(result).toEqual({ value: 1n });
    expect(mockContract.batchOwnership.get("1")).toEqual({ owner: mockContract.admin });
    expect(mockContract.batchMetadata.get("1")).toEqual({
      farmId: "FARM001",
      harvestDate: "2025-01-01",
      certifications: ["organic"],
      weight: 1000n,
      variety: "Arabica"
    });
  });

  it("should prevent minting by non-admin", () => {
    const result = mockContract.mintBatch("ST2CY5...", "FARM001", "2025-01-01", ["organic"], 1000n, "Arabica");
    expect(result).toEqual({ error: 100 });
  });

  it("should transfer batch NFT", () => {
    mockContract.mintBatch(mockContract.admin, "FARM001", "2025-01-01", ["organic"], 1000n, "Arabica");
    const result = mockContract.transferBatch(mockContract.admin, 1n, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.batchOwnership.get("1")).toEqual({ owner: "ST2CY5..." });
  });

  it("should prevent transfer by non-owner", () => {
    mockContract.mintBatch(mockContract.admin, "FARM001", "2025-01-01", ["organic"], 1000n, "Arabica");
    const result = mockContract.transferBatch("ST2CY5...", 1n, "ST3NB...");
    expect(result).toEqual({ error: 103 });
  });

  it("should update metadata", () => {
    mockContract.mintBatch(mockContract.admin, "FARM001", "2025-01-01", ["organic"], 1000n, "Arabica");
    const result = mockContract.updateMetadata(mockContract.admin, 1n, "FARM002", "2025-02-01", ["fair-trade"], 1200n, "Robusta");
    expect(result).toEqual({ value: true });
    expect(mockContract.batchMetadata.get("1")).toEqual({
      farmId: "FARM002",
      harvestDate: "2025-02-01",
      certifications: ["fair-trade"],
      weight: 1200n,
      variety: "Robusta"
    });
  });

  it("should prevent metadata update when frozen", () => {
    mockContract.mintBatch(mockContract.admin, "FARM001", "2025-01-01", ["organic"], 1000n, "Arabica");
    mockContract.metadataFrozen = true;
    const result = mockContract.updateMetadata(mockContract.admin, 1n, "FARM002", "2025-02-01", ["fair-trade"], 1200n, "Robusta");
    expect(result).toEqual({ error: 106 });
  });

  it("should not allow actions when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const mintResult = mockContract.mintBatch(mockContract.admin, "FARM001", "2025-01-01", ["organic"], 1000n, "Arabica");
    expect(mintResult).toEqual({ error: 104 });
    mockContract.mintBatch(mockContract.admin, "FARM001", "2025-01-01", ["organic"], 1000n, "Arabica");
    const transferResult = mockContract.transferBatch(mockContract.admin, 1n, "ST2CY5...");
    expect(transferResult).toEqual({ error: 104 });
  });
});