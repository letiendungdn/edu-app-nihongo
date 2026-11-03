# Lộ trình React Native

> **Lộ trình học**, không phải bảng status feature. Inventory Expo: [mobile-tech-stacks.md](./mobile-tech-stacks.md). Chạy: [run-mobile.md](./run-mobile.md). React web: [roadmap-reactjs.md](./roadmap-reactjs.md).

---

## GIAI ĐOẠN 1 — JAVASCRIPT/TYPESCRIPT NỀN TẢNG (tháng 1)

### TypeScript căn bản cho RN

```typescript
// 1. Types cơ bản
interface Vocabulary {
  id: number;
  kana: string;
  meaning: string;
  lessonNumber: number;
}

// 2. Generic functions
async function fetchData<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const vocabs = await fetchData<Vocabulary[]>('/api/vocabularies?lessonNumber=1');

// 3. Discriminated union — tương đương sealed class Kotlin
type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

// 4. Optional chaining + nullish coalescing
const kana = vocab?.kana ?? '';
const count = vocabs?.length ?? 0;

// 5. Destructuring
const { kana, meaning, lessonNumber } = vocab;
const [first, ...rest] = vocabs;
```

---

## GIAI ĐOẠN 2 — REACT NATIVE CỐT LÕI (tháng 2–3)

### Component cơ bản

```tsx
// FlatList — tương đương ListView.builder Flutter
import { FlatList, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface VocabListProps {
  vocabs: Vocabulary[];
  onSelect: (vocab: Vocabulary) => void;
}

const VocabList: React.FC<VocabListProps> = ({ vocabs, onSelect }) => {
  // useCallback — tránh tạo function mới mỗi render (quan trọng với FlatList)
  const renderItem = useCallback(({ item }: { item: Vocabulary }) => (
    <TouchableOpacity onPress={() => onSelect(item)} style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.kana}>{item.kana}</Text>
        <Text style={styles.meaning}>{item.meaning}</Text>
      </View>
    </TouchableOpacity>
  ), [onSelect]);
  
  // keyExtractor — tương đương key prop trong Flutter items()
  const keyExtractor = useCallback((item: Vocabulary) => String(item.id), []);
  
  return (
    <FlatList
      data={vocabs}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Performance: tắt tính năng không cần thiết
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
};

const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  info: { flex: 1 },
  kana: { fontSize: 18, fontWeight: '600' },
  meaning: { fontSize: 14, color: '#666', marginTop: 4 },
});
```

---

### Hooks

```tsx
// 1. useState + useEffect
const VocabScreen: React.FC = () => {
  const [vocabs, setVocabs] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState(1);
  
  useEffect(() => {
    let cancelled = false;
    
    const load = async () => {
      setLoading(true);
      try {
        const data = await vocabApi.getByLesson(lesson);
        if (!cancelled) setVocabs(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    load();
    
    // Cleanup — tránh setState trên unmounted component
    return () => { cancelled = true; };
  }, [lesson]);  // re-run khi lesson thay đổi
  
  return loading ? <ActivityIndicator /> : <VocabList vocabs={vocabs} onSelect={...} />;
};

// 2. useCallback — memoize function
const handlePlayTts = useCallback((kana: string) => {
  Tts.speak(kana, { language: 'ja-JP' });
}, []);  // không thay đổi giữa các render

// 3. useMemo — memoize computed value
const dueCards = useMemo(
  () => srsCards.filter(card => new Date(card.nextReviewAt) <= new Date()),
  [srsCards]
);

// 4. Custom hook — tách logic ra khỏi component
function useVocabByLesson(lesson: number) {
  const [vocabs, setVocabs] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    vocabApi.getByLesson(lesson)
      .then(data => { if (!cancelled) { setVocabs(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [lesson]);
  
  return { vocabs, loading, error };
}

// Dùng trong component
const { vocabs, loading } = useVocabByLesson(selectedLesson);
```

---

## GIAI ĐOẠN 3 — STATE MANAGEMENT (tháng 4)

### Zustand

```typescript
// Zustand — đơn giản hơn Redux, không cần Provider (tương đương Riverpod Flutter)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VocabStore {
  // State
  vocabs: Vocabulary[];
  selectedLesson: number;
  isLoading: boolean;
  
  // Actions
  setLesson: (lesson: number) => void;
  loadVocabs: (lesson: number) => Promise<void>;
  updateSrsCard: (card: SrsCard) => Promise<void>;
}

export const useVocabStore = create<VocabStore>()(
  persist(
    (set, get) => ({
      vocabs: [],
      selectedLesson: 1,
      isLoading: false,
      
      setLesson: (lesson) => {
        set({ selectedLesson: lesson });
        get().loadVocabs(lesson);
      },
      
      loadVocabs: async (lesson) => {
        set({ isLoading: true });
        try {
          const data = await vocabApi.getByLesson(lesson);
          set({ vocabs: data, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },
      
      updateSrsCard: async (card) => {
        // Optimistic update
        set(state => ({
          vocabs: state.vocabs.map(v =>
            v.id === card.vocabId ? { ...v, srsCard: card } : v
          )
        }));
        // Sync to API
        try {
          await srsApi.update(card);
        } catch {
          // Rollback nếu fail — hoặc queue for retry
        }
      },
    }),
    {
      name: 'vocab-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ selectedLesson: state.selectedLesson }), // chỉ persist lesson
    }
  )
);

// Dùng trong component — không cần Provider wrapper
const vocabs = useVocabStore(state => state.vocabs);
const loadVocabs = useVocabStore(state => state.loadVocabs);
```

---

## GIAI ĐOẠN 4 — NAVIGATION (tháng 5)

### React Navigation

```tsx
// Setup với TypeScript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Type-safe params — tương đương GoRoute Flutter
type RootStackParamList = {
  Home: undefined;
  Vocab: { lessonNumber: number };
  Srs: undefined;
  Pronunciation: { kana: string; meaning: string };
  KanjiDraw: { kanji: string; kana: string };
  Live: { roomId: string };
  AiTutor: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Bottom tabs
function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Vocab" component={VocabScreen} />
      <Tab.Screen name="Srs" component={SrsScreen} />
      <Tab.Screen name="Live" component={LiveScreen} />
    </Tab.Navigator>
  );
}

// Root stack
function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={TabNavigator} />
        <Stack.Screen name="Pronunciation" component={PronunciationScreen} />
        <Stack.Screen name="KanjiDraw" component={KanjiDrawScreen} />
        <Stack.Screen name="AiTutor" component={AiTutorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Navigate type-safe
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const navigation = useNavigation<NavProp>();
navigation.navigate('Pronunciation', { kana: 'おはよう', meaning: 'Xin chào buổi sáng' });

// Đọc params type-safe
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

type PronRouteProps = RouteProp<RootStackParamList, 'Pronunciation'>;
const route = useRoute<PronRouteProps>();
const { kana, meaning } = route.params;

// Deep linking — tương đương Flutter deep linking
const linking = {
  prefixes: ['nihongo://', 'https://nihongo.app'],
  config: {
    screens: {
      Vocab: 'vocab/:lessonNumber',
      KanjiDraw: 'kanji/:kanji',
    },
  },
};
```

---

## GIAI ĐOẠN 5 — NEW ARCHITECTURE + NATIVE (tháng 6)

### New Architecture (RN 0.73+)

```typescript
// JSI — JavaScript Interface: gọi native không qua bridge bất đồng bộ
// Trước New Architecture: JS → serialized JSON → native (async bridge)
// Sau New Architecture: JS → JSI direct call → native (sync, không serialize)

// Turbo Modules — module native với type safety
// Tương đương Platform Channel Flutter nhưng có codegen

// metro.config.js
module.exports = {
  transformer: {
    unstable_allowRequireContext: true,
  },
};

// Fabric — new renderer đồng bộ hóa với native view hierarchy
// Tự động nếu dùng RN >= 0.73 + Expo 50+
```

---

### Native Module (Turbo Module)

```typescript
// Tương đương Platform Channel trong Flutter
// JavaScript side
import { NativeModules } from 'react-native';

interface NihongoNativeModule {
  measureFrameRate: () => Promise<number>;
  playHaptic: (type: 'light' | 'medium' | 'heavy') => void;
}

const { NihongoNative } = NativeModules as { NihongoNative: NihongoNativeModule };

// Dùng
const fps = await NihongoNative.measureFrameRate();
NihongoNative.playHaptic('light');
```

---

### Camera + ML (Vision Camera)

```tsx
// react-native-vision-camera với ML Frame Processor
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useTextRecognition } from 'vision-camera-ocr';

function CameraTranslateScreen() {
  const device = useCameraDevice('back');
  const { recognize } = useTextRecognition();
  
  const [detectedText, setDetectedText] = useState('');
  
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const result = recognize(frame);
    if (result.blocks.length > 0) {
      const text = result.blocks.map(b => b.text).join('\n');
      runOnJS(setDetectedText)(text);
    }
  }, []);
  
  if (!device) return <Text>Không có camera</Text>;
  
  return (
    <View style={{ flex: 1 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      {detectedText ? (
        <TranslationOverlay text={detectedText} />
      ) : null}
    </View>
  );
}
```

---

### LiveKit Integration

```tsx
// Tương đương live.service.ts nhưng phía mobile
import { Room, RoomEvent, Track, LocalVideoTrack } from '@livekit/react-native';

function LiveStreamScreen({ roomName, isHost }: { roomName: string; isHost: boolean }) {
  const [room] = useState(() => new Room());
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  useEffect(() => {
    const token = isHost ? hostToken : viewerToken;  // fetch từ backend
    
    room.connect(LIVEKIT_URL, token).then(() => {
      if (isHost) {
        room.localParticipant.setCameraEnabled(true);
        room.localParticipant.setMicrophoneEnabled(true);
      }
    });
    
    room.on(RoomEvent.ParticipantConnected, () =>
      setParticipants([...room.remoteParticipants.values()])
    );
    
    return () => { room.disconnect(); };
  }, []);
  
  return (
    <View style={{ flex: 1 }}>
      {/* Host video */}
      {isHost && <VideoTrack track={room.localParticipant.videoTrackPublications.values().next().value?.track} />}
      {/* Viewer list */}
      {participants.map(p => <ParticipantView key={p.sid} participant={p} />)}
    </View>
  );
}
```

---

## GIAI ĐOẠN 6 — CICD + TESTING (tháng 7–8)

### Testing

```typescript
// Jest + React Testing Library
import { render, fireEvent, waitFor } from '@testing-library/react-native';

describe('VocabList', () => {
  it('renders vocab items', () => {
    const { getByText } = render(
      <VocabList vocabs={fakeVocabs} onSelect={jest.fn()} />
    );
    expect(getByText('おはよう')).toBeTruthy();
    expect(getByText('Xin chào buổi sáng')).toBeTruthy();
  });
  
  it('calls onSelect when item tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <VocabList vocabs={fakeVocabs} onSelect={onSelect} />
    );
    fireEvent.press(getByText('おはよう'));
    expect(onSelect).toHaveBeenCalledWith(fakeVocabs[0]);
  });
  
  it('shows loading indicator while fetching', async () => {
    const { getByTestId, queryByTestId } = render(<VocabScreen />);
    expect(getByTestId('loading')).toBeTruthy();
    await waitFor(() => expect(queryByTestId('loading')).toBeNull());
  });
});

// Mock Zustand store
jest.mock('../store/vocabStore', () => ({
  useVocabStore: jest.fn((selector) => selector({
    vocabs: fakeVocabs,
    isLoading: false,
    loadVocabs: jest.fn(),
  })),
}));
```

---

### EAS Build + GitHub Actions

```yaml
# .github/workflows/rn-ci.yml
name: React Native CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx jest --coverage

  build-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas build --platform android --profile preview --non-interactive
```

---

## CHECKLIST

```
Giai đoạn 1 — TypeScript:
  □ Interface, type, generic
  □ Optional chaining, nullish coalescing
  □ Async/await, Promise, error handling

Giai đoạn 2 — RN Core:
  □ FlatList với keyExtractor + renderItem
  □ StyleSheet.create
  □ useCallback, useMemo (tránh re-render)
  □ Custom hooks tách logic

Giai đoạn 3 — State:
  □ Zustand store với persist middleware
  □ Selector pattern (tránh re-render thừa)

Giai đoạn 4 — Navigation:
  □ Type-safe RootStackParamList
  □ useNavigation, useRoute
  □ Deep linking

Giai đoạn 5 — Native:
  □ New Architecture: hiểu JSI vs Bridge
  □ Vision Camera frame processor
  □ Native Module cơ bản

Giai đoạn 6 — Senior:
  □ Jest + RTL: render, fireEvent, waitFor
  □ EAS Build profile (development/preview/production)
  □ OTA Update với expo-updates
  □ Performance: Flipper + React DevTools
  □ Hermes engine
```

---

## RESOURCES

- **Official**: reactnative.dev (docs rất tốt)
- **Expo**: docs.expo.dev
- **Navigation**: reactnavigation.org
- **State**: docs.pmnd.rs/zustand (Zustand)
- **YouTube**: Catalin Miron, William Candillon (animations)
- **Book**: React Native in Action (Manning)
- **Newsletter**: React Native Weekly

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **11. Lộ trình theo framework mobile**. Cùng nhóm:

- [roadmap-android.md](./roadmap-android.md) — Android (Kotlin + Jetpack)
- [roadmap-swift.md](./roadmap-swift.md) — Swift / iOS
- [roadmap-flutter.md](./roadmap-flutter.md) — Flutter

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
