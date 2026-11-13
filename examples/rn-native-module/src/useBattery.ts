import { useEffect, useState } from 'react';
import NativeDemoDevice from '../specs/NativeDemoDevice';

// Bọc module native trong một hook: màn hình không gọi native trực tiếp, test chỉ cần mock một chỗ.
export function useBattery() {
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    NativeDemoDevice.getBatteryLevel()
      .then(setLevel)
      .catch((e: { code?: string; message: string }) => setError(`${e.code ?? 'ERR'}: ${e.message}`));

    const sub = NativeDemoDevice.onBatteryChanged((value) => setLevel(value));
    NativeDemoDevice.startBatteryUpdates();
    return () => {
      // Không dọn thì native vẫn giữ listener sau khi màn hình đóng.
      sub.remove();
      NativeDemoDevice.stopBatteryUpdates();
    };
  }, []);

  return { level, error };
}
