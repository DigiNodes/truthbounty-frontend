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
        className="flex items-center justify-between w-full font-semibold mb-3 text-base sm:text-lg text-left"
      >
        <span>Evidence</span>
        <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div
          id="evidence-content"
          data-testid="evidence-scroll-container"
          className="space-y-3 sm:space-y-3 overflow-y-auto overscroll-contain"
          // Scroll lock: bound the panel height and contain scroll within it
          // so scrolling does not chain to the page (prevents double scrollbars).
          style={{ maxHeight: '60vh', overscrollBehavior: 'contain' }}
        >
          {evidence.map((e, idx) => {
            if (e.type === 'link') {
              return (
                <a key={idx} href={e.value} target="_blank" className="text-blue-600 underline text-sm sm:text-base break-all block py-1">
                  {e.value}
                </a>
              );
            }

            if (e.type === 'image') {
              return <img key={idx} src={e.value} className="rounded-lg max-h-40 sm:max-h-60 w-full object-cover" />;
            }

            return <p key={idx} className="text-sm sm:text-base leading-relaxed">{e.value}</p>;
          })}
        </div>
      )}
    </div>
  );
}
