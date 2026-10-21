# Phỏng vấn Senior React Native — Câu hỏi & Đáp án

> File local — không upload cloud. Tổng hợp: Expo vs CLI · REST vs GraphQL · TanStack vs Redux · MQTT · IoT System Design · RN System Design.

---

## MỤC LỤC

1. [Expo vs React Native CLI](#1-expo-vs-react-native-cli)
2. [REST API vs GraphQL](#2-rest-api-vs-graphql)
3. [TanStack Query vs Redux Thunk/Saga](#3-tanstack-query-vs-redux-thunksaga)
4. [Axios — khi nào dùng](#4-axios--khi-nào-dùng)
5. [Parallel calls — GraphQL + REST](#5-parallel-calls--graphql--rest)
6. [MQTT & IoT trên React Native](#6-mqtt--iot-trên-react-native)
7. [Thiết kế hệ thống IoT](#7-thiết-kế-hệ-thống-iot)
8. [System Design — React Native](#8-system-design--react-native)
9. [Sample CLI App Structure](#9-sample-cli-app-structure)
10. [TanStack Query có thay thế hoàn toàn Redux không?](#10-tanstack-query-có-thay-thế-hoàn-toàn-redux-không)
11. [OTA Update — EAS vs CodePush](#11-ota-update--eas-vs-codepush)
12. [Sensor trên React Native](#12-sensor-trên-react-native)
13. [Khi nào nâng version React Native?](#13-khi-nào-nâng-version-react-native--thư-viện)
14. [Quy trình update targetSdk Android](#14-quy-trình-update-targetsdk-android-trong-react-native-cli)
15. [CI/CD — GitHub Actions + Fastlane](#15-cicd--github-actions--fastlane)
16. [Setup Keystore + Play Store + ASC + Match](#16-setup-keystore--play-store--app-store-connect--fastlane-match)
17. [Lộ trình học AWS cho Mobile Developer](#17-lộ-trình-học-aws-cho-mobile-developer)
18. [OAuth 2.0 / OIDC trên React Native](#18-oauth-20--oidc-trên-react-native)
19. [Expo — Kinh nghiệm thực tế](#19-expo--kinh-nghiệm-thực-tế)

---

## 1. Expo vs React Native CLI

### Q: Khi nào dùng Expo, khi nào dùng React Native CLI?

| Tiêu chí | Expo (Managed) | React Native CLI |
|----------|---------------|-----------------|
| Native module tùy chỉnh | ❌ | ✅ |
| BLE / USB / NFC | ❌ | ✅ |
| Background task phức tạp | Hạn chế | ✅ |
| OTA update | ✅ EAS Update | Cần CodePush |
| Build cloud | ✅ EAS Build | Cần máy Mac/PC |
| Team nhỏ, ship nhanh | ✅ | Phức tạp hơn |
| App store production | ✅ | ✅ |
| Thêm SDK bên thứ 3 | Giới hạn | Tự do |

**Dùng Expo khi:**
- Không cần native module đặc biệt
- Muốn OTA update không qua store
- Team chưa quen native (Android/iOS)
- MVP, prototype, internal tools

**Dùng React Native CLI khi:**
- Cần BLE, USB, NFC, camera custom pipeline
- Cần native performance tối ưu (game-level)
- Tích hợp SDK chỉ có native (Bluetooth Low Energy trong ICUCO)
- App IoT cần background service thực sự
- Tùy chỉnh build config, signing, build phase

**Expo Bare Workflow** — trung gian: giữ Expo tooling nhưng mở native modules.

---

### Q: ICUCO dùng React Native CLI hay Expo? Tại sao?

**A:** CLI. Vì cần kết nối nhiều thiết bị BLE đồng thời (`react-native-ble-manager`), push notification qua Firebase, và QR scan. Các library này cần native module không có trong Expo Managed.

---

### Q: EAS Build khác gì `react-native run-android`?

**A:**
- `run-android` — build local, cần Android Studio + JDK + device kết nối trực tiếp. Chỉ dùng dev.
- EAS Build — build trên cloud Expo, không cần môi trường local. Xuất APK/IPA production. Kết hợp với GitHub Actions cho CI/CD.

---

## 2. REST API vs GraphQL

### Q: Khi nào dùng REST, khi nào dùng GraphQL?

**REST — dùng khi:**
- CRUD resource rõ ràng, ít quan hệ (`GET /users`, `POST /orders`)
- Cần HTTP cache tự nhiên (CDN, browser cache GET)
- File upload, streaming, webhook (GraphQL phức tạp hơn)
- Public API cho third-party tích hợp
- Team nhỏ, ship nhanh

**GraphQL — dùng khi:**
- Client tự chọn field — mobile cần ít field hơn web → tránh over-fetch
- Nhiều client khác nhau shape data khác nhau (app iOS, web admin, Android)
- Data quan hệ phức tạp, thường fetch nested resource trong 1 round-trip
- Rapid iteration — frontend thay shape mà không cần backend deploy API mới

> **Rule of thumb:** Server quyết định shape data → REST. Client quyết định shape data → GraphQL.

---

### Q: ICUCO dùng GraphQL + REST. Tại sao không dùng REST thuần?

**A:** ICUCO có 2 client rất khác nhau:
- **Parent mobile app**: cần realtime location + alert, ít field, cần gọi nhanh
- **Web admin (school staff)**: cần full data: device list, event log, child list, route map

GraphQL cho phép mobile chỉ lấy `{ child { name, location, busId } }` trong khi admin lấy toàn bộ object graph. Nếu dùng REST, phải tạo 2 endpoint riêng hoặc chịu over-fetch.

---

### Q: Nhược điểm của GraphQL?

**A:**
- N+1 query — mỗi resolver có thể gọi DB riêng → cần DataLoader để batch
- HTTP cache phức tạp — hầu hết dùng POST nên không cache được ở CDN như REST GET
- File upload — cần multipart spec phức tạp, thường fallback REST riêng
- Schema overhead — phải duy trì schema, resolver, codegen
- Debugging khó hơn REST (không có curl đơn giản)

---

## 3. TanStack Query vs Redux Thunk/Saga

### Q: Khi nào dùng TanStack Query, khi nào dùng Redux?

| Vấn đề | TanStack Query | Redux Thunk/Saga |
|--------|---------------|-----------------|
| Fetch & cache server data | ✅ sinh ra để làm điều này | Phải tự viết logic |
| Loading / error state | ✅ tự động | Tự manage |
| Polling, refetch on focus | ✅ built-in | Tự viết |
| Optimistic update | ✅ `onMutate` | Phức tạp |
| Global UI state (theme, auth) | ❌ | ✅ |
| Complex async side effects | Không phù hợp | Saga xuất sắc |
| Offline queue | Cần plugin | Saga làm được |
| Business logic phức tạp | Không phù hợp | ✅ |

**Dùng TanStack Query khi:**
- Fetch, cache, sync server state (80% use case app)
- Muốn `isLoading`, `isError`, `refetch`, `invalidate` mà không tự viết

**Dùng Redux Thunk khi:**
- Global state: auth session, cart, theme, user preferences
- Async đơn giản, không phức tạp (Thunk đủ dùng)

**Dùng Redux Saga khi:**
- Side effects phức tạp: retry logic, race condition, debounce action
- Cần cancel request đang chạy khi user navigate away
- Workflow phức tạp: login → fetch profile → setup socket → subscribe notifications

**Best practice hiện tại:**
```
Server state   → TanStack Query
Client/UI state → Zustand hoặc Redux Toolkit (nếu cần)
Complex async  → Redux Saga
```

---

### Q: Phân biệt `useQuery` và `useMutation` trong TanStack?

**A:**
- `useQuery` — fetch data (GET), tự cache, tự refetch, chạy ngay khi mount
- `useMutation` — thay đổi data (POST/PUT/DELETE), chạy khi gọi `.mutate()`, hỗ trợ `onSuccess/onError/onMutate`

```typescript
// useQuery — tự chạy
const { data, isLoading } = useQuery({
  queryKey: ['vocab', lessonId],
  queryFn: () => fetchVocab(lessonId),
  staleTime: 5 * 60 * 1000,   // cache 5 phút
  refetchOnWindowFocus: true,
});

// useMutation — chạy khi user action
const mutation = useMutation({
  mutationFn: (data) => submitAnswer(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  onMutate: async (newData) => {
    // optimistic update
    const prev = queryClient.getQueryData(['progress']);
    queryClient.setQueryData(['progress'], (old) => [...old, newData]);
    return { prev };
  },
  onError: (_, __, ctx) => queryClient.setQueryData(['progress'], ctx?.prev),
});
```

---

### Q: Saga vs Thunk — sự khác nhau thực tế?

```javascript
// Thunk — đơn giản, inline async
export const loginThunk = (credentials) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const user = await authApi.login(credentials);
    dispatch(setUser(user));
  } catch (err) {
    dispatch(setError(err.message));
  } finally {
    dispatch(setLoading(false));
  }
};

// Saga — phức tạp, có thể cancel, race, retry
function* loginSaga(action) {
  try {
    const user = yield call(authApi.login, action.payload);
    yield put(setUser(user));
    yield put(fetchProfileAction());         // chain action
    yield take(PROFILE_LOADED);             // chờ action khác
    yield put(setupSocketAction());
  } catch (err) {
    yield put(setError(err.message));
  }
}

// Race condition với Saga
function* watchLogin() {
  while (true) {
    const loginAction = yield take(LOGIN_REQUEST);
    const { result, cancel } = yield race({
      result: call(loginSaga, loginAction),
      cancel: take(LOGIN_CANCEL),
    });
    if (cancel) yield put(resetAuthState());
  }
}
```

---

## 4. Axios — khi nào dùng

### Q: Khi nào dùng Axios, khi nào dùng `fetch`?

**Dùng Axios khi:**
- Cần interceptor tập trung (thêm auth header, handle 401 refresh token tự động)
- Upload progress tracking
- Timeout config dễ hơn
- Team đã quen, codebase đã dùng

**Dùng `fetch` khi:**
- App đơn giản, không cần interceptor
- Muốn bundle size nhỏ hơn (Axios ~13kb)
- Streaming response (fetch hỗ trợ tốt hơn)

**Best practice — Axios instance với interceptor:**

```typescript
// src/lib/apiClient.ts
import axios from 'axios';
import { getToken, refreshToken, clearAuth } from './auth';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor — tự động thêm token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto refresh khi 401
let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push(() => resolve(api(original)));
        });
      }
      isRefreshing = true;
      try {
        await refreshToken();
        queue.forEach((cb) => cb());
        queue = [];
        return api(original);
      } catch {
        clearAuth();
        // navigate to login
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 5. Parallel calls — GraphQL + REST

### Q: Khi nào nên gọi song song GraphQL với API REST?

**Dùng `Promise.all` khi:**
- 2+ request độc lập nhau (không cần kết quả của nhau)
- Muốn tiết kiệm thời gian tổng = max(t1, t2) thay vì t1 + t2

```typescript
// ❌ Tuần tự — lãng phí
const user = await fetchUser(id);         // 200ms
const notifications = await fetchNotifs(id); // 150ms
// Tổng: 350ms

// ✅ Song song — nhanh hơn
const [user, notifications] = await Promise.all([
  fetchUser(id),
  fetchNotifs(id),
]);
// Tổng: 200ms (max của 2)
```

**Khi nào KHÔNG dùng song song:**
- Request B cần dữ liệu từ kết quả A → bắt buộc tuần tự
- Rate limit chặt — nhiều request cùng lúc dễ bị 429
- Server không handle concurrent well

**GraphQL + REST song song trong React Native:**

```typescript
// Màn hình Dashboard cần: user profile (GraphQL) + push notification token (REST)
const [profile, pushStatus] = await Promise.all([
  graphqlClient.query(GET_USER_PROFILE),
  restApi.get('/notifications/status'),
]);
```

**TanStack Query tự làm song song:**

```typescript
// Các useQuery độc lập → TanStack tự chạy song song
const { data: vocab } = useQuery({ queryKey: ['vocab'], queryFn: fetchVocab });
const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: fetchProgress });
const { data: streak } = useQuery({ queryKey: ['streak'], queryFn: fetchStreak });
// 3 request chạy cùng lúc tự động
```

**`useQueries` khi số lượng dynamic:**

```typescript
const results = useQueries({
  queries: lessonIds.map((id) => ({
    queryKey: ['lesson', id],
    queryFn: () => fetchLesson(id),
  })),
});
```

---

## 6. MQTT & IoT trên React Native

### Q: MQTT là gì? Khi nào dùng MQTT thay vì REST/WebSocket?

**MQTT (Message Queuing Telemetry Transport):**
- Protocol publish/subscribe nhẹ, thiết kế cho IoT, mạng không ổn định
- Client publish lên **topic**, broker fan-out đến tất cả subscriber
- 3 QoS levels: 0 (at-most-once), 1 (at-least-once), 2 (exactly-once)

| | REST | WebSocket | MQTT |
|--|------|-----------|------|
| Model | Request/Response | Full-duplex | Pub/Sub |
| Overhead | HTTP header lớn | Vừa | Rất nhỏ (2 byte header) |
| Offline | ❌ | ❌ | ✅ persistent session |
| Battery | Tốn (polling) | Vừa | Tối ưu |
| Fan-out 1→N | Phức tạp | Cần manage | Built-in broker |
| Use case | CRUD, upload | Chat, game | Sensor, IoT, telemetry |

**Dùng MQTT khi:**
- Device gửi sensor data thường xuyên (nhiệt độ, GPS, BLE heartbeat)
- Cần fan-out: 1 sensor → nhiều client nhận
- Mạng không ổn định (MQTT reconnect tự động + retained message)
- Battery sensitive device

**Dùng WebSocket khi:**
- Chat, game realtime, collaboration
- Browser client (MQTT over WS cũng được nhưng phức tạp hơn)

---

### Q: Implement MQTT trong React Native thế nào?

```bash
npm install mqtt
# hoặc
npm install react-native-mqtt  # native bridge
```

```typescript
// src/services/mqttService.ts
import mqtt, { MqttClient } from 'mqtt';

class MQTTService {
  private client: MqttClient | null = null;
  private handlers = new Map<string, (msg: string) => void>();

  connect(brokerUrl: string, token: string) {
    this.client = mqtt.connect(brokerUrl, {
      username: 'app',
      password: token,
      clientId: `rn_${Math.random().toString(16).slice(2)}`,
      reconnectPeriod: 3000,   // tự reconnect sau 3s
      keepalive: 60,
    });

    this.client.on('connect', () => console.log('MQTT connected'));

    this.client.on('message', (topic, payload) => {
      const handler = this.handlers.get(topic);
      handler?.(payload.toString());
    });

    this.client.on('error', (err) => console.error('MQTT error', err));
  }

  subscribe(topic: string, handler: (msg: string) => void) {
    this.handlers.set(topic, handler);
    this.client?.subscribe(topic, { qos: 1 });
  }

  publish(topic: string, payload: string, qos: 0 | 1 | 2 = 1) {
    this.client?.publish(topic, payload, { qos });
  }

  disconnect() {
    this.client?.end();
    this.client = null;
  }
}

export const mqttService = new MQTTService();
```

```typescript
// Trong component
useEffect(() => {
  mqttService.connect('mqtt://broker.icuco.io:1883', authToken);

  // Nhận vị trí xe bus realtime
  mqttService.subscribe(`bus/${busId}/location`, (msg) => {
    const { lat, lng } = JSON.parse(msg);
    setBusLocation({ lat, lng });
  });

  // Nhận alert BLE (child lên/xuống xe)
  mqttService.subscribe(`bus/${busId}/ble-events`, (msg) => {
    const event = JSON.parse(msg);
    showAlert(event);
  });

  return () => mqttService.disconnect();
}, [busId]);
```

---

### Q: MQTT QoS 0, 1, 2 khác nhau thế nào? Dùng cái nào cho IoT?

| QoS | Đảm bảo | Overhead | Dùng cho |
|-----|---------|---------|---------|
| 0 | Gửi 1 lần, không confirm | Thấp nhất | Sensor không quan trọng (nhiệt độ mỗi giây) |
| 1 | At-least-once (có thể duplicate) | Vừa | Alert, notification |
| 2 | Exactly-once (4-way handshake) | Cao nhất | Thanh toán, lệnh quan trọng |

**ICUCO nên dùng:**
- GPS location → QoS 0 (cập nhật liên tục, mất 1 frame không sao)
- BLE child detection → QoS 1 (quan trọng, chấp nhận duplicate check)
- Emergency alert → QoS 2 (bắt buộc nhận đúng 1 lần)

---

## 7. Thiết kế hệ thống IoT

### Q: Thiết kế hệ thống IoT monitoring cho trường mầm non (ICUCO-style)

**Yêu cầu:**
- 50 xe bus, mỗi xe có 1 BLE scanner + GPS
- 1000 trẻ em, mỗi em đeo BLE tag
- 5000 parent app + 200 school admin web
- Realtime alert khi trẻ lên/xuống xe
- Lịch sử 30 ngày

**Architecture:**

```
BLE Scanner (Raspberry Pi / Android trên xe)
    │
    │ MQTT QoS 1
    ▼
MQTT Broker (Mosquitto/HiveMQ cluster)
    │
    ├──► Event Processor (Node.js/Spring Boot)
    │       ├── Validate BLE tag → match child
    │       ├── Persist → PostgreSQL
    │       └── Push alert → FCM/APNs
    │
    ├──► Location Aggregator
    │       └── GPS → Redis (latest position, TTL 60s)
    │
    └──► WebSocket Gateway (cho web admin)

Client Apps:
- Parent mobile (RN) → MQTT sub bus/{id}/events + REST history
- School web (Next.js) → WebSocket realtime map + REST admin
- Bus driver Android → MQTT pub + REST scan log
```

**Database design:**

```sql
-- Core tables
BusDevice(id, busPlate, mqttClientId, lastSeen)
Child(id, name, bleTagMac, schoolId, parentUserId)
BusEvent(id, busId, childId, eventType, timestamp, lat, lng)
  -- eventType: BOARD, ALIGHT, SCAN_FAILED

-- Indexes
CREATE INDEX idx_bus_event_time ON BusEvent(busId, timestamp DESC);
CREATE INDEX idx_child_tag ON Child(bleTagMac);  -- lookup nhanh khi receive MQTT
```

**Scaling considerations:**
- MQTT Broker cluster — HiveMQ/EMQX với load balancer
- Redis pub/sub làm bridge MQTT → WebSocket cho web admin
- Kafka cho event queue nếu >100k events/day (không mất data khi processor restart)
- PostgreSQL partitioning theo tháng cho BusEvent

---

### Q: Xử lý mất kết nối trong IoT mobile app như thế nào?

```typescript
// 3 layers của offline handling
class IoTConnectionManager {
  private mqttConnected = false;
  private localQueue: Event[] = [];

  // Layer 1: MQTT persistent session
  // broker giữ message khi client offline (nếu QoS > 0 + clean: false)
  connect() {
    mqtt.connect(url, { clean: false, clientId: PERSISTENT_ID });
  }

  // Layer 2: Local queue khi không có internet
  sendEvent(event: Event) {
    if (!this.mqttConnected) {
      this.localQueue.push(event);        // lưu SQLite
      return;
    }
    mqtt.publish(event.topic, event.payload, { qos: 1 });
  }

  // Layer 3: Flush khi reconnect
  onReconnect() {
    this.mqttConnected = true;
    for (const event of this.localQueue) {
      this.sendEvent(event);
    }
    this.localQueue = [];
  }
}
```

---

## 8. System Design — React Native

### Q: Thiết kế offline-first app học tiếng Nhật (EDU App mobile)

**Yêu cầu:**
- 5000 vocab, 200 grammar, sync với server
- SRS review hoạt động offline
- Sync khi có mạng, không mất data

**Solution:**

```
Local SQLite (source of truth khi offline)
    ↕ sync
Remote PostgreSQL (source of truth khi online)

Flow:
1. App start → load từ SQLite (instant)
2. Background → fetch server diff (nếu online)
3. User action → write SQLite + mark pending
4. Flush queue → POST /bulk-sync khi online
```

```typescript
// Sync strategy — timestamp-based delta sync
async function syncVocab() {
  const lastSync = await getLastSyncTime();
  const { updated, deleted } = await api.getVocabDiff({ since: lastSync });

  await db.transaction(async (tx) => {
    for (const v of updated) {
      await tx.executeSql(
        `INSERT OR REPLACE INTO vocabulary VALUES (?,?,?,?,?)`,
        [v.id, v.word, v.meaning, v.srsData, v.updatedAt]
      );
    }
    for (const id of deleted) {
      await tx.executeSql(`DELETE FROM vocabulary WHERE id = ?`, [id]);
    }
  });

  await setLastSyncTime(Date.now());
}
```

---

### Q: Làm thế nào handle refresh token race condition trong React Native?

**Vấn đề:** 2 API call cùng nhận 401 → cả 2 cùng call refresh → 1 cái fail (refresh token dùng 1 lần)

```typescript
// ✅ Fix: mutex/semaphore pattern
let refreshPromise: Promise<string> | null = null;

async function getValidToken(): Promise<string> {
  if (!isExpired(accessToken)) return accessToken;

  // Nếu đã có promise refresh đang chạy → cùng chờ
  if (!refreshPromise) {
    refreshPromise = callRefreshAPI().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;  // tất cả caller chờ 1 promise duy nhất
}
```

---

### Q: Navigation architecture cho app lớn (>20 màn hình)?

```
Stack       → trang có back button (Detail, Settings)
Tab         → main navigation (Home, SRS, Profile)
Drawer      → secondary navigation (ít dùng)
Modal       → overlay, confirm dialog

// Expo Router (file-based — giống Next.js)
app/
  (tabs)/
    index.tsx         → Home tab
    srs.tsx           → SRS tab
    profile.tsx       → Profile tab
  vocab/
    index.tsx         → /vocab list
    [id].tsx          → /vocab/123 detail
  mock-exam/
    index.tsx
    take.tsx
  (auth)/
    login.tsx
    register.tsx
  _layout.tsx         → root layout, auth guard
```

---

### Q: Performance optimization trong React Native list lớn?

```typescript
// ❌ FlatList render hết
<FlatList data={allVocab} renderItem={...} />

// ✅ FlashList (thay thế nhanh hơn 10x)
import { FlashList } from '@shopify/flash-list';
<FlashList
  data={vocab}
  renderItem={renderItem}
  estimatedItemSize={72}    // quan trọng cho perf
  keyExtractor={(item) => String(item.id)}
/>

// ✅ Memo hóa item component
const VocabItem = memo(({ item }: { item: Vocab }) => {
  // chỉ re-render khi item thay đổi
  return <View>...</View>;
});

// ✅ useCallback cho handlers
const handlePress = useCallback((id: number) => {
  router.push(`/vocab/${id}`);
}, []);
```

---

### Q: Memory leak phổ biến nhất trong React Native?

```typescript
// ❌ Leak 1: EventEmitter không remove
useEffect(() => {
  const sub = DeviceEventEmitter.addListener('event', handler);
  // thiếu cleanup!
}, []);

// ✅
useEffect(() => {
  const sub = DeviceEventEmitter.addListener('event', handler);
  return () => sub.remove();   // cleanup
}, []);

// ❌ Leak 2: setTimeout không clear
useEffect(() => {
  const id = setInterval(poll, 5000);
  // thiếu cleanup!
}, []);

// ✅
useEffect(() => {
  const id = setInterval(poll, 5000);
  return () => clearInterval(id);
}, []);

// ❌ Leak 3: setState sau unmount
useEffect(() => {
  let mounted = true;
  fetchData().then((data) => {
    if (mounted) setState(data);    // check trước khi set
  });
  return () => { mounted = false; };
}, []);

// ❌ Leak 4: AnimationController không dispose (Flutter, nhưng RN cần Animated cleanup)
// Animated.loop() → gọi animation.stop() khi unmount
```

---

### Q: Tại sao dùng Hermes JS engine?

**A:** Hermes là JS engine của Meta tối ưu cho React Native:
- Compile JS → bytecode lúc build, không phải lúc runtime → **TTI (Time to Interactive) nhanh hơn 30-50%**
- Memory footprint nhỏ hơn V8/JSC
- Bật trong `android/app/build.gradle`: `hermesEnabled = true`
- iOS: bật trong Podfile kể từ RN 0.70+

---

## 9. Sample CLI App Structure

### Tạo React Native CLI app chuẩn senior

```bash
# Khởi tạo
npx react-native@latest init NihongoMobileV2 --template react-native-template-typescript

# Cài dependencies
cd NihongoMobileV2
npm install \
  @tanstack/react-query \
  axios \
  zustand \
  @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  react-native-mmkv \
  @op-engineering/op-sqlite \
  @shopify/flash-list \
  react-native-reanimated \
  react-native-gesture-handler \
  mqtt

# iOS
cd ios && pod install
```

> `react-native-sqlite-storage` đã ngừng bảo trì: còn gọi `jcenter()` (bị gỡ khỏi Gradle 9) nên app Android không build được, và `executeSql` chỉ chạy câu lệnh ĐẦU TIÊN của chuỗi nhiều câu. `@react-navigation/native-stack` dùng màn hình native (UINavigationController / Fragment); `createNativeStackNavigator` nằm ở gói này, không phải `@react-navigation/stack`. App mẫu: `apps/nihongo-cli/src/db/`.

**Folder structure chuẩn:**

```
src/
├── api/
│   ├── client.ts          ← Axios instance + interceptors
│   ├── vocab.ts           ← vocab endpoints
│   ├── auth.ts            ← auth endpoints
│   └── graphql/
│       ├── client.ts      ← GraphQL client
│       └── queries.ts     ← GQL queries/mutations
│
├── components/
│   ├── common/            ← Button, Input, Card, LoadingSpinner
│   └── vocab/             ← VocabCard, VocabList
│
├── db/
│   ├── schema.ts          ← SQLite table definitions
│   ├── vocabRepo.ts       ← vocab CRUD local
│   └── syncService.ts     ← sync local ↔ server
│
├── hooks/
│   ├── useAuth.ts
│   ├── useVocab.ts        ← TanStack Query wrappers
│   └── useOnline.ts
│
├── navigation/
│   ├── RootNavigator.tsx  ← auth check → Main or Auth stack
│   ├── MainTabs.tsx       ← bottom tabs
│   └── AuthStack.tsx
│
├── screens/
│   ├── HomeScreen.tsx
│   ├── VocabScreen.tsx
│   ├── SrsScreen.tsx
│   └── ProfileScreen.tsx
│
├── services/
│   ├── mqttService.ts     ← MQTT singleton
│   └── pushService.ts     ← FCM
│
├── store/
│   └── authStore.ts       ← Zustand (global auth state)
│
└── utils/
    ├── srs.ts             ← SM-2 algorithm
    └── storage.ts         ← MMKV wrapper
```

**Axios client chuẩn với auto-refresh:**

```typescript
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({ baseURL: 'http://10.0.2.2:3000/api', timeout: 10000 });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status !== 401 || err.config._retry) return Promise.reject(err);
    err.config._retry = true;
    if (!refreshing) {
      refreshing = useAuthStore.getState().refresh().finally(() => { refreshing = null; });
    }
    await refreshing;
    return api(err.config);
  }
);
```

**TanStack Query setup:**

```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 phút
      retry: 2,
      networkMode: 'offlineFirst', // dùng cache khi offline
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}
```

**Zustand auth store:**

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { api } from '../api/client';

const storage = new MMKV();

type AuthState = {
  token: string | null;
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: async (email, pass) => {
        const { data } = await api.post('/auth/login', { email, password: pass });
        set({ token: data.token, user: data.user });
      },
      refresh: async () => {
        const { data } = await api.post('/auth/refresh');
        set({ token: data.token });
      },
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => ({
        getItem: (k) => storage.getString(k) ?? null,
        setItem: (k, v) => storage.set(k, v),
        removeItem: (k) => storage.delete(k),
      })),
    }
  )
);
```

---

---

## 10. TanStack Query có thay thế hoàn toàn Redux không?

### Q: TanStack Query có replace Redux được không?

**Không hoàn toàn** — vì chúng giải quyết 2 vấn đề khác nhau:

- **TanStack Query** → **Server state**: fetch, cache, sync data từ API
- **Redux** → **Client state**: UI state, global state không liên quan server

### Phân loại state:

| State | Ví dụ | Dùng gì |
|-------|-------|---------|
| Server state | Vocab list, SRS queue, user profile | **TanStack Query** |
| Auth state | accessToken, user info | **Zustand / Redux** |
| UI state | theme, modal open, filter selected | **Zustand / Redux** |
| Form state | input values, validation | **React local state** |
| Complex async | login → fetch → setup socket → subscribe | **Redux Saga** |

### 3 combo phổ biến hiện nay:

**Combo 1 — Hiện đại, không cần Redux (90% app):**
```
TanStack Query  → server state
Zustand         → client/UI state
```

**Combo 2 — Có workflow phức tạp:**
```
TanStack Query  → server state
Redux Toolkit   → client state
Redux Saga      → complex async (login flow, socket, retry, race)
```

**Combo 3 — Legacy / team quen Redux:**
```
Redux Thunk/Saga → tất cả (tự viết loading/error/cache)
```

### Điểm TanStack làm được mà Redux phải tự viết:

```typescript
// TanStack — 5 dòng, tự động cache + retry + refetch
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['vocab'],
  queryFn: fetchVocab,
  staleTime: 5 * 60 * 1000,    // cache 5 phút
  refetchOnWindowFocus: true,   // refetch khi quay lại app
  retry: 2,                     // tự retry khi lỗi
});

// Redux — ~50 dòng: action + reducer + thunk + selector
// FETCH_START → FETCH_SUCCESS → FETCH_ERROR
// loading state, error state, data state — tất cả tự viết tay
```

### Trả lời phỏng vấn:

> "TanStack Query thay thế phần **server state** mà trước đây dùng Redux Thunk/Saga để fetch. Nhưng Redux vẫn cần cho **client state phức tạp**: auth session, multi-step workflow, side effects có cancel/race condition. Trong project hiện tại tôi dùng **TanStack Query + Zustand** — không cần Redux vì không có workflow đủ phức tạp để cần Saga."

---

## 11. OTA Update — EAS vs CodePush

### Q: OTA Update là gì? Khi nào dùng?

**OTA (Over-The-Air)** = cập nhật app không qua App Store/Play Store — user mở app là tự nhận code mới.

```
Developer push code → OTA server → User mở app → download JS bundle mới → restart
```

**Giới hạn quan trọng:** OTA chỉ update được **JavaScript bundle** (UI, logic, màn hình).
Không thể OTA khi thêm native module mới (Kotlin/Swift/C++) → bắt buộc submit store.

| | EAS Update (Expo) | CodePush (Microsoft) |
|--|---|---|
| Dùng cho | Expo Managed + Bare | React Native CLI |
| Setup | Built-in Expo | Cần cài SDK + link native |
| Rollout % | ✅ | ✅ |
| Rollback | ✅ | ✅ |
| Chi phí | Free (giới hạn) / trả phí | Free |
| Bảo trì | Expo duy trì | Microsoft (đang giảm support) |

```bash
# EAS Update
eas update --branch production --message "Fix SRS bug"

# CodePush
appcenter codepush release-react -a MyOrg/NihongoApp -d Production
```

**Rule:** Fix JS bug nhanh → OTA. Thêm native SDK mới → submit store.

---

### Q: EAS Build khác gì build local?

**EAS Build** — build APK/IPA trên cloud Expo, **không cần máy Mac**:

```bash
eas build --platform ios      # cloud Mac của Expo build IPA
eas build --platform android  # cloud Linux build APK/AAB
```

**React Native CLI build local:**
- Android → cần Java + Android Studio (Windows OK)
- iOS → **bắt buộc máy Mac** vì Xcode chỉ chạy macOS, Apple code signing qua Keychain

| | EAS Build | Local build |
|--|---|---|
| iOS trên Windows | ✅ | ❌ |
| Tốc độ | Chậm hơn (queue) | Nhanh |
| Chi phí | ~$99/tháng Pro | Miễn phí |
| CI/CD | ✅ tích hợp GitHub Actions | Tự setup |
| Debug native crash | Khó hơn | Dễ |

---

## 11. Sensor trên React Native

### Q: Sensor là gì? Các loại sensor thường gặp?

Sensor = cảm biến vật lý trên điện thoại, đọc dữ liệu từ phần cứng:

| Sensor | Đọc gì | Use case |
|--------|--------|---------|
| **Accelerometer** | Gia tốc 3 trục (x,y,z) m/s² | Detect lắc, step counter |
| **Gyroscope** | Vận tốc xoay (rad/s) | Game, AR, camera stabilization |
| **Gravity** | Vector trọng lực | Bubble level, độ nghiêng |
| **Magnetometer** | Từ trường (μT) | La bàn |
| **Barometer** | Áp suất không khí | Độ cao, thời tiết |
| **Proximity** | Vật gần màn hình | Tắt màn khi nghe điện |
| **Ambient Light** | Độ sáng môi trường | Auto brightness |
| **GPS** | Vị trí lat/lng | Map, tracking |

### Q: Implement sensor trong React Native CLI?

```typescript
import {accelerometer, SensorTypes, setUpdateIntervalForType} from 'react-native-sensors';

// Đọc gravity sensor để tính độ nghiêng (Putt Eye green-reading)
setUpdateIntervalForType(SensorTypes.accelerometer, 100); // 10 lần/giây

useEffect(() => {
  const sub = accelerometer.subscribe(({x, y, z}) => {
    // thiết bị nằm phẳng → x≈0, y≈0, z≈9.8
    // nghiêng → x, y thay đổi
    const slopeDegrees = Math.atan2(x, z) * (180 / Math.PI);
    setSlope(slopeDegrees);
  });
  return () => sub.unsubscribe();   // cleanup tránh memory leak
}, []);
```

### Q: BLE có phải sensor không?

**BLE (Bluetooth Low Energy)** không phải sensor vật lý nhưng cùng pattern đọc dữ liệu thiết bị ngoài:

```typescript
// ICUCO: đọc tag BLE đeo trên trẻ em → tính khoảng cách qua RSSI
import BleManager from 'react-native-ble-manager';

BleManager.scan([], 5, true).then(() => {
  // scan 5 giây
});

NativeEventEmitter.addListener('BleManagerDiscoverPeripheral', (device) => {
  const distance = rssiToDistance(device.rssi);  // RSSI → meters
  if (device.id === childTagMac) {
    onChildDetected(device.id, distance);
  }
});

function rssiToDistance(rssi: number): number {
  // Path loss model
  const txPower = -59; // dBm ở 1 mét
  return Math.pow(10, (txPower - rssi) / (10 * 2));
}
```

**Sensor + BLE chỉ dùng được với React Native CLI** — Expo Managed không hỗ trợ native BLE.

---

---

## 13. Khi nào nâng version React Native / thư viện?

### Q: Khi nào bắt buộc phải nâng?

**Apple/Google yêu cầu target SDK mới:**
```
Google Play yêu cầu targetSdk >= 34 (2024)
App Store yêu cầu Xcode 16 + iOS 18 SDK (2025)
→ không nâng → app bị reject khi submit mới
```

**Security vulnerability nghiêm trọng:**
```bash
npm audit  # thấy "critical" → nâng ngay
```

**Thư viện dependency bị drop support:**
```
React Native 0.73 drop support Flipper → build lỗi → phải nâng
```

---

### Q: Khi nào nên nâng (có lợi rõ ràng)?

| Tình huống | Lý do |
|---|---|
| New Architecture (RN 0.76+) | Bridgeless mode, nhanh hơn 30-40% |
| Hermes engine update | Startup time giảm |
| Bug fix ảnh hưởng production | Crash trên iOS 17, Android 14 |
| Major version thư viện core | React Navigation, TanStack — API mới, perf tốt hơn |

---

### Q: Khi nào KHÔNG nên nâng vội?

- Thư viện native quan trọng chưa support version mới (check GitHub issues)
- Đang gần deadline release
- Major version vừa ra < 1 tháng (còn nhiều bug)
- App đang ổn định, không có issue

---

### Quy trình nâng an toàn:

```bash
# 1. Đọc breaking changes trước
# https://react-native.dev/docs/upgrading

# 2. Dùng upgrade helper
npx react-native upgrade

# 3. Kiểm tra thư viện native có support version mới chưa
npx react-native info

# 4. Nâng trên branch riêng, không nâng thẳng main
# 5. Test kỹ cả Android + iOS trước khi release
```

### Rule đơn giản:

| Loại | Hành động |
|------|----------|
| **Patch** (0.74.1 → 0.74.3) | Nâng ngay |
| **Minor** (0.74 → 0.75) | Nâng khi rảnh, test cơ bản |
| **Major** (0.74 → 0.76) | Nâng khi có lý do rõ ràng + test kỹ + branch riêng |

---

---

## 14. Quy trình update targetSdk Android trong React Native CLI

### Bước 1 — Sửa `android/build.gradle` (project level)

```gradle
buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35     // nâng lên
        targetSdkVersion = 35      // Google Play yêu cầu
        ndkVersion = "26.1.10909125"
    }
}
```

### Bước 2 — Sửa `android/app/build.gradle` (app level)

```gradle
android {
    compileSdk rootProject.ext.compileSdkVersion

    defaultConfig {
        minSdk rootProject.ext.minSdkVersion
        targetSdk rootProject.ext.targetSdkVersion
    }
}
```

### Bước 3 — Sync + build thử

```bash
cd android
./gradlew clean
./gradlew assembleDebug     # test debug trước
./gradlew bundleRelease     # AAB cho Play Store nếu pass
```

### Bước 4 — Xử lý breaking changes thường gặp

**targetSdk 33+ — Runtime permission Notification:**
```typescript
import {PermissionsAndroid, Platform} from 'react-native';

if (Platform.OS === 'android' && Platform.Version >= 33) {
  await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
}
```

**targetSdk 34+ — Foreground service phải khai báo type:**
```xml
<!-- AndroidManifest.xml -->
<service
  android:name=".MyService"
  android:foregroundServiceType="location|dataSync" />
```

**targetSdk 35 — Edge-to-edge bắt buộc:**
```kotlin
// MainActivity.kt
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
}
```
```typescript
// React Native — dùng safe area insets cho layout
import {useSafeAreaInsets} from 'react-native-safe-area-context';
const insets = useSafeAreaInsets();
// padding top = insets.top, bottom = insets.bottom
```

### Bước 5 — Kiểm tra thư viện native

```bash
# Xem lib nào dùng compileSdk cũ
cd android && ./gradlew dependencies | grep "compileSdk"

# Check từng lib quan trọng trên GitHub:
# react-native-ble-manager, react-native-sqlite-storage, v.v.
```

### Checklist đầy đủ:

```
☐ Sửa compileSdkVersion + targetSdkVersion trong build.gradle
☐ ./gradlew clean && assembleDebug — build pass chưa
☐ Kiểm tra runtime permission mới (notification, bluetooth, storage)
☐ Kiểm tra foreground service type nếu có background task
☐ Test edge-to-edge layout (targetSdk 35)
☐ Test trên thiết bị Android version cao nhất có thể
☐ ./gradlew bundleRelease → upload Play Console internal track test trước
```

---

---

## 15. CI/CD — GitHub Actions + Fastlane

### Q: CI/CD cho React Native CLI thường dùng gì?

**Stack phổ biến nhất:** GitHub Actions (pipeline) + Fastlane (build/sign/upload)

| | GitHub Actions + Fastlane | EAS Build | Bitrise |
|--|---|---|---|
| iOS build | ✅ macos runner | ✅ cloud Mac | ✅ |
| Chi phí | Free 2000 min/tháng | Free giới hạn / $99+ | $90+/tháng |
| Setup | Trung bình | Dễ | Dễ nhất |
| Flexible | Cao | Thấp (Expo only) | Trung bình |
| Phổ biến | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

### Android pipeline — `.github/workflows/android.yml`

```yaml
name: Android Build & Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test -- --passWithNoTests

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - uses: actions/setup-java@v4
        with: { java-version: '17', distribution: temurin }
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: '3.2', bundler-cache: true, working-directory: android }
      - name: Decode keystore
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 --decode > android/app/nihongo-release.keystore
      - name: Fastlane deploy
        working-directory: android
        run: bundle exec fastlane deploy
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
          SUPPLY_JSON_KEY_DATA: ${{ secrets.PLAY_STORE_JSON_KEY }}
```

### iOS pipeline — `.github/workflows/ios.yml`

```yaml
# iOS phải chạy trên macos-latest (bắt buộc có Xcode)
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: '3.2', bundler-cache: true, working-directory: ios }
      - run: cd ios && bundle exec pod install
      - name: Fastlane beta
        working-directory: ios
        run: bundle exec fastlane beta
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_CONTENT: ${{ secrets.ASC_KEY_CONTENT }}
```

### Android Fastfile — `android/fastlane/Fastfile`

```ruby
lane :deploy do
  gradle(
    task: "bundle",
    build_type: "Release",
    properties: {
      "android.injected.signing.store.file"     => ENV["KEYSTORE_PATH"],
      "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
      "android.injected.signing.key.alias"      => ENV["KEY_ALIAS"],
      "android.injected.signing.key.password"   => ENV["KEY_PASSWORD"],
    }
  )
  upload_to_play_store(
    track: "internal",    # internal → alpha → beta → production
    aab: "app/build/outputs/bundle/release/app-release.aab",
  )
end
```

### iOS Fastfile — `ios/fastlane/Fastfile`

```ruby
lane :beta do
  app_store_connect_api_key(
    key_id:        ENV["APP_STORE_CONNECT_API_KEY_ID"],
    issuer_id:     ENV["APP_STORE_CONNECT_API_ISSUER_ID"],
    key_content:   ENV["APP_STORE_CONNECT_API_KEY_CONTENT"],
    is_key_content_base64: true,
  )
  match(type: "appstore", readonly: is_ci)   # sync cert từ Git repo
  increment_build_number(build_number: ENV["GITHUB_RUN_NUMBER"])
  build_app(scheme: "NihongoCLI", export_method: "app-store")
  upload_to_testflight(skip_waiting_for_build_processing: true)
end
```

### Fastlane Match — quản lý certificate

```bash
# Lần đầu setup — tạo cert và lưu lên Git repo riêng
fastlane match init
fastlane match appstore   # tạo App Store cert + profile
fastlane match development

# CI chỉ đọc (readonly: true) — không tạo mới
```

**Match** lưu certificate trên private Git repo, encrypt bằng password → cả team dùng chung, không cần vào Apple Developer portal tay.

### GitHub Secrets cần setup:

```
Android:
  KEYSTORE_BASE64        ← base64 của file .keystore
  KEYSTORE_PASSWORD
  KEY_ALIAS
  KEY_PASSWORD
  PLAY_STORE_JSON_KEY    ← Service account JSON từ Google Play Console

iOS:
  MATCH_PASSWORD         ← password encrypt cert repo
  MATCH_GIT_URL          ← URL của private cert repo
  ASC_KEY_ID             ← App Store Connect API Key ID
  ASC_ISSUER_ID
  ASC_KEY_CONTENT        ← base64 của file .p8
```

### Flow tổng quan:

```
Push lên main
    ↓
GitHub Actions trigger
    ↓
Job test: npm ci → tsc → jest
    ↓ (pass)
Job build Android (ubuntu):
  Fastlane → gradle bundleRelease → sign → upload Play Store internal
Job build iOS (macos):
  Fastlane → match sync cert → pod install → build IPA → TestFlight
```

---

---

## 16. Setup Keystore + Play Store + App Store Connect + Fastlane Match

### Android — Keystore + Service Account JSON

**Bước 1: Tạo Keystore (1 lần duy nhất)**

```bash
keytool -genkey -v \
  -keystore nihongo-release.keystore \
  -alias nihongo-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
# Điền: name, org, city, country → đặt password → giữ file .keystore cẩn thận
```

```bash
# Convert sang base64 để lưu GitHub Secret
# Mac:
base64 -i nihongo-release.keystore | pbcopy
# Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("nihongo-release.keystore")) | clip
```

→ Paste vào GitHub Secret `KEYSTORE_BASE64`

**Bước 2: Play Store Service Account JSON**

```
1. Google Play Console → Setup → API access
2. Link to a Google Cloud Project → chọn/tạo project
3. Google Cloud Console → IAM & Admin → Service Accounts → Create
   - Name: github-ci
4. Click vào service account → Keys → Add Key → JSON → Download
5. Play Console → Grant access → thêm email service account
   → Role: Release Manager
6. Paste nội dung file .json → GitHub Secret: PLAY_STORE_JSON_KEY
```

**Bước 3: GitHub Secrets Android**

```
KEYSTORE_BASE64      ← base64 keystore
KEYSTORE_PASSWORD    ← password keystore
KEY_ALIAS            ← nihongo-key
KEY_PASSWORD         ← password key
PLAY_STORE_JSON_KEY  ← nội dung file .json
```

---

### iOS — App Store Connect API Key + Fastlane Match

**Bước 1: Tạo App Store Connect API Key**

```
1. appstoreconnect.apple.com → Users and Access → Integrations → App Store Connect API
2. Click "+" → Name: GitHub CI → Role: Developer
3. Download file .p8 (chỉ download được 1 lần!)
4. Ghi lại Key ID và Issuer ID
```

```bash
# Convert .p8 sang base64
# Mac:
base64 -i AuthKey_XXXXXXXX.p8 | pbcopy
# Windows:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_XXXXXXXX.p8")) | clip
```

**Bước 2: Setup Fastlane Match (1 lần duy nhất)**

```bash
# 1. Tạo private Git repo: github.com/letiendungdn/nihongo-certs (private)

# 2. Init match
cd ios
bundle exec fastlane match init
# Chọn: git
# Git URL: https://github.com/letiendungdn/nihongo-certs.git
# Đặt password encrypt → lưu lại

# 3. Tạo cert + provisioning profile
bundle exec fastlane match development
bundle exec fastlane match appstore
# CI sau đó dùng readonly: true → chỉ pull, không tạo mới
```

**Bước 3: Lấy Team ID**

```
developer.apple.com → Account → Membership → Team ID (10 ký tự)
Điền vào ios/fastlane/Appfile:
  team_id("ABC1234567")
  itc_team_id("ABC1234567")
```

**Bước 4: GitHub Secrets iOS**

```
ASC_KEY_ID       ← Key ID từ App Store Connect
ASC_ISSUER_ID    ← Issuer ID từ App Store Connect
ASC_KEY_CONTENT  ← base64 của file .p8
MATCH_PASSWORD   ← password đặt khi match init
MATCH_GIT_URL    ← https://github.com/letiendungdn/nihongo-certs.git
```

---

### Tổng kết tất cả secrets cần có:

```
─── Android ─────────────────────────────────
KEYSTORE_BASE64
KEYSTORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
PLAY_STORE_JSON_KEY

─── iOS ─────────────────────────────────────
ASC_KEY_ID
ASC_ISSUER_ID
ASC_KEY_CONTENT
MATCH_PASSWORD
MATCH_GIT_URL
```

---

---

## 17. Lộ trình học AWS cho Mobile Developer

> Mục tiêu: Hiểu đủ AWS để tự deploy backend + infra cho mobile app, không cần DevOps riêng.

### Giai đoạn 1 — Nền tảng (2-3 tuần)

**IAM — Identity and Access Management**
```
- User, Group, Role, Policy
- Principle of least privilege
- Access Key vs Role (EC2/Lambda dùng Role, không dùng Access Key)
- MFA cho root account
```

**S3 — Simple Storage Service**
```
- Bucket, Object, Key
- Presigned URL → upload file từ mobile trực tiếp (không qua server)
- Bucket policy vs ACL
- Lifecycle rule → tự xóa file cũ
- CloudFront + S3 → CDN cho static assets
```

```typescript
// Mobile upload ảnh qua Presigned URL — không expose AWS key trên app
const { url } = await api.post('/upload/presign', { filename, contentType });
await fetch(url, { method: 'PUT', body: fileBlob });
// File lên thẳng S3, server không cần handle file
```

**EC2 — Virtual Machine**
```
- Instance type (t3.micro free tier)
- Security Group = firewall (inbound/outbound rules)
- Key pair SSH
- Elastic IP → IP tĩnh cho server
- User data script → tự động setup khi boot
```

---

### Giai đoạn 2 — Deploy backend (2-3 tuần)

**RDS — Managed Database**
```
- PostgreSQL / MySQL trên cloud, AWS lo backup/patch
- Multi-AZ → high availability
- Read replica → scale đọc
- Parameter group, subnet group
- Không expose ra internet → chỉ EC2/Lambda trong cùng VPC mới kết nối được
```

**VPC — Virtual Private Cloud**
```
- VPC = mạng riêng ảo
- Public subnet → EC2 có internet (web server, bastion)
- Private subnet → RDS, Redis, internal service (không ra internet)
- Internet Gateway → cho phép public subnet ra internet
- NAT Gateway → cho private subnet ra internet (download package)
- Security Group vs NACL
```

```
Kiến trúc chuẩn cho mobile backend:

Internet
    ↓
ALB (Application Load Balancer) — public subnet
    ↓
EC2 / ECS (NestJS app) — private subnet
    ↓
RDS PostgreSQL — private subnet
    ↓
ElastiCache Redis — private subnet
```

**ECS — Elastic Container Service**
```
- Chạy Docker container trên AWS (thay EC2 thủ công)
- Task Definition = docker-compose.yml
- Service = số lượng container chạy, auto restart nếu crash
- Fargate = serverless ECS (không cần manage EC2)
- ECR = Docker registry của AWS (lưu image)
```

```bash
# CI/CD deploy lên ECS
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URL
docker build -t nihongo-api .
docker tag nihongo-api:latest $ECR_URL/nihongo-api:latest
docker push $ECR_URL/nihongo-api:latest
aws ecs update-service --cluster nihongo --service api --force-new-deployment
```

---

### Giai đoạn 3 — Serverless + Push (1-2 tuần)

**Lambda — Serverless Function**
```
- Chạy code không cần server, tính tiền theo lần gọi
- Dùng cho: webhook handler, image resize, scheduled job, background task
- Timeout tối đa 15 phút
- Cold start ~100-500ms (Node.js ít hơn Java)
- Kết hợp API Gateway → REST API serverless
```

**SNS + SQS — Messaging**
```
SNS (Simple Notification Service):
- Pub/Sub: 1 event → fan-out nhiều subscriber
- Push notification qua FCM/APNs (mobile push)
- Kết hợp SQS để đảm bảo không mất message

SQS (Simple Queue Service):
- Queue message giữa services
- Dead Letter Queue → message lỗi nhiều lần → chuyển sang DLQ
- Visibility timeout → tránh 2 consumer xử lý cùng 1 message
```

**CloudWatch — Monitoring + Logs**
```
- Log group → tập hợp log từ Lambda, ECS, EC2
- Metric → CPU, memory, request count
- Alarm → gửi email/SNS khi metric vượt ngưỡng
- Dashboard → visualize metrics
```

---

### Giai đoạn 4 — Mobile-specific AWS (1 tuần)

**Amplify — Backend as a Service cho Mobile**
```
- Auth (Cognito), Storage (S3), API (AppSync GraphQL / REST)
- Amplify CLI → tự generate code TypeScript
- Amplify Hosting → deploy web app
- Dùng khi: muốn backend nhanh, không tự manage infra
- Không dùng khi: cần custom logic phức tạp, đã có NestJS backend
```

**CloudFront — CDN**
```
- Cache static assets (JS bundle, images, fonts) ở edge location gần user
- → App load nhanh hơn dù server đặt ở Singapore
- Kết hợp S3 → serve images/videos cho mobile
- Presigned URL qua CloudFront → secure hơn S3 direct
```

**Cognito — Auth Service**
```
- User Pool: đăng ký/đăng nhập, JWT token
- Identity Pool: cấp AWS credential tạm thời cho mobile app
- Social login: Google, Apple, Facebook
- Dùng khi không muốn tự viết auth server
```

---

### Services hay dùng nhất cho Mobile Backend:

| Service | Dùng cho | Priority |
|---------|---------|---------|
| **S3** | Upload file, media, OTA bundle | ⭐⭐⭐⭐⭐ |
| **CloudFront** | CDN images/assets | ⭐⭐⭐⭐⭐ |
| **EC2 / ECS** | Chạy NestJS backend | ⭐⭐⭐⭐⭐ |
| **RDS** | PostgreSQL managed | ⭐⭐⭐⭐⭐ |
| **IAM** | Permission, security | ⭐⭐⭐⭐⭐ |
| **VPC** | Network isolation | ⭐⭐⭐⭐ |
| **Lambda** | Webhook, background job | ⭐⭐⭐⭐ |
| **SQS/SNS** | Queue, push notification | ⭐⭐⭐⭐ |
| **CloudWatch** | Log, monitor, alert | ⭐⭐⭐⭐ |
| **ElastiCache** | Redis cache | ⭐⭐⭐⭐ |
| **Cognito** | Auth nhanh | ⭐⭐⭐ |
| **Amplify** | Full BaaS | ⭐⭐⭐ |

---

### Lộ trình học theo thứ tự:

```
Tuần 1-2:  IAM + S3 + CloudFront
           → Tạo bucket, upload file, Presigned URL, CDN

Tuần 3-4:  VPC + EC2 + RDS
           → Deploy NestJS lên EC2, kết nối PostgreSQL trong private subnet

Tuần 5-6:  ECS + ECR + ALB
           → Containerize app, deploy Docker, load balancer

Tuần 7:    Lambda + SQS + CloudWatch
           → Background job, queue, monitor logs

Tuần 8:    Amplify + Cognito (optional)
           → Nếu muốn BaaS nhanh hơn
```

### Tài nguyên học:

```
- AWS Free Tier: 12 tháng miễn phí EC2 t2.micro, S3 5GB, RDS 750h
- Chứng chỉ: AWS Cloud Practitioner → Solutions Architect Associate
- Thực hành: tự deploy EDU App backend lên AWS thay vì localhost
```

---

## 18. OAuth 2.0 / OIDC trên React Native

### Q: Implement Google Sign-In và Keycloak OIDC trên React Native như thế nào?

---

### 18.1 So sánh các phương pháp auth trên mobile

| Phương pháp | Library | Ưu điểm | Nhược điểm |
|------------|---------|---------|------------|
| Email/Password | Axios | Đơn giản | Tự quản lý credential |
| Google Sign-In | `@react-native-google-signin/google-signin` | Native UX, Google xác thực | Cần Google Cloud setup |
| Apple Sign-In | `@invertase/react-native-apple-authentication` | Bắt buộc iOS nếu có social login | iOS-only |
| Keycloak OIDC | `react-native-app-auth` | Tập trung auth, PKCE, SSO | Cần Keycloak server |
| Generic OAuth2 | `react-native-app-auth` | Hỗ trợ mọi OIDC provider | Cần config thủ công |

**Rule:** App production hiện đại cần ít nhất **1 social login** + **PKCE cho OIDC flows**.

---

### 18.2 Google Sign-In — Flow

```
App → GoogleSignin.signIn() → Google Account Picker
  → User chọn tài khoản → App nhận idToken (JWT do Google ký)
  → App gửi idToken lên backend
  → Backend verify với Google Public Keys (JWKS)
  → Backend tạo user nếu chưa có → trả app's JWT
```

**Code hook:**
```typescript
// src/hooks/useOAuth.ts
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  offlineAccess: true,   // lấy server_auth_code nếu cần
});

export function useGoogleSignIn() {
  const loginWithOAuth = useAuthStore(s => s.loginWithOAuth);

  const signIn = async () => {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();

    // Gửi idToken lên backend → backend verify + trả JWT của app
    const data = await authApi.loginWithGoogle(idToken!);
    loginWithOAuth(data);
  };
}
```

**Backend verify (NestJS / Express):**
```typescript
const ticket = await googleClient.verifyIdToken({
  idToken,
  audience: GOOGLE_CLIENT_ID,
});
const { email, name, sub: googleId } = ticket.getPayload()!;
// upsert user → issue JWT
```

---

### 18.3 Keycloak OIDC với PKCE — Flow

```
App sinh code_verifier (random 64 bytes)
  → tính code_challenge = BASE64URL(SHA256(code_verifier))
  → Mở browser: Keycloak /auth?code_challenge=...&code_challenge_method=S256
  → User đăng nhập Keycloak → redirect về app với ?code=XXXX
  → App gửi code + code_verifier tới Keycloak /token
  → Keycloak verify SHA256(code_verifier) == code_challenge → cấp token
  → App gửi Keycloak access_token lên backend → exchange lấy app JWT
```

**Tại sao cần PKCE?** Không có PKCE: authorization_code bị chặn giữa chừng (malicious app có cùng URL scheme) → code interception attack. PKCE: ngay cả khi code bị chặn, kẻ tấn công không có `code_verifier` → không đổi được token.

```typescript
import { authorize } from 'react-native-app-auth';

const keycloakConfig = {
  issuer: 'https://auth.example.com/realms/my-realm',
  clientId: 'nihongo-mobile',    // Public client — không có secret
  redirectUrl: 'com.nihongocli://oauth/callback',
  scopes: ['openid', 'profile', 'email'],
  serviceConfiguration: {
    authorizationEndpoint: '...../auth',
    tokenEndpoint: '...../token',
  },
};

export function useKeycloakOidc() {
  const signIn = async () => {
    // react-native-app-auth tự sinh code_verifier + code_challenge
    const result = await authorize(keycloakConfig);

    // Gửi lên backend để exchange lấy app JWT
    const data = await authApi.loginWithKeycloak(
      result.authorizationCode!,
      result.codeVerifier!,
      'com.nihongocli://oauth/callback',
    );
    loginWithOAuth(data);
  };
}
```

---

### 18.4 Setup Keycloak Public Client

Trong Keycloak Admin → Clients → Create:
- **Client type:** Public (không có client_secret — mobile không giữ secret an toàn được)
- **Standard flow:** ON (Authorization Code)
- **Direct access grants:** OFF (password grant — không dùng trên mobile)
- **Valid redirect URIs:** `com.nihongocli://oauth/callback`
- **PKCE:** Bắt buộc bằng Authentication Flow settings

---

### 18.5 Android Setup

`android/app/build.gradle`:
```gradle
manifestPlaceholders = [appAuthRedirectScheme: "com.nihongocli"]
```

`google-services.json` → `android/app/` (từ Firebase / Google Cloud Console).

---

### 18.6 iOS Setup

`Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>com.nihongocli</string></array>
  </dict>
</array>
```

`AppDelegate.mm`:
```objc
#import <RNGoogleSignin/RNGoogleSignin.h>
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary *)options {
  return [RNGoogleSignin application:app openURL:url options:options];
}
```

---

### 18.7 Token Storage — MMKV vs AsyncStorage

| | AsyncStorage | MMKV |
|--|--|--|
| Encryption | ❌ Plain text | ✅ AES-128 (Keychain/Keystore) |
| Performance | Async JS bridge | Sync native |
| OWASP M1 | ❌ Fail | ✅ Pass |
| Dùng cho token | ❌ Không bao giờ | ✅ Luôn dùng |

```typescript
// Đúng — MMKV encrypt native
const storage = new MMKV({ id: 'auth-store' });
```

---

## 19. Expo — Kinh nghiệm thực tế

### Q: Bạn có kinh nghiệm với Expo không? So với CLI thì khác gì?

---

### 19.1 Ba workflow của Expo

```
Expo Managed      →  Expo Bare      →  React Native CLI
(full managed)       (eject ra)         (full control)
```

| | Managed | Bare | CLI |
|--|--|--|--|
| Native code | Ẩn | Mở | Mở |
| EAS Build | ✅ | ✅ | Dùng Fastlane |
| EAS Update (OTA) | ✅ | ✅ | CodePush |
| Custom native module | ❌ | ✅ | ✅ |
| BLE / USB | ❌ | ✅ | ✅ |
| Expo SDK | Đầy đủ | Một phần | Không |
| Setup time | Nhanh | Trung bình | Chậm |

---

### 19.2 Expo Router vs React Navigation

**React Navigation** (dùng trong nihongo-cli):
```typescript
const Stack = createNativeStackNavigator<RootStackParamList>();
// File-based: không — phải khai báo thủ công từng screen
```

**Expo Router** (file-based routing như Next.js):
```
app/
  _layout.tsx       ← Root layout + Stack/Tab config
  index.tsx         ← Route "/"
  vocab/
    index.tsx       ← Route "/vocab"
    [id].tsx        ← Route "/vocab/123" (dynamic)
  (tabs)/
    _layout.tsx     ← Tab navigator
    home.tsx
    review.tsx
```

```typescript
// app/vocab/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function VocabDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>Vocab #{id}</Text>;
}
```

**Ưu điểm Expo Router:** Deep linking tự động, SEO (web), type-safe params, không cần khai báo screen thủ công.

---

### 19.3 EAS Build — Build cloud không cần Mac

```bash
# Cài
npm install -g eas-cli
eas login

# Config (tạo eas.json)
eas build:configure

# Build Android (không cần Android Studio local)
eas build --platform android --profile preview

# Build iOS (không cần Mac — EAS dùng Mac server của Expo)
eas build --platform ios --profile production
```

`eas.json`:
```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "simulator": false },
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

### 19.4 EAS Update — OTA không qua store

```bash
# Push update JS bundle lên cloud (không cần release lên store)
eas update --branch production --message "fix vocab display bug"
```

**App tự nhận update:**
```typescript
import * as Updates from 'expo-updates';

async function checkUpdate() {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync(); // restart app với bundle mới
  }
}
```

**Giới hạn OTA:** Chỉ update JS bundle + assets. Không update native code (thêm thư viện native, config native) → vẫn cần release lên store.

---

### 19.5 Khi nào chọn Expo, khi nào chọn CLI?

**Expo Managed / Bare khi:**
- Team nhỏ, ship nhanh, không có native dev
- Cần OTA update thường xuyên (hotfix)
- App không cần BLE, USB, camera custom pipeline
- Muốn build iOS mà không có Mac (EAS Build)
- Internal tools, B2B apps

**React Native CLI khi:**
- Cần native module đặc biệt (BLE trong nihongo-cli ICUCO, USB, NFC)
- Cần background service thực sự (foreground service Android)
- Team có iOS/Android native developer
- App IoT, hardware integration
- Cần tối ưu build config chi tiết (custom Gradle tasks, CocoaPods)

**Trong project này:**
- `nihongo-cli` → **CLI** vì demo native integration (SQLite native, MMKV native, react-native-app-auth)
- Nếu rebuild cho production nhanh → **Expo Bare** + EAS: giữ nguyên code, thêm EAS tooling

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [notes-senior-study.md](./notes-senior-study.md) | Backend senior + Mobile Flutter 11 tuần |
| [mobile-tech-stacks.md](./mobile-tech-stacks.md) | Stack 4 mobile apps trong EDU App |
| [interview-questions.md](./interview-questions.md) | Câu hỏi phỏng vấn backend |
| [interview-devops.md](./interview-devops.md) | Câu hỏi DevOps / infra |
| [system-design.md](./system-design.md) | Kiến trúc EDU App |
| [security-owasp-mobile.md](./security-owasp-mobile.md) | OWASP Mobile Top 10 + thực tế trong app |
