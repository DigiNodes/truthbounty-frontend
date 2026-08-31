/**
 * EIP-4361 (Sign-In With Ethereum) authentication types.
 *
 * These types describe the *client boundary* for TruthBounty's SIWE
 * authentication. The backend is the sole authority that generates the
 * challenge message and validates signatures; the frontend faithfully relays
 * the exact message, signs it with the connected wallet, and stores/rotates
 * the resulting session through the approved boundary (see session-store.ts).
 */

/** A backend-generated SIWE challenge. The `message` field is authoritative
 * and must be displayed verbatim and submitted unchanged. */
export interface SiweChallenge {
  /** Exact EIP-4361 message string produced by the backend. */
  message: string;
  /** The nonce embedded in the message (single-use, expiring). */
  nonce: string;
  /** The Ethereum address the backend expects to sign the message. */
  address: string;
  /** The chain the message is scoped to. */
  chainId: number;
  /** ISO-8601 issued-at timestamp embedded in the message. */
  issuedAt: string;
  /** ISO-8601 expiration timestamp embedded in the message. */
  expirationTime: string;
  /** RFC 4501 domain embedded in the message. */
  domain: string;
  /** RFC 3986 URI the message is scoped to. */
  uri: string;
  /** EIP-4361 version (always `1`). */
  version: string;
}

export type SiweStatus =
  | 'idle'
  | 'requesting-challenge'
  | 'ready-to-sign'
  | 'signing'
  | 'submitting'
  | 'authenticated'
  | 'error';

/** Discriminated failure taxonomy for the SIWE authentication flow. */
export type SiweFailureKind =
  | 'NONCE_EXPIRED'
  | 'USER_REJECTED'
  | 'WRONG_ACCOUNT'
  | 'WRONG_CHAIN'
  | 'REPLAYED'
  | 'INVALID_MESSAGE'
  | 'NETWORK'
  | 'UNAUTHORIZED';

export interface SiweFailure {
  kind: SiweFailureKind;
  message: string;
  code?: string;
}

/** A successfully established session, persisted via the approved boundary. */
export interface SiweSession {
  address: string;
  chainId: number;
  token: string;
  /** Epoch milliseconds at which the session expires. */
  expiresAt: number;
  /** Epoch milliseconds at which the session was established. */
  issuedAt: number;
}

/** Payload submitted to the backend for signature verification. */
export interface SiweVerifyRequest {
  /** The exact backend-provided message (submitted unchanged). */
  message: string;
  /** The signature produced by the wallet over the message. */
  signature: `0x${string}`;
  /** The connected address that produced the signature. */
  address: string;
  /** The connected chain id. */
  chainId: number;
}
