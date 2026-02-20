import { Badge } from '@/components/ui/Badge';
import { ClaimStatus } from '@/types/claim';

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    variant: 'warning' as const,
  },
  verified: {
    label: 'Verified',
    variant: 'success' as const,
  },
  disputed: {
    label: 'Disputed',
    variant: 'destructive' as const,
  },
  resolved: {
    label: 'Resolved',
    variant: 'default' as const,
  },
};

export function ClaimStatusBadge({ status }: ClaimStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
