import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '../useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('chỉ cập nhật khi giá trị đứng yên đủ lâu', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: '' },
    });
    rerender({ v: 'k' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'ka' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'kan' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe(''); // vẫn đang gõ: chưa đổi

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('kan'); // chỉ giá trị cuối, bỏ qua k, ka
  });
});
