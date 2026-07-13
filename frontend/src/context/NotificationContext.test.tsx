import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { NotificationProvider, useNotifications } from './NotificationContext';

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNotifications', () => {
  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useNotifications())).toThrow(
      'useNotifications must be used within NotificationProvider',
    );
  });

  it('starts with empty notifications', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current.notifications).toEqual([]);
  });

  it('adds a notification via notify', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.notify({ title: 'Success', variant: 'success' });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe('Success');
    expect(result.current.notifications[0].variant).toBe('success');
  });

  it('dismisses a notification', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.notify({ title: 'Test', variant: 'info' });
    });

    const id = result.current.notifications[0].id;

    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('auto-dismisses after 6 seconds', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.notify({ title: 'Auto', variant: 'success' });
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('assigns unique ids to notifications', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.notify({ title: 'One', variant: 'success' });
      result.current.notify({ title: 'Two', variant: 'error' });
    });

    const ids = result.current.notifications.map((n) => n.id);
    expect(new Set(ids).size).toBe(2);
  });
});
