'use client';

export function EvidenceViewer({ claimId }: { claimId: string }) {
  // Assume evidence comes with claim fetch or separate endpoint
  const evidence = [
    { type: 'link', value: 'https://example.com' },
    { type: 'text', value: 'Witness testimony text' },
    { type: 'image', value: '/evidence/img1.png' },
  ];

  return (
    <div className="card">
      <h3 className="font-semibold mb-2">Evidence</h3>

      <div className="space-y-3">
        {evidence.map((e, idx) => {
          if (e.type === 'link') {
            return (
              <a key={idx} href={e.value} target="_blank" className="text-blue-600 underline">
                {e.value}
              </a>
            );
          }

          if (e.type === 'image') {
            return <img key={idx} src={e.value} className="rounded-lg max-h-60" />;
          }

          return <p key={idx} className="text-sm">{e.value}</p>;
        })}
      </div>
    </div>
  );
}
