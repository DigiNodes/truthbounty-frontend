import { ClaimDetails } from "@/components/features/claim-verification/ClaimDetails";
import { EvidenceViewer } from "@/components/features/claim-verification/EvidenceViewer";
import { StakeForm } from "@/components/features/claim-verification/StakeForm";
import { VerificationActions } from "@/components/features/claim-verification/VerificationActions";

export default async function ClaimDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <ClaimDetails claimId={params.id} />
      <EvidenceViewer claimId={params.id} />
      <StakeForm claimId={params.id} />
      <VerificationActions claimId={params.id} />
    </div>
  );
}
