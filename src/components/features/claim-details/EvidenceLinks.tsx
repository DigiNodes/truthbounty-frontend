
import { Evidence } from "@/app/types/dispute";
import { ExternalLink, FileText, LinkIcon } from "lucide-react";

export const EvidenceLinks = ({ evidences }: { evidences: Evidence[] }) => {
  return (
    <div className="bg-[#13141b] border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex items-center space-x-2 text-white font-medium mb-4">
        <LinkIcon size={18} />
        <h2>Evidence Links</h2>
      </div>
      <div className="space-y-3">
        {evidences.map((evidence) => (
          <div key={evidence.id} className="flex items-center justify-between gap-3 p-4 rounded-lg border border-gray-800 bg-[#0a0a0f] hover:border-gray-700 transition-colors">
            <div className="flex min-w-0 items-center space-x-4">
              <FileText className="shrink-0 text-gray-500" size={20} aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-200">{evidence.title}</p>
                <p className="truncate text-xs text-gray-500">{evidence.description}</p>
              </div>
            </div>
            <a
              href={evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm text-gray-400 hover:text-white flex items-center transition-colors"
              aria-label={`View evidence: ${evidence.title} (opens in new tab)`}
            >
              View <ExternalLink size={14} className="ml-1" aria-hidden="true" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};