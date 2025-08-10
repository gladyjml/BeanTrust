import { describe, it, expect, beforeEach } from "vitest";

interface Escrow {
  batchId: bigint;
  buyer: string;
  seller: string;
  amount: bigint;
  status: string;
  arbiter?: string;
}

interface MockContract {
  admin: string;
  paused: boolean;
  escrowCounter: bigint;
  trustedArbiters: Map<string, boolean>;
  escrows: Map<string, Escrow>;
  fairTradeToken: { transferFrom: (caller: string, from: string, to: string, amount: bigint) => { value: boolean } | { error: number }; transfer: (caller: string, to: string, amount: bigint) => { value: boolean } | { error: number } };
  addArbiter(caller: string, arbiter: string): { value: boolean } | { error: number };
  createEscrow(caller: string, batchId: bigint, seller: string, amount: bigint, arbiter?: string): { value: bigint } | { error: number };
  releaseEscrow(caller: string, escrowId: bigint): { value: boolean } | { error: number };
  disputeEscrow(caller: string, escrowId: bigint): { value: boolean } | { error: number };
  resolveDispute(caller: string, escrowId: bigint, releaseToSeller: boolean): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  escrowCounter: 0n,
  trustedArbiters: new Map(),
  escrows: new Map(),
  fairTradeToken: {
    transferFrom(caller, from, to, amount) {
      return { value: true };
    },
    transfer(caller, to, amount) {
      return { value: true };
    }
  },
  addArbiter(caller, arbiter) {
    if (caller !== this.admin) return { error: 100 };
    if (arbiter === "SP000000000000000000002Q6VF78") return { error: 105 };
    this.trustedArbiters.set(arbiter, true);
    return { value: true };
  },
  createEscrow(caller, batchId, seller, amount, arbiter) {
    if (this.paused) return { error: 104 };
    if (seller === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (amount <= 0n) return { error: 102 };
    if (arbiter && !this.trustedArbiters.get(arbiter)) return { error: 106 };
    const escrowId = this.escrowCounter + 1n;
    this.escrows.set(escrowId.toString(), { batchId, buyer: caller, seller, amount, status: "active", arbiter });
    this.escrowCounter = escrowId;
    return { value: escrowId };
  },
  releaseEscrow(caller, escrowId) {
    if (this.paused) return { error: 104 };
    const escrow = this.escrows.get(escrowId.toString());
    if (!escrow) return { error: 101 };
    if (escrow.status !== "active") return { error: 107 };
    if (caller !== escrow.buyer) return { error: 100 };
    this.escrows.set(escrowId.toString(), { ...escrow, status: "released" });
    return { value: true };
  },
  disputeEscrow(caller, escrowId) {
    if (this.paused) return { error: 104 };
    const escrow = this.escrows.get(escrowId.toString());
    if (!escrow) return { error: 101 };
    if (escrow.status !== "active") return { error: 107 };
    if (caller !== escrow.buyer && caller !== escrow.seller) return { error: 100 };
    this.escrows.set(escrowId.toString(), { ...escrow, status: "disputed" });
    return { value: true };
  },
  resolveDispute(caller, escrowId, releaseToSeller) {
    if (this.paused) return { error: 104 };
    const escrow = this.escrows.get(escrowId.toString());
    if (!escrow) return { error: 101 };
    if (escrow.status !== "disputed") return { error: 107 };
    if (!escrow.arbiter || caller !== escrow.arbiter) return { error: 106 };
    this.escrows.set(escrowId.toString(), { ...escrow, status: releaseToSeller ? "released" : "refunded" });
    return { value: true };
  },
  setPaused(caller, pause) {
    if (caller !== this.admin) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  }
};

describe("Payment Escrow Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.escrowCounter = 0n;
    mockContract.trustedArbiters = new Map();
    mockContract.escrows = new Map();
  });

  it("should create escrow", () => {
    mockContract.addArbiter(mockContract.admin, "ST3NB...");
    const result = mockContract.createEscrow("ST2CY5...", 1n, "ST4RE...", 1000n, "ST3NB...");
    expect(result).toEqual({ value: 1n });
    expect(mockContract.escrows.get("1")).toEqual({
      batchId: 1n,
      buyer: "ST2CY5...",
      seller: "ST4RE...",
      amount: 1000n,
      status: "active",
      arbiter: "ST3NB..."
    });
  });

  it("should release escrow", () => {
    mockContract.createEscrow("ST2CY5...", 1n, "ST4RE...", 1000n, undefined);
    const result = mockContract.releaseEscrow("ST2CY5...", 1n);
    expect(result).toEqual({ value: true });
    expect(mockContract.escrows.get("1")?.status).toBe("released");
  });

  it("should dispute escrow", () => {
    mockContract.createEscrow("ST2CY5...", 1n, "ST4RE...", 1000n, undefined);
    const result = mockContract.disputeEscrow("ST4RE...", 1n);
    expect(result).toEqual({ value: true });
    expect(mockContract.escrows.get("1")?.status).toBe("disputed");
  });

  it("should resolve dispute", () => {
    mockContract.addArbiter(mockContract.admin, "ST3NB...");
    mockContract.createEscrow("ST2CY5...", 1n, "ST4RE...", 1000n, "ST3NB...");
    mockContract.disputeEscrow("ST2CY5...", 1n);
    const result = mockContract.resolveDispute("ST3NB...", 1n, true);
    expect(result).toEqual({ value: true });
    expect(mockContract.escrows.get("1")?.status).toBe("released");
  });

  it("should prevent non-arbiter from resolving dispute", () => {
    mockContract.addArbiter(mockContract.admin, "ST3NB...");
    mockContract.createEscrow("ST2CY5...", 1n, "ST4RE...", 1000n, "ST3NB...");
    mockContract.disputeEscrow("ST2CY5...", 1n);
    const result = mockContract.resolveDispute("ST5PQ...", 1n, true);
    expect(result).toEqual({ error: 106 });
  });

  it("should prevent actions when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const createResult = mockContract.createEscrow("ST2CY5...", 1n, "ST4RE...", 1000n, undefined);
    expect(createResult).toEqual({ error: 104 });
    mockContract.setPaused(mockContract.admin, false);
    mockContract.createEscrow("ST2CY5...", 1n, "ST4RE...", 1000n, undefined);
    mockContract.setPaused(mockContract.admin, true);
    const releaseResult = mockContract.releaseEscrow("ST2CY5...", 1n);
    expect(releaseResult).toEqual({ error: 104 });
  });
});