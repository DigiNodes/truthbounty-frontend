"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { createPublicClient, http, formatUnits } from "viem";
import { mainnet } from "viem/chains"; // change if using another chain

// 🔁 Replace with your actual contract
const CONTRACT_ADDRESS = "0xYourContractAddress";

// Minimal ABI (adjust to your contract)
const ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "claimRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
];

// Public client (read from chain)
const publicClient = createPublicClient({
  chain: mainnet, // change if needed
  transport: http(),
});

export default function RewardsPage() {
  const { address } = useAccount();

  const [balance, setBalance] = useState<string>("0");
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Write contract (claim rewards)
  const {
    data: hash,
    writeContract,
    isPending,
  } = useWriteContract();

  const { isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // ✅ Fetch real token balance
  const fetchBalance = async () => {
    if (!address) return;

    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "balanceOf",
        args: [address],
      });

      setBalance(formatUnits(result as bigint, 18));
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  };

  // ✅ Fetch rewards from backend API
  const fetchRewards = async () => {
    if (!address) return;

    try {
      const res = await fetch(`/api/rewards?user=${address}`);
      const data = await res.json();
      setRewards(data);
    } catch (err) {
      console.error("Rewards fetch error:", err);
    }
  };

  // ✅ Claim rewards (REAL TX)
  const handleClaim = async () => {
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "claimRewards",
      });
    } catch (err) {
      console.error("Claim error:", err);
    }
  };

  // Refetch after successful tx
  useEffect(() => {
    if (isSuccess) {
      fetchBalance();
      fetchRewards();
    }
  }, [isSuccess]);

  useEffect(() => {
    fetchBalance();
    fetchRewards();
  }, [address]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Rewards Dashboard</h1>

      <p><strong>Wallet:</strong> {address || "Not connected"}</p>
      <p><strong>Balance:</strong> {balance}</p>

      <button onClick={handleClaim} disabled={isPending || !address}>
        {isPending ? "Claiming..." : "Claim Rewards"}
      </button>

      {hash && (
        <p>
          Tx Hash:{" "}
          <a
            href={`https://etherscan.io/tx/${hash}`}
            target="_blank"
          >
            View on Explorer
          </a>
        </p>
      )}

      <h2>Claimable Rewards</h2>

      {loading ? (
        <p>Loading...</p>
      ) : rewards.length === 0 ? (
        <p>No rewards available</p>
      ) : (
        <ul>
          {rewards.map((r, i) => (
            <li key={i}>
              {r.amount} tokens - {r.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}