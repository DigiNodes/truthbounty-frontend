import { renderHook, act } from "@testing-library/react";
import { useReputation } from "../useReputation";

describe("useReputation", () => {
  it("should return default reputation score and tier", () => {
    const { result } = renderHook(() => useReputation("user1"));
    expect(result.current.score).toBe(0);
    expect(result.current.tier).toBe("bronze");
  });

  it("should update reputation score with positive and negative increments", () => {
    const { result } = renderHook(() => useReputation("user1"));
    act(() => {
      result.current.addPositive();
    });
    expect(result.current.score).toBe(1);
    act(() => {
      result.current.addNegative();
    });
    expect(result.current.score).toBe(0);
  });
});
