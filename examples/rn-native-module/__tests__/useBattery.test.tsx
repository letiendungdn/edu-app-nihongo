import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useBattery } from '../src/useBattery';

// Test chạy trên Node, không có native. Mock module theo đúng spec.
// Biến dùng trong jest.mock() phải bắt đầu bằng `mock` (Jest đưa jest.mock lên đầu file).
let mockEmit: (v: number) => void = () => {};
const mockRemove = jest.fn();
const mockStop = jest.fn();
jest.mock('../specs/NativeDemoDevice', () => ({
  __esModule: true,
  default: {
    getDeviceName: () => 'Test Phone',
    getBatteryLevel: jest.fn(() => Promise.resolve(80)),
    startBatteryUpdates: jest.fn(),
    stopBatteryUpdates: () => mockStop(),
    onBatteryChanged: (cb: (v: number) => void) => {
      mockEmit = cb;
      return { remove: mockRemove };
    },
  },
}));

function Probe() {
  const { level, error } = useBattery();
  return <Text>{error ?? String(level)}</Text>;
}

it('đọc pin lần đầu rồi cập nhật theo sự kiện native', async () => {
  const view = await render(<Probe />); // bản mới: render là async
  expect(await screen.findByText('80')).toBeTruthy();
  await act(async () => mockEmit(42));
  expect(screen.getByText('42')).toBeTruthy();
  await view.unmount();
  expect(mockRemove).toHaveBeenCalled();
  expect(mockStop).toHaveBeenCalled();
});

it('native reject: hiện mã lỗi', async () => {
  const mod = jest.requireMock('../specs/NativeDemoDevice').default;
  mod.getBatteryLevel.mockImplementationOnce(() =>
    Promise.reject(Object.assign(new Error('Không đọc được pin'), { code: 'E_BATTERY_UNAVAILABLE' })),
  );
  await render(<Probe />);
  expect(await screen.findByText('E_BATTERY_UNAVAILABLE: Không đọc được pin')).toBeTruthy();
});
