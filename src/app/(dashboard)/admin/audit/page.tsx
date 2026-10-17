'use client';

/**
 * Route: /admin/audit
 * Issue: #596 (UI-FE-027) — Build Immutable Administrative Audit Trail
 */

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { AdminAuditTrailView } from '@/components/features/admin-audit';

export default function AdminAuditRoutePage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <AdminAuditTrailView />
      </div>
    </MainLayout>
  );
}
