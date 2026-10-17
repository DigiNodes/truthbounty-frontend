import type {
  AdminDashboardOverview,
  ExecuteOperationRequest,
  ExecuteOperationResponse,
} from '@/app/types/admin';
import type {
  AuditQueryResponse,
  AuditAuthorityCapability,
  AuditLifecycleState,
} from '@/app/types/admin-audit';

export async function fetchAdminOverview(adminAddress: string): Promise<AdminDashboardOverview> {
  const res = await fetch('/api/admin/overview', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'x-admin-address': adminAddress,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const reason = errorBody.reason || errorBody.error || `HTTP ${res.status}`;
    const err = new Error(reason);
    (err as { status?: number }).status = res.status;
    throw err;
  }

  return res.json();
}

export async function executeAdminOperation(
  payload: ExecuteOperationRequest
): Promise<ExecuteOperationResponse> {
  const res = await fetch('/api/admin/operations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-admin-address': payload.operatorAddress,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const reason = errorBody.reason || errorBody.error || `HTTP ${res.status}`;
    const err = new Error(reason);
    (err as { status?: number }).status = res.status;
    throw err;
  }

  return res.json();
}

export interface FetchAdminAuditParams {
  adminAddress: string;
  page?: number;
  pageSize?: number;
  capability?: AuditAuthorityCapability | 'ALL';
  lifecycleState?: AuditLifecycleState | 'ALL';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchAdminAuditRecords(
  params: FetchAdminAuditParams
): Promise<AuditQueryResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.capability && params.capability !== 'ALL') searchParams.set('capability', params.capability);
  if (params.lifecycleState && params.lifecycleState !== 'ALL') searchParams.set('lifecycleState', params.lifecycleState);
  if (params.search) searchParams.set('search', params.search);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);

  const url = `/api/admin/audit?${searchParams.toString()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'x-admin-address': params.adminAddress,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const reason = errorBody.reason || errorBody.error || `HTTP ${res.status}`;
    const err = new Error(reason);
    (err as { status?: number }).status = res.status;
    throw err;
  }

  return res.json();
}

