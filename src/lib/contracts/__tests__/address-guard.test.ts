import {
  getAddressValidationError,
  isValidContractAddress,
  assertValidContractAddress,
  isCanonicalContractAddress,
  assertCanonicalContractAddress,
} from '@/lib/contracts/address-guard';

describe('Address Guard & Canonical Address Validation', () => {
  const VALID_ADDRESS_1 = '0x1234567890123456789012345678901234567890';
  const VALID_ADDRESS_2 = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const STELLAR_ADDRESS = 'GA5XIGA5C7QTPTWXQHY6MCJRMTRZDOSHR6EFIBNDQTCQHG262N4GGKIB';

  describe('isValidContractAddress / isCanonicalContractAddress', () => {
    it('accepts valid 20-byte 0x-prefixed hex EVM addresses', () => {
      expect(isValidContractAddress(VALID_ADDRESS_1)).toBe(true);
      expect(isValidContractAddress(VALID_ADDRESS_2)).toBe(true);
      expect(isCanonicalContractAddress(VALID_ADDRESS_1)).toBe(true);
    });

    it('rejects zero address', () => {
      expect(isValidContractAddress(ZERO_ADDRESS)).toBe(false);
      expect(getAddressValidationError(ZERO_ADDRESS)).toContain('Zero address');
    });

    it('rejects legacy Stellar addresses', () => {
      expect(isValidContractAddress(STELLAR_ADDRESS)).toBe(false);
      expect(getAddressValidationError(STELLAR_ADDRESS)).toContain('Legacy Stellar address format detected');
    });

    it('rejects placeholder or dummy patterns', () => {
      expect(isValidContractAddress('0x' + '0'.repeat(40))).toBe(false);
      expect(isValidContractAddress('0xYourContractAddressPlaceholder0000000000')).toBe(false);
      expect(isValidContractAddress('0xDummyContractAddress12345678901234567890')).toBe(false);
      expect(isValidContractAddress('0xMockAddress123456789012345678901234567890')).toBe(false);
    });

    it('rejects invalid hex strings or wrong lengths', () => {
      expect(isValidContractAddress('0x1234')).toBe(false);
      expect(isValidContractAddress('1234567890123456789012345678901234567890')).toBe(false);
      expect(isValidContractAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(false);
      expect(isValidContractAddress(null)).toBe(false);
      expect(isValidContractAddress(undefined)).toBe(false);
      expect(isValidContractAddress('')).toBe(false);
    });
  });

  describe('assertValidContractAddress / assertCanonicalContractAddress', () => {
    it('passes without error for valid addresses', () => {
      expect(() => assertValidContractAddress(VALID_ADDRESS_1, 'TruthBountyWeighted')).not.toThrow();
      expect(() => assertCanonicalContractAddress(VALID_ADDRESS_2, 'Proxy')).not.toThrow();
    });

    it('throws descriptive error on invalid address', () => {
      expect(() => assertValidContractAddress(ZERO_ADDRESS, 'TruthBountyWeighted')).toThrow(
        /Zero address/
      );
      expect(() => assertValidContractAddress(STELLAR_ADDRESS, 'StellarKey')).toThrow(
        /Legacy Stellar address format detected/
      );
      expect(() => assertValidContractAddress('invalid', 'BadField')).toThrow(
        /Invalid EVM address format/
      );
    });
  });
});
