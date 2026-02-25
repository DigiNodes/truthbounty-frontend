import React from "react";

interface Props {
  onClose: () => void;
}

export default function TrustExplanationModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#18181b] p-8 rounded-xl w-full max-w-lg border border-[#232329]">
        <h2 className="text-2xl font-bold mb-4">How trust and reputation work</h2>
        <p className="mb-2">
          To maintain protocol integrity we compute a simple <strong>trust
          score</strong> for every account.  Accounts with low scores are
          treated with extra caution, and dishonest behaviour may result in
          penalties or reduced access.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            <strong>Verify your identity</strong> via the on‑chain verification
            flow – it proves to others that you are a real person and
            significantly increases your score.
          </li>
          <li>
            <strong>Build reputation</strong> by submitting accurate claims and
            participating honestly in verifications.  Positive feedback raises
            your score over time.
          </li>
          <li>
            <strong>Avoid suspicious patterns</strong> such as creating many
            wallets, submitting conflicting data, or rapid-fire activity.
          </li>
          <li>
            <strong>Be patient with new wallets</strong>.  Accounts less than a
            week old start with limited privileges until they’ve demonstrated
            good behaviour.
          </li>
        </ul>
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="bg-[#5b5bf6] text-white px-4 py-2 rounded hover:bg-[#6c6cf7]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
