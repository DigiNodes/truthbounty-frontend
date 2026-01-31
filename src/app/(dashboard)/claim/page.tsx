import { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Dispute } from '@/types/dispute';
import { OpenDisputeModal } from '@/components/modals/OpenDisputeModal';
import { DisputeVotingCard } from '@/components/claims/DisputeVotingCard';


export default function ClaimDetail() {
  const [isDisputeModalOpen, setDisputeModalOpen] = useState(false);
  
  
  const [dispute, setDispute] = useState<Dispute | null>(null);

  const handleOpenDispute = async (payload: any) => {
    
    console.log('Opening dispute:', payload);
    
    
    setDispute({
      id: 'dsp_1',
      claimId: 'claim_123',
      reason: payload.reason,
      status: 'VOTING',
      proVotes: 0,
      conVotes: 0,
      totalStaked: payload.initialStake,
      createdAt: new Date().toISOString()
    });
  };

  const handleVote = async (id: string, side: string, amount: number) => {
    // Call POST /disputes/:id/vote API here
    console.log(`Voting ${side} with ${amount}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8 text-zinc-300">
      
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-[#111111] p-6">
            
            
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400">Climate</span>
                  <span className="text-xs text-zinc-500 font-mono">0x1a2b...3c4d</span>
                </div>
                <h1 className="text-xl font-bold text-white">Global average temperatures increased by 1.1°C...</h1>
              </div>
              
              
              {dispute ? (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-900/20 text-red-500 border border-red-900/50 text-xs font-bold">
                  <AlertTriangle size={14} /> Dispute Active
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-900/20 text-green-500 border border-green-900/50 text-xs font-bold">
                  <CheckCircle size={14} /> Verified
                </span>
              )}
            </div>

            
            {!dispute && (
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button className="py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors">
                  Verify (Stake + Vote)
                </button>
                
                
                <button 
                  onClick={() => setDisputeModalOpen(true)}
                  className="py-3 rounded-lg border border-red-900/50 text-red-500 hover:bg-red-900/10 font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <AlertTriangle size={18} /> Dispute
                </button>
              </div>
            )}

            
            {dispute && (
              <DisputeVotingCard 
                disputeId={dispute.id}
                currentStaked={dispute.totalStaked}
                onVote={handleVote}
              />
            )}
          </div>
          
          
        </div>

        
        <div className="space-y-6">
           
        </div>
      </div>

      <OpenDisputeModal 
        claimId="claim_123"
        isOpen={isDisputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        onSubmit={handleOpenDispute}
      />
    </div>
  );
}