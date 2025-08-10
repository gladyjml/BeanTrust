import { describe, it, expect, beforeEach } from "vitest";

interface MockContract {
  admin: string;
  paused: boolean;
  totalSupply: bigint;
  balances: Map<string, bigint>;
  staked: Map<string, bigint>;
  allowances: Map<string, bigint>;
  MAX_SUPPLY: bigint;
  mint(caller: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  transfer(caller: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  approve(caller: string, spender: string, amount: bigint): { value: boolean } | { error: number };
  transferFrom(caller: string, owner: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  stake(caller: string, amount: bigint): { value: boolean } | { error: number };
  unstake(caller: string, amount: bigint): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  totalSupply: 0n,
  balances: new Map(),
  staked: new Map(),
  allowances: new Map(),
  MAX_SUPPLY: 1000000000000n,
  mint(caller, recipient, amount) {
    if (caller !== this.admin) return { error: 100 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (amount <= 0n) return { error: 106 };
    if (this.totalSupply + amount > this.MAX_SUPPLY) return { error: 103 };
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
    this.totalSupply += amount;
    return { value: true };
  },
  transfer(caller, recipient, amount) {
    if (this.paused) return { error: 104 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (amount <= 0n) return { error: 106 };
    const bal = this.balances.get(caller) || 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
    return { value: true };
  },
  approve(caller, spender, amount) {
    if (this.paused) return { error: 104 };
    if (spender === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (amount <= 0n) return { error: 106 };
    this.allowances.set(`${caller}:${spender}`, amount);
    return { value: true };
  },
  transferFrom(caller, owner, recipient, amount) {
    if (this.paused) return { error: 104 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (amount <= 0n) return { error: 106 };
    const allowance = this.allowances.get(`${owner}:${caller}`) || 0n;
    const ownerBal = this.balances.get(owner) || 0n;
    if (allowance < amount) return { error: 100 };
    if (ownerBal < amount) return { error: 101 };
    this.allowances.set(`${owner}:${caller}`, allowance - amount);
    this.balances.set(owner, ownerBal - amount);
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
    return { value: true };
  },
  stake(caller, amount) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const bal = this.balances.get(caller) || 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.staked.set(caller, (this.staked.get(caller) || 0n) + amount);
    return { value: true };
  },
  unstake(caller, amount) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const stakeBal = this.staked.get(caller) || 0n;
    if (stakeBal < amount) return { error: 102 };
    this.staked.set(caller, stakeBal - amount);
    this.balances.set(caller, (this.balances.get(caller) || 0n) + amount);
    return { value: true };
  },
  setPaused(caller, pause) {
    if (caller !== this.admin) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  }
};

describe("FairTrade Token Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.totalSupply = 0n;
    mockContract.balances = new Map();
    mockContract.staked = new Map();
    mockContract.allowances = new Map();
  });

  it("should mint tokens", () => {
    const result = mockContract.mint(mockContract.admin, "ST2CY5...", 1000n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(1000n);
    expect(mockContract.totalSupply).toBe(1000n);
  });

  it("should prevent minting by non-admin", () => {
    const result = mockContract.mint("ST2CY5...", "ST3NB...", 1000n);
    expect(result).toEqual({ error: 100 });
  });

  it("should transfer tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    const result = mockContract.transfer("ST2CY5...", "ST3NB...", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(300n);
    expect(mockContract.balances.get("ST3NB...")).toBe(200n);
  });

  it("should approve and transfer from allowance", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    mockContract.approve("ST2CY5...", "ST3NB...", 300n);
    const result = mockContract.transferFrom("ST3NB...", "ST2CY5...", "ST4RE...", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(300n);
    expect(mockContract.balances.get("ST4RE...")).toBe(200n);
    expect(mockContract.allowances.get("ST2CY5...:ST3NB...")).toBe(100n);
  });

  it("should stake tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    const result = mockContract.stake("ST2CY5...", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5...")).toBe(300n);
    expect(mockContract.staked.get("ST2CY5...")).toBe(200n);
  });

  it("should unstake tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    mockContract.stake("ST2CY5...", 200n);
    const result = mockContract.unstake("ST2CY5...", 100n);
    expect(result).toEqual({ value: true });
    expect(mockContract.staked.get("ST2CY5...")).toBe(100n);
    expect(mockContract.balances.get("ST2CY5...")).toBe(400n);
  });

  it("should prevent actions when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const transferResult = mockContract.transfer("ST2CY5...", "ST3NB...", 10n);
    expect(transferResult).toEqual({ error: 104 });
    const stakeResult = mockContract.stake("ST2CY5...", 10n);
    expect(stakeResult).toEqual({ error: 104 });
  });

  it("should prevent invalid amount transfers", () => {
    mockContract.mint(mockContract.admin, "ST2CY5...", 500n);
    const result = mockContract.transfer("ST2CY5...", "ST3NB...", 0n);
    expect(result).toEqual({ error: 106 });
  });
});