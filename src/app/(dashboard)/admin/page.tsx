'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { MdAdminPanelSettings, MdSecurity, MdSpeed } from 'react-icons/md';

export default function AdminRoutePage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Protocol Governance & Administration
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Authorized administrative controls for TruthBounty protocol contracts, fee parameters, and emergency configurations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <MdAdminPanelSettings className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Access Authority</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Confirmed administrator session active on canonical Optimism network.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <MdSecurity className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Security Invariants</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Fail-closed write readiness active. Safe withdrawal guards enforced.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <MdSpeed className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Network Finality</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Monitoring sequencer and batch finality status across Optimism L2.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
