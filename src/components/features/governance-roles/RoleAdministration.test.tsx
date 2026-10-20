import { render, screen } from '@testing-library/react';

import { RoleAdministrationContent } from './RoleAdministration';
import type { UseRoleAdministrationDataReturn } from '@/hooks/useRoleAdministrationData';

const MANIFEST_UNAVAILABLE_REASON =
  'No verified release manifest is available yet. Role membership, pending changes, and grant/revoke submission stay unavailable until one is published (see STAB-FE-005).';

function buildData(overrides: Partial<UseRoleAdministrationDataReturn> = {}): UseRoleAdministrationDataReturn {
  return {
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
    ],
    prepareDraft: ({ action, roleId, address }) => ({ action, roleId, address, warnings: [] }),
    refetch: jest.fn(async () => {}),
    ...overrides,
  };
}

describe('RoleAdministrationContent', () => {
  it('renders the access-denied boundary and nothing else when unauthorized', () => {
    render(
      <RoleAdministrationContent
        data={buildData({
          isAuthorized: false,
          unauthorizedReason: 'Governance operator authorization has not been established for this session.',
        })}
      />,
    );

    const boundary = screen.getByTestId('role-admin-unavailable');
    expect(boundary).toHaveTextContent(/authorization has not been established/i);
    expect(screen.queryByTestId('role-administration')).toBeNull();
    expect(screen.queryByTestId('authority-source-summary')).toBeNull();
    expect(screen.queryByTestId('grant-revoke-preparation-form')).toBeNull();
  });

  it('states the unavailable manifest reason instead of showing synthetic roles', () => {
    render(<RoleAdministrationContent data={buildData()} />);

    expect(screen.getByTestId('role-admin-unavailable')).toHaveTextContent(
      /no verified release manifest is available yet/i,
    );
    expect(screen.getByTestId('role-member-list-empty')).toBeInTheDocument();
    expect(screen.getByTestId('pending-role-change-list-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('role-member-list')).toBeNull();
  });

  it('exposes the authority source class for each displayed field', () => {
    render(<RoleAdministrationContent data={buildData()} />);

    const summary = screen.getByTestId('authority-source-summary');
    expect(summary).toHaveTextContent(/role membership/i);
    expect(summary).toHaveTextContent(/pinned contract/i);
  });

  it('keeps mutation unavailable and never enables submission', () => {
    render(<RoleAdministrationContent data={buildData()} />);

    expect(screen.getByTestId('grant-revoke-disabled-reason')).toHaveTextContent(
      /no verified release manifest/i,
    );
    expect(screen.getByRole('button', { name: /submit \(unavailable\)/i })).toBeDisabled();
  });

  it('surfaces separation-of-duty warnings when a projection reports them', () => {
    render(
      <RoleAdministrationContent
        data={buildData({
          separationWarnings: [
            {
              id: 'sod-1',
              severity: 'caution',
              summary: 'Draft targets the connected operator account',
              detail: 'Review blast radius before confirmation.',
            },
          ],
        })}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /separation-of-duty warnings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/draft targets the connected operator account/i),
    ).toBeInTheDocument();
  });

  it('renders a status alert for degraded surfaces without hiding membership', () => {
    render(
      <RoleAdministrationContent
        data={buildData({ surfaceState: 'stale', manifestUnavailable: false, manifestUnavailableReason: null })}
      />,
    );

    expect(screen.getByTestId('role-administration-status')).toHaveTextContent(
      /not confirmed current/i,
    );
    expect(screen.getByTestId('role-member-list-empty')).toBeInTheDocument();
  });
});
