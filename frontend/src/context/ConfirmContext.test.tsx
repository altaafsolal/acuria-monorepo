import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ConfirmProvider, useConfirm } from './ConfirmContext';

function wrapper({ children }: { children: ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}

describe('useConfirm', () => {
  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useConfirm())).toThrow(
      'useConfirm must be used within ConfirmProvider',
    );
  });

  it('returns a function', () => {
    const { result } = renderHook(() => useConfirm(), { wrapper });
    expect(typeof result.current).toBe('function');
  });

  it('confirm returns a promise', () => {
    const { result } = renderHook(() => useConfirm(), { wrapper });

    let promise: Promise<boolean>;
    act(() => {
      promise = result.current({ title: 'Delete?' });
    });

    expect(promise!).toBeInstanceOf(Promise);
  });
});
