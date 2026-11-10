import { useEffect, useState } from 'react';

/**
 * Trả về `value` sau khi nó đứng yên `delayMs`. Dùng cho ô tìm kiếm "gõ tới đâu tìm tới đó":
 * gõ "kandou" chỉ gọi API một lần khi ngừng gõ, không gọi 6 lần cho k, ka, kan…
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer); // gõ tiếp trước khi hết giờ: hủy lần cũ, đếm lại
  }, [value, delayMs]);
  return debounced;
}
