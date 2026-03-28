import { renderHook, act } from "@testing-library/react";
import { useWallet } from "../useWallet";

describe("useWallet", () => {
  it("should start with empty balance", () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.balance).toBe(0);
  });

  it("should deposit funds", () => {
    const { result } = renderHook(() => useWallet());
    act(() => {
      result.current.deposit(100);
    });
    expect(result.current.balance).toBe(100);
  });

  it("should withdraw funds safely", () => {
    const { result } = renderHook(() => useWallet());
    act(() => {
      result.current.deposit(100);
      result.current.withdraw(50);
    });
    expect(result.current.balance).toBe(50);
  });

  it("should prevent overdraft", () => {
    const { result } = renderHook(() => useWallet());
    act(() => {
      result.current.withdraw(50);
    });
    expect(result.current.balance).toBe(0);
  });
});
