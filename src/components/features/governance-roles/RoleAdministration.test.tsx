import { render, screen, fireEvent } from '@testing-library/react';

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
    render(<RoleAdministrationContent data={buildData({ isAuthorized: false })} />);

    expect(screen.getByTestId('role-admin-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('role-member-list-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grant-revoke-preparation-form')).not.toBeInTheDocument();
  });

  it('renders the unavailable boundary and empty lists when the release manifest is not verified', () => {
    render(<RoleAdministrationContent data={buildData()} />);

    expect(screen.getByTestId('role-admin-unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('role-member-list-empty')).toBeInTheDocument();
    expect(screen.getByTestId('pending-role-change-list-empty')).toBeInTheDocument();
  });

  it('never exposes an enabled submit control, regardless of draft input', () => {
    render(<RoleAdministrationContent data={buildData()} />);

    const addressInput = screen.getByLabelText('Address');
    fireEvent.change(addressInput, { target: { value: '0xabc0000000000000000000000000000000000a' } });
    fireEvent.click(screen.getByRole('button', { name: /preview draft/i }));

    // The draft preview is allowed to appear — it's a local, typed
    // preview only — but the actual submit control must stay disabled.
    expect(screen.getByTestId('grant-revoke-draft-preview')).toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /submit unavailable/i });
    expect(submitButton).toBeDisabled();
  });

  it('surfaces every authority source with its unavailable reason, never silently', () => {
    render(<RoleAdministrationContent data={buildData()} />);

    const summary = screen.getByTestId('authority-source-summary');
    expect(summary).toHaveTextContent('Role membership');
    expect(summary).toHaveTextContent('Pinned contract');
    expect(summary).toHaveTextContent(MANIFEST_UNAVAILABLE_REASON);
  });

  it('renders blocking separation-of-duty warnings with role="alert"', () => {
    render(
      <RoleAdministrationContent
        data={buildData({
          separationWarnings: [
            {
              id: 'warn-blocking',
              severity: 'blocking',
              summary: 'Granting this role would leave no independent guardian.',
              detail: 'Separation of duty requires at least one guardian distinct from the Governor.',
            },
          ],
        })}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Granting this role would leave no independent guardian.');
  });
});