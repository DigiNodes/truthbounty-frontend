'use client';

import { useState } from 'react';

export function EvidenceViewer({ claimId }: { claimId: string }) {
  const [expanded, setExpanded] = useState(true);

  // Assume evidence comes with claim fetch or separate endpoint
  const evidence = [
    { type: 'link', value: 'https://example.com' },
    { type: 'text', value: 'Witness testimony text' },
    { type: 'image', value: '/evidence/img1.png' },
  ];

  return (
    <div className="card p-4 sm:p-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="evidence-content"
        className="flex items-center justify-between w-full font-semibold mb-3 text-base sm:text-lg text-left focus-visible:outline-2 focus-visible:outline-[#5b5bf6] focus-visible:outline-offset-2 rounded"
      >
        <span>Evidence</span>
        <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div
          id="evidence-content"
          data-testid="evidence-scroll-container"
          className="space-y-3 sm:space-y-3 overflow-y-auto overscroll-contain"
          style={{ maxHeight: '60vh', overscrollBehavior: 'contain' }}
        >
          {evidence.map((e, idx) => {
            if (e.type === 'link') {
              return (
                <a key={idx} href={e.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm sm:text-base break-all block py-1" aria-label={`Evidence link: ${e.value} (opens in new tab)`}>
                  {e.value}
                </a>
              );
            }

            if (e.type === 'image') {
              return <img key={idx} src={e.value} alt="Evidence attachment" className="rounded-lg max-h-40 sm:max-h-60 w-full object-cover" />;
            }

            return <p key={idx} className="text-sm sm:text-base leading-relaxed">{e.value}</p>;
          })}
        </div>
      )}
    </div>
  );
}
