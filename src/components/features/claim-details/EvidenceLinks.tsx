
import { Evidence } from "@/app/types/dispute";
import { ExternalLink, FileText, LinkIcon, AlertCircle } from "lucide-react";
import { isValidLinkUrl, isValidMediaUrl } from "@/lib/evidence-validation";

export const EvidenceLinks = ({ evidences }: { evidences: Evidence[] }) => {
  return (
    <div className="bg-[#13141b] border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex items-center space-x-2 text-white font-medium mb-4">
        <LinkIcon size={18} />
        <h2>Evidence Links</h2>
      </div>
      <div className="space-y-3">
        {evidences.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-gray-500">
            <span className="text-sm">No evidence links submitted</span>
          </div>
        ) : (
          evidences.map((evidence) => {
            const isValidUrl = isValidMediaUrl(evidence.url) && isValidLinkUrl(evidence.url);
            
            if (!isValidUrl) {
              return (
                <div 
                  key={evidence.id} 
                  className="flex items-center justify-between p-4 rounded-lg border border-red-500/30 bg-red-900/10"
                  role="alert"
                >
                  <div className="flex items-center space-x-4">
                    <AlertCircle className="text-red-500" size={20} />
                    <div>
                      <p className="text-sm font-medium text-red-400">{evidence.title}</p>
                      <p className="text-xs text-red-500/70">Blocked: Invalid or unsafe URL</p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={evidence.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-[#0a0a0f] hover:border-gray-700 transition-colors">
                <div className="flex items-center space-x-4">
                  <FileText className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-200">{evidence.title}</p>
                    <p className="text-xs text-gray-500">{evidence.description}</p>
                  </div>
                </div>
                <a 
                  href={evidence.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-[#5b5bf6] focus-visible:outline-offset-2 rounded"
                  aria-label={`${evidence.title}: ${evidence.description} (opens in new tab)`}
                >
                  View <ExternalLink size={14} className="ml-1" />
                </a>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};