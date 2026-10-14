// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, sessionVersion: 0, isLoading: false }) }));
vi.mock('@/utils/userSession', () => ({ sessionFetch: vi.fn(async () => ({ ok: false })) }));

import { useRecentlyPlayedState } from '../src/hooks/useRecentlyPlayed';
import { recordTrackPlayed } from '../src/utils/history';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root, host: HTMLElement, shown: string[];
function List() { shown = useRecentlyPlayedState().ids; return null; }
const mount = async () => { await act(async () => { root.render(<List key={Math.random()} />); }); };
const play = async (id: string) => { await act(async () => { recordTrackPlayed(id); }); };

beforeEach(() => { localStorage.clear(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); vi.useFakeTimers({ now: 1_000_000 }); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });

describe('recently played order while the list is on screen', () => {
  it('does not move a song that is tapped inside the list', async () => {
    await play('a'); vi.setSystemTime(2_000_000); await play('b'); vi.setSystemTime(3_000_000); await play('c');
    await mount(); expect(shown).toEqual(['c', 'b', 'a']);
    vi.setSystemTime(4_000_000); await play('a');
    expect(shown).toEqual(['c', 'b', 'a']);
  });
  it('does not insert a song that was never played before under the finger', async () => {
    await play('a'); vi.setSystemTime(2_000_000); await play('b');
    await mount(); expect(shown).toEqual(['b', 'a']);
    vi.setSystemTime(3_000_000); await play('new');
    expect(shown).toEqual(['b', 'a']);
  });
  it('keeps an empty list empty when the first song is played', async () => {
    await mount(); expect(shown).toEqual([]);
    await play('first');
    expect(shown).toEqual([]);
  });
  it('shows the latest order, newest first, the next time the list is opened', async () => {
    await play('a'); vi.setSystemTime(2_000_000); await play('b');
    await mount(); vi.setSystemTime(3_000_000); await play('a'); vi.setSystemTime(4_000_000); await play('new');
    await mount(); expect(shown).toEqual(['new', 'a', 'b']);
  });
});
