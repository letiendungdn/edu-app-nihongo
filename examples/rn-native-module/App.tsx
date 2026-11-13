import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NativeDemoDevice from './specs/NativeDemoDevice';
import { useBattery } from './src/useBattery';

function DeviceScreen() {
  const { level, error } = useBattery();
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Native module demo</Text>
      <Text testID="device">Máy: {NativeDemoDevice.getDeviceName()}</Text>
      <Text testID="battery">Pin: {error ?? (level === null ? 'đang đọc…' : `${Math.round(level)}%`)}</Text>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DeviceScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
});
