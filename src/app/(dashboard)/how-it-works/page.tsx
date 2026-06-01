// src/app/(dashboard)/how-it-works/page.tsx

import React from 'react';
import { BookOpen, Shield, Gavel, Coins, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    icon: BookOpen,
    title: 'Submit a Claim',
    description:
      'Anyone can submit a claim about a piece of information. Provide a clear title, source URL, and supporting evidence. A small stake is required to prevent spam.',
  },
  {
    icon: Shield,
    title: 'Community Verification',
    description:
      'Verified community members review the claim and vote on its accuracy. Verifiers stake tokens to back their verdict — aligning incentives with honest evaluation.',
  },
  {
    icon: Gavel,
    title: 'Dispute Resolution',
    description:
      'If a claim result is contested, a dispute round opens. A wider panel of verifiers re-evaluates the evidence. The majority verdict is final.',
  },
  {
    icon: Coins,
    title: 'Rewards & Penalties',
    description:
      'Verifiers who voted with the majority earn a share of the losing side\'s stake. Submitters of verified true claims earn a bounty. False claims result in stake loss.',
  },
  {
    icon: CheckCircle2,
    title: 'Worldcoin Identity',
    description:
      'To participate as a verifier, verify your identity with Worldcoin. This prevents Sybil attacks and ensures one-person-one-vote integrity across the platform.',
  },
];

const faqs = [
  {
    q: 'Do I need to connect a wallet?',
    a: 'Yes. A wallet is required to stake tokens, submit claims, and earn rewards. We support any EVM-compatible wallet via RainbowKit.',
  },
  {
    q: 'What tokens are used for staking?',
    a: 'TruthBounty uses a platform token on the Stellar network. You can acquire tokens through the in-app faucet during the beta period.',
  },
  {
    q: 'How long does verification take?',
    a: 'Most claims are resolved within 48 hours. Disputed claims may take up to 7 days depending on the complexity of the evidence.',
  },
  {
    q: 'Is my identity exposed when I verify with Worldcoin?',
    a: 'No. Worldcoin uses zero-knowledge proofs — the platform only learns that you are a unique human, never your personal identity.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            How TruthBounty Works
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            A step-by-step guide to submitting claims, earning rewards, and keeping information honest.
          </p>
        </div>

        {/* Steps */}
        <section aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            The Process
          </h2>
          <ol className="space-y-6" role="list">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="flex gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5"
                >
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40">
                    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      <span className="text-indigo-600 dark:text-indigo-400 mr-2">{index + 1}.</span>
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Frequently Asked Questions
          </h2>
          <dl className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5"
              >
                <dt className="font-semibold text-gray-900 dark:text-gray-100">{faq.q}</dt>
                <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}