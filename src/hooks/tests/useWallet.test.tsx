import { renderHook } from "@testing-library/react";

describe("useWallet (EVM/Wagmi)", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return disconnected state when not connected", async () => {
    jest.doMock("wagmi", () => ({
      useAccount: () => ({ address: undefined, isConnected: false }),
      useChainId: () => 10,
    }));

    const { useWallet } = await import("../useWallet");
    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeUndefined();
    expect(result.current.chainId).toBe(10);
  });

  it("should return connected state with address and chainId", async () => {
    jest.doMock("wagmi", () => ({
      useAccount: () => ({
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E" as `0x${string}`,
        isConnected: true,
      }),
      useChainId: () => 10,
    }));

    const { useWallet } = await import("../useWallet");
    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe("0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E");
    expect(result.current.chainId).toBe(10);
  });
});
