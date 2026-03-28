'use client';

export function EvidenceViewer({ claimId }: { claimId: string }) {
  // Assume evidence comes with claim fetch or separate endpoint
  const evidence = [
    { type: 'link', value: 'https://example.com' },
    { type: 'text', value: 'Witness testimony text' },
    { type: 'image', value: '/evidence/img1.png' },
  ];

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="font-semibold mb-2 text-base sm:text-lg">Evidence</h3>

      <div className="space-y-2 sm:space-y-3">
        {evidence.map((e, idx) => {
          if (e.type === 'link') {
            return (
              <a key={idx} href={e.value} target="_blank" className="text-blue-600 underline text-sm sm:text-base break-all">
                {e.value}
              </a>
            );
          }

          if (e.type === 'image') {
            return <img key={idx} src={e.value} className="rounded-lg max-h-40 sm:max-h-60 w-full object-cover" />;
          }

          return <p key={idx} className="text-sm sm:text-base">{e.value}</p>;
        })}
      </div>
    </div>
  );
}
