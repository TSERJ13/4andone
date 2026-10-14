import { describe, it, expect } from 'vitest';
import { resolveNativeFinalTest, IOS_FINAL_TEST_TTL } from '../src/utils/iosFinalDiagnostic';

const now = 1_000_000;
const saved = JSON.stringify({ enabled: true, expiresAt: now + IOS_FINAL_TEST_TTL });

describe('device-local iOS Finals diagnostic preference', () => {
  it('is off for ordinary URLs with no previous opt-in', () => {
    expect(resolveNativeFinalTest('', null, now)).toBeNull();
  });
  it('records an explicit opt-in with a bounded expiry', () => {
    expect(resolveNativeFinalTest('?iosFinalNative=1', null, now))
      .toEqual({ enabled: true, expiresAt: now + IOS_FINAL_TEST_TTL });
  });
  it('survives navigation to a different page without the query parameter', () => {
    expect(resolveNativeFinalTest('', saved, now + 1000)?.enabled).toBe(true);
  });
  it('survives a login callback with unrelated parameters', () => {
    expect(resolveNativeFinalTest('?login=complete', saved, now + 1000)?.enabled).toBe(true);
  });
  it('does not renew the expiry just because another track loads', () => {
    expect(resolveNativeFinalTest('', saved, now + 1000)?.expiresAt).toBe(now + IOS_FINAL_TEST_TTL);
  });
  it('explicitly disables even a previously saved opt-in', () => {
    expect(resolveNativeFinalTest('?iosFinalNative=0', saved, now)).toBeNull();
  });
  it('expires an opt-in without changing the global default', () => {
    expect(resolveNativeFinalTest('', saved, now + IOS_FINAL_TEST_TTL)).toBeNull();
  });
  it.each(['broken', 'null', '{}', '{"enabled":false,"expiresAt":9999999}', '{"enabled":true,"expiresAt":"9999999"}', '{"enabled":true,"expiresAt":999999999999}'])
    ('ignores malformed or unbounded stored preferences: %s', (value) => {
      expect(resolveNativeFinalTest('', value, now)).toBeNull();
    });
  it('does not enable from an unknown flag value', () => {
    expect(resolveNativeFinalTest('?iosFinalNative=yes', null, now)).toBeNull();
  });
});
