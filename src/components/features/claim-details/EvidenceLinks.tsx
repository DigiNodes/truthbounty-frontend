import { Evidence } from "@/app/types/dispute";
import { ExternalLink, FileText, LinkIcon, AlertTriangle } from "lucide-react";
import { validateEvidenceUri, getSafeEvidenceHref } from "@/lib/validation/evidenceUri";

/**
 * V2-FE-075 — Evidence links are untrusted API content. Titles, descriptions
 * and URLs are sanitized; unsafe URLs fail closed to an accessible blocked
 * placeholder instead of an anchor.
 */
export const EvidenceLinks = ({ evidences }: { evidences: Evidence[] }) => {
  return (
    <div className="bg-[#13141b] border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex items-center space-x-2 text-white font-medium mb-4">
        <LinkIcon size={18} />
        <h2>Evidence Links</h2>
      </div>
      <div className="space-y-3">
        {evidences.map((evidence) => {
          const validation = validateEvidenceUri(evidence.url);
          const safeHref = getSafeEvidenceHref(evidence.url);

          return (
            <div
              key={evidence.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-[#0a0a0f] hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <FileText className="text-gray-500 shrink-0" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-200">{evidence.title}</p>
                  <p className="text-xs text-gray-500">{evidence.description}</p>
                  {!validation.isValid && (
                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1" role="alert">
                      <AlertTriangle size={12} />
                      {validation.error}
                    </p>
                  )}
                </div>
              </div>

              {validation.isValid && safeHref ? (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white flex items-center transition-colors shrink-0 ml-4 focus-visible:outline-2 focus-visible:outline-[#5b5bf6] rounded"
                  aria-label={`View evidence: ${evidence.title} (opens in new tab)`}
                >
                  View <ExternalLink size={14} className="ml-1" />
                </a>
              ) : (
                <span
                  className="text-xs font-mono px-2 py-1 bg-red-950/40 text-red-400 border border-red-900/50 rounded shrink-0 ml-4"
                  aria-label="Unsupported or invalid link"
                >
                  Invalid URI
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};