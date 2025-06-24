import React from 'react';
import { render } from '@testing-library/react';
jest.mock('../App.tsx', () => ({ __esModule: true, default: () => <div /> }));
jest.mock('../hooks/usePresence', () => ({ usePresence: () => [] }));

let Root: React.FC;
beforeEach(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  const mod = await import('../main');
  Root = mod.Root;
});
import * as auth from '../hooks/useAuth';
import * as messages from '../hooks/useMessages';
import * as dms from '../hooks/useDirectMessages';
import * as presence from '../utils/updatePresence';

import '@testing-library/jest-dom';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signOut: jest.fn(),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn(), unsubscribe: jest.fn() })),
    from: jest.fn(() => ({ select: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis() })),
    rpc: jest.fn(),
  },
}));

test('focus triggers refresh without reload', () => {
  const authSpy = jest.spyOn(auth, 'triggerAuthRefresh').mockImplementation(() => Promise.resolve());
  const msgSpy = jest.spyOn(messages, 'triggerMessagesRefresh').mockImplementation(() => {});
  const dmSpy = jest.spyOn(dms, 'triggerDMsRefresh').mockImplementation(() => {});
  const presSpy = jest.spyOn(presence, 'updatePresence').mockImplementation(() => Promise.resolve());

  render(<Root />);

  window.dispatchEvent(new Event('focus'));

  expect(authSpy).toHaveBeenCalled();
  expect(msgSpy).toHaveBeenCalled();
  expect(dmSpy).toHaveBeenCalled();
  expect(presSpy).toHaveBeenCalled();
});

test('pageshow triggers refresh', () => {
  const authSpy = jest.spyOn(auth, 'triggerAuthRefresh').mockImplementation(() => Promise.resolve());
  const msgSpy = jest.spyOn(messages, 'triggerMessagesRefresh').mockImplementation(() => {});
  const dmSpy = jest.spyOn(dms, 'triggerDMsRefresh').mockImplementation(() => {});
  const presSpy = jest.spyOn(presence, 'updatePresence').mockImplementation(() => Promise.resolve());

  render(<Root />);

  window.dispatchEvent(new Event('pageshow'));

  expect(authSpy).toHaveBeenCalled();
  expect(msgSpy).toHaveBeenCalled();
  expect(dmSpy).toHaveBeenCalled();
  expect(presSpy).toHaveBeenCalled();
});

test('visibility change triggers refresh', () => {
  const authSpy = jest.spyOn(auth, 'triggerAuthRefresh').mockImplementation(() => Promise.resolve());
  const msgSpy = jest.spyOn(messages, 'triggerMessagesRefresh').mockImplementation(() => {});
  const dmSpy = jest.spyOn(dms, 'triggerDMsRefresh').mockImplementation(() => {});
  const presSpy = jest.spyOn(presence, 'updatePresence').mockImplementation(() => Promise.resolve());

  render(<Root />);

  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));

  expect(authSpy).toHaveBeenCalled();
  expect(msgSpy).toHaveBeenCalled();
  expect(dmSpy).toHaveBeenCalled();
  expect(presSpy).toHaveBeenCalled();
});
