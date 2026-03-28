import { renderHook } from "@testing-library/react";
import { useReputation } from "../useReputation";

describe("useReputation", () => {
  it("should return default reputation score", () => {
    const { result } = renderHook(() => useReputation("user1"));
    expect(result.current.score).toBe(0);
  });

  it("should update reputation score", () => {
    const { result } = renderHook(() => useReputation("user1"));
    result.current.addPositive();
    expect(result.current.score).toBe(1);
    result.current.addNegative();
    expect(result.current.score).toBe(0);
  });
});
