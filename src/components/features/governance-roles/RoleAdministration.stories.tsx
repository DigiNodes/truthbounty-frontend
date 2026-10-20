import type { Meta, StoryObj } from '@storybook/react';

import { RoleAdministrationContent } from './RoleAdministration';
import type { UseRoleAdministrationDataReturn } from '@/hooks/useRoleAdministrationData';

const MANIFEST_UNAVAILABLE_REASON =
  'No verified release manifest is available yet. Role membership, pending changes, and grant/revoke submission stay unavailable until one is published (see STAB-FE-005).';

const mockBaseData: UseRoleAdministrationDataReturn = {
  isAuthorized: true,
  unauthorizedReason: null,
  canonicalGovernanceOperatorAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  account: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  surfaceState: 'unavailable',
  manifestUnavailable: true,
  manifestUnavailableReason: MANIFEST_UNAVAILABLE_REASON,
  members: [],
  pendingChanges: [],
  separationWarnings: [],
  authoritySources: [
    { field: 'Role membership', source: 'pinned-contract', unavailableReason: MANIFEST_UNAVAILABLE_REASON },
    {
      field: 'Pending change lifecycle',
      source: 'pinned-contract',
      unavailableReason: MANIFEST_UNAVAILABLE_REASON,
    },
    {
      field: 'Timelock readiness',
      source: 'pinned-contract',
      unavailableReason: MANIFEST_UNAVAILABLE_REASON,
    },
    {
      field: 'Role/capability identifiers',
      source: 'verified-release-manifest',
      unavailableReason: MANIFEST_UNAVAILABLE_REASON,
    },
    { field: 'Connected account', source: 'wallet-session-local', unavailableReason: null },
  ],
  prepareDraft: ({ action, roleId, address }) => ({ action, roleId, address, warnings: [] }),
  refetch: async () => {},
};

const meta = {
  title: 'Features/Governance/RoleAdministration',
  component: RoleAdministrationContent,
  parameters: { layout: 'padded' },
  args: { data: mockBaseData },
} satisfies Meta<typeof RoleAdministrationContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ManifestUnavailable: Story = {};

export const Unauthorized: Story = {
  args: {
    data: {
      ...mockBaseData,
      isAuthorized: false,
      unauthorizedReason:
        'Governance operator authorization has not been established for this session.',
    },
  },
};

export const StaleProjection: Story = {
  args: {
    data: {
      ...mockBaseData,
      surfaceState: 'stale',
      manifestUnavailable: false,
      manifestUnavailableReason: null,
    },
  },
};

export const WithSeparationWarning: Story = {
  args: {
    data: {
      ...mockBaseData,
      separationWarnings: [
        {
          id: 'sod-1',
          severity: 'caution',
          summary: 'Draft targets the connected operator account',
          detail: 'Review blast radius before confirmation.',
        },
      ],
    },
  },
};
