
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
          <div key={evidence.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-[#0a0a0f] hover:border-gray-700 transition-colors">
            <div className="flex items-center space-x-4">
              <FileText className="text-gray-500" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-200">{evidence.title}</p>
                <p className="text-xs text-gray-500">{evidence.description}</p>
              </div>
            </div>
            <a href={evidence.url} className="text-sm text-gray-400 hover:text-white flex items-center transition-colors">
              View <ExternalLink size={14} className="ml-1" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};