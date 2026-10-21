import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { setupPushNotifications } from '../src/utils/push';

export default function RootLayout() {
  useEffect(() => {
    void setupPushNotifications(() => router.push('/srs'));
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#1d4ed8',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Nihongo — EDU APP' }} />
        <Stack.Screen name="vocab" options={{ title: 'Từ vựng' }} />
        <Stack.Screen name="srs" options={{ title: 'Ôn tập SRS' }} />
        <Stack.Screen name="login" options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="sentence-practice" options={{ title: 'Luyện câu AI' }} />
        <Stack.Screen name="ai-tutor" options={{ title: 'AI Tutor' }} />
        <Stack.Screen name="pronunciation" options={{ title: 'Luyện phát âm' }} />
        <Stack.Screen name="kanji-draw" options={{ title: 'Vẽ Kanji' }} />
        <Stack.Screen name="premium" options={{ title: 'Nâng cấp Premium' }} />
        <Stack.Screen
          name="camera-translate"
          options={{
            title: 'Dịch camera',
            headerStyle: { backgroundColor: '#111' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen name="live/index" options={{ title: 'Livestream' }} />
        <Stack.Screen
          name="live/viewer"
          options={{
            title: 'Xem live',
            headerStyle: { backgroundColor: '#111' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen
          name="live/host"
          options={{
            title: 'Phát live',
            headerStyle: { backgroundColor: '#111' },
            headerTintColor: '#fff',
          }}
        />
      </Stack>
    </>
  );
}
