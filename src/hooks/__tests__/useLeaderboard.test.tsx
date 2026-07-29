import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { LeaderboardEntry } from "@/app/types/websocket";
import { validateLeaderboardInvariants } from "@/lib/leaderboard";

// Mock the fetchLeaderboard API
const mockLeaderboardData: LeaderboardEntry[] = [
  {
    rank: 3,
    userId: "user-3",
    username: "Carol",
    totalVerifications: 6,
    accuracy: 97.5,
    totalStaked: 6100,
    totalEarned: 480,
  },
  {
    rank: 1,
    userId: "user-1",
    username: "Alice",
    totalVerifications: 10,
    accuracy: 98.2,
    totalStaked: 12400,
    totalEarned: 850,
  },
  {
    rank: 2,
    userId: "user-2",
    username: "Bob",
    totalVerifications: 8,
    accuracy: 96.8,
    totalStaked: 8200,
    totalEarned: 620,
  },
];

jest.mock("../../app/api/leaderboard.api", () => ({
  fetchLeaderboard: jest.fn(() => Promise.resolve(mockLeaderboardData)),
}));

jest.mock("../../app/queries/queryKeys", () => ({
  queryKeys: {
    leaderboard: ["leaderboard"],
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useLeaderboard sorting logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns data sorted by server rank ascending", async () => {
    const { useLeaderboard } = await import("../useLeaderboard");
    const { result } = renderHook(() => useLeaderboard(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data as LeaderboardEntry[];
    expect(data.map((e) => e.userId)).toEqual(["user-1", "user-2", "user-3"]);
  });

  it("normalizes ranks to dense sequential integers starting at 1", async () => {
    const { useLeaderboard } = await import("../useLeaderboard");
    const { result } = renderHook(() => useLeaderboard(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data as LeaderboardEntry[];
    expect(data.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("does not re-sort by arbitrary fields (respects server rank order)", async () => {
    // Server data intentionally has accuracy out of rank order.
    // Client must NOT sort by accuracy — only by server rank.
    const { useLeaderboard } = await import("../useLeaderboard");
    const { result } = renderHook(() => useLeaderboard(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data as LeaderboardEntry[];
    // user-1 has rank 1 but accuracy 98.2; user-3 has rank 3 but accuracy 97.5
    // If sorted by accuracy desc, order would be user-1, user-3, user-2.
    // Correct (server-rank) order is user-1, user-2, user-3.
    expect(data.map((e) => e.userId)).toEqual(["user-1", "user-2", "user-3"]);
  });

  it("output satisfies all protocol invariants", async () => {
    const { useLeaderboard } = await import("../useLeaderboard");
    const { result } = renderHook(() => useLeaderboard(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data as LeaderboardEntry[];
    const validation = validateLeaderboardInvariants(data);

    expect(validation.valid).toBe(true);
    expect(validation.violations).toEqual([]);
  });

  it("preserves entry fields other than rank", async () => {
    const { useLeaderboard } = await import("../useLeaderboard");
    const { result } = renderHook(() => useLeaderboard(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data as LeaderboardEntry[];
    const alice = data.find((e) => e.userId === "user-1");

    expect(alice).toEqual({
      rank: 1,
      userId: "user-1",
      username: "Alice",
      totalVerifications: 10,
      accuracy: 98.2,
      totalStaked: 12400,
      totalEarned: 850,
    });
  });
});
