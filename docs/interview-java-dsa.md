# Phỏng vấn Android: Java, OOP và thuật toán

> **Dùng khi nào:** song song với lộ trình Android, từ tuần đầu tiên. Bài test lập trình thường là **vòng lọc đầu tiên** ở các công ty lớn (ví dụ LG, Samsung, các công ty ô tô, điện tử), trước cả vòng hỏi Android.
> **Cách dùng:** mỗi câu, tự trả lời hoặc tự viết code trước, rồi mới mở đáp án. Mọi đoạn code Java trong bài đã chạy thật bằng JDK 21; output ghi bên dưới là output thật.
> **Đọc kèm:** [interview-android.md](./interview-android.md) (Android), [learn-android-framework.md](./learn-android-framework.md) (Binder, AOSP, Automotive).

## Mục lục 48 bài

| # | Bài | Dạng |
|---|---|---|
| 1–10 | Two Sum, ngoặc hợp lệ, LRU cache, binary search, xáo trộn, top K, đếm đảo, rate limit, vòng trong danh sách liên kết, chuỗi con không lặp | Phần 2: gắn với app |
| 11 | Mua bán cổ phiếu một lần | Mảng và chuỗi |
| 12 | Tích các phần tử trừ chính nó | Mảng và chuỗi |
| 13 | Tổng đoạn con lớn nhất | Mảng và chuỗi |
| 14 | Dồn số 0 về cuối | Mảng và chuỗi |
| 15 | Hai chuỗi là anagram | Mảng và chuỗi |
| 16 | Nhóm các anagram | Mảng và chuỗi |
| 17 | Tiền tố chung dài nhất | Mảng và chuỗi |
| 18 | Two Sum trên mảng đã sắp xếp | Hai con trỏ và cửa sổ trượt |
| 19 | 3Sum | Hai con trỏ và cửa sổ trượt |
| 20 | Bể chứa nhiều nước nhất | Hai con trỏ và cửa sổ trượt |
| 21 | Đoạn con ngắn nhất có tổng ≥ target | Hai con trỏ và cửa sổ trượt |
| 22 | Bao nhiêu ngày nữa thì ấm hơn | Stack và queue |
| 23 | Stack có getMin() O(1) | Stack và queue |
| 24 | Hàng đợi bằng hai stack | Stack và queue |
| 25 | Tìm trong mảng sắp xếp đã bị xoay | Binary search |
| 26 | Căn bậc hai lấy phần nguyên | Binary search |
| 27 | Đảo ngược danh sách liên kết | Danh sách liên kết |
| 28 | Trộn hai danh sách đã sắp xếp | Danh sách liên kết |
| 29 | Xóa nút thứ n tính từ cuối | Danh sách liên kết |
| 30 | Độ sâu lớn nhất của cây | Cây |
| 31 | Duyệt theo từng tầng | Cây |
| 32 | Kiểm tra cây nhị phân tìm kiếm | Cây |
| 33 | Tổ tiên chung gần nhất trong BST | Cây |
| 34 | Thứ tự học các bài có điều kiện tiên quyết | Đồ thị |
| 35 | Đường ngắn nhất trong mê cung | Đồ thị |
| 36 | Gộp các khoảng giao nhau | Heap, khoảng và tham lam |
| 37 | Ít nhất bao nhiêu phòng cho các buổi học | Heap, khoảng và tham lam |
| 38 | Phần tử lớn thứ k | Heap, khoảng và tham lam |
| 39 | Leo cầu thang | Quy hoạch động |
| 40 | Đổi tiền ít đồng nhất | Quy hoạch động |
| 41 | Dãy con tăng dài nhất | Quy hoạch động |
| 42 | Khoảng cách chỉnh sửa | Quy hoạch động |
| 43 | Dãy con chung dài nhất | Quy hoạch động |
| 44 | Mọi tập con | Quay lui |
| 45 | Mọi hoán vị | Quay lui |
| 46 | Số chỉ xuất hiện một lần | Bit và cấu trúc đặc biệt |
| 47 | Đếm bit 1 | Bit và cấu trúc đặc biệt |
| 48 | Trie: gợi ý từ theo tiền tố | Bit và cấu trúc đặc biệt |

## Kế hoạch luyện tập

| Tuần | Việc | Mục tiêu đo được |
|---|---|---|
| 1–2 | Phần 1 (Java, OOP) + 10 bài ở phần 2, tự viết lại không nhìn đáp án | Viết lại được cả 10 bài trong 20 phút mỗi bài |
| 3–5 | 38 bài ở phần 3, theo thứ tự dạng: mảng/chuỗi → hai con trỏ → stack → binary search → danh sách liên kết → cây → đồ thị → heap/khoảng → quy hoạch động → quay lui → bit | Mỗi bài tự làm ra trong 30 phút; bài nào phải xem lời giải thì 3 ngày sau làm lại |
| 6–8 | Mỗi ngày 1–2 bài cùng dạng trên LeetCode hoặc Codeforces (tìm theo tên bài ở bảng mục lục) | Tổng cộng 80–100 bài dễ và trung bình |
| 9+ | Làm đề có giới hạn thời gian (90 phút, 2–3 bài), luyện nói to cách giải bằng tiếng Việt và tiếng Anh | Xong 2/3 bài đúng giờ |

Chạy thử code Java không cần IDE: lưu thành `Ten.java` rồi `java Ten.java` (JDK 11+ chạy thẳng một file nguồn). JDK đi kèm Android Studio dùng được: `"/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/java" Ten.java` (macOS).

Nguyên tắc khi làm bài test:

1. Đọc kỹ đề, viết ra 2–3 ví dụ nhỏ kể cả trường hợp biên (mảng rỗng, một phần tử, số âm, trùng).
2. Nói cách làm "thô" trước (thường O(n²)), rồi cải tiến. Nêu độ phức tạp thời gian và bộ nhớ.
3. Viết code, rồi tự chạy tay với một ví dụ.

---

## Phần 1. Java và OOP

### Ví dụ chạy được: những câu "đánh đố" hay gặp

```java
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class JavaQuirks {
    static class CardNoHash { final long id; CardNoHash(long id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof CardNoHash c && c.id == id; } }
    static class Card { final long id; Card(long id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof Card c && c.id == id; }
        @Override public int hashCode() { return Long.hashCode(id); } }
    record CardRecord(long id) {}

    static int counter = 0;
    static int finallyReturn() { try { return 1; } finally { System.out.println("   finally vẫn chạy trước khi trả về"); } }

    public static void main(String[] args) throws Exception {
        Set<CardNoHash> a = new HashSet<>(); a.add(new CardNoHash(1));
        Set<Card> b = new HashSet<>(); b.add(new Card(1));
        Set<CardRecord> r = new HashSet<>(); r.add(new CardRecord(1));
        System.out.println("A equals không hashCode: " + a.contains(new CardNoHash(1)));
        System.out.println("A equals + hashCode:     " + b.contains(new Card(1)));
        System.out.println("A record:                " + r.contains(new CardRecord(1)));

        Integer x = 127, y = 127, p = 128, q = 128;
        System.out.println("B 127==127: " + (x == y) + ", 128==128: " + (p == q) + ", equals: " + p.equals(q));

        String s1 = "kana", s2 = "kana", s3 = new String("kana");
        System.out.println("C literal==literal: " + (s1 == s2) + ", new String==literal: " + (s1 == s3) + ", equals: " + s1.equals(s3));

        final List<String> list = new ArrayList<>(); list.add("vẫn thêm được");
        System.out.println("D final list: " + list);

        System.out.println("E finally:"); System.out.println("   trả về " + finallyReturn());

        Runnable inc = () -> { for (int i = 0; i < 100_000; i++) counter++; };
        Thread t1 = new Thread(inc), t2 = new Thread(inc); t1.start(); t2.start(); t1.join(); t2.join();
        AtomicInteger atomic = new AtomicInteger();
        Runnable incA = () -> { for (int i = 0; i < 100_000; i++) atomic.incrementAndGet(); };
        Thread t3 = new Thread(incA), t4 = new Thread(incA); t3.start(); t4.start(); t3.join(); t4.join();
        System.out.println("F counter++ hai luồng: " + counter + " (mong đợi 200000), AtomicInteger: " + atomic.get());
    }
}
```

Output thật (chạy ba lần; dòng `F` mỗi lần một khác):

```text
A equals không hashCode: false
A equals + hashCode:     true
A record:                true
B 127==127: true, 128==128: false, equals: true
C literal==literal: true, new String==literal: false, equals: true
D final list: [vẫn thêm được]
E finally:
   finally vẫn chạy trước khi trả về
   trả về 1
F counter++ hai luồng: 124560 (mong đợi 200000), AtomicInteger: 200000
F counter++ hai luồng: 139528 (mong đợi 200000), AtomicInteger: 200000
F counter++ hai luồng: 143180 (mong đợi 200000), AtomicInteger: 200000
```

| Dòng | Giải thích |
|---|---|
| A | `HashSet`/`HashMap` tìm theo `hashCode` trước, rồi mới so `equals`. Override `equals` mà quên `hashCode` thì hai object "bằng nhau" nằm ở hai ngăn khác nhau, `contains` trả `false`. `record` (Java 16+) và `data class` (Kotlin) tự sinh cả hai |
| B | `Integer` từ -128 tới 127 được cache, nên `==` (so địa chỉ) tình cờ đúng; 128 thì không. **Luôn so số kiểu bọc bằng `equals`** |
| C | Chuỗi literal giống nhau dùng chung một object trong string pool; `new String` tạo object mới. So chuỗi bằng `equals` |
| D | `final` chỉ cấm **gán lại biến**, không làm object bất biến. Muốn bất biến: `List.of(...)`, `Collections.unmodifiableList` |
| E | `finally` luôn chạy, kể cả khi `try` đã `return` |
| F | `counter++` là ba bước đọc–cộng–ghi, không nguyên tử; hai luồng chen nhau làm mất lần cộng. Sửa bằng `AtomicInteger`, `synchronized`, hoặc chỉ một luồng ghi |

### Câu hỏi và đáp án

**1. Bốn tính chất của OOP? Cho ví dụ trong app.**

<details><summary>Đáp án</summary>

- **Đóng gói:** `VocabViewModel` giữ `MutableStateFlow` là `private`, chỉ lộ `StateFlow` chỉ đọc.
- **Kế thừa:** `DueCardsIpcService : Service()`, `LiveCallService` kế thừa `Service` của Android.
- **Đa hình:** `SyncScheduler` là interface; bản thật `WorkManagerSyncScheduler`, bản giả trong test. Code gọi `schedulePendingSync()` không cần biết là bản nào.
- **Trừu tượng:** `VocabularyRepository` (domain) chỉ nói "lấy từ vựng của bài", không nói lấy từ Room hay mạng.

</details>

**2. Interface khác abstract class thế nào? Khi nào dùng cái nào?**

<details><summary>Đáp án</summary>

Interface: chỉ là hợp đồng (từ Java 8 có `default` method), một class cài đặt được nhiều interface, không có state. Abstract class: có state và constructor, chỉ kế thừa được một. Dùng interface để mô tả "làm được gì" (`TokenStorage`, `NetworkStatus` trong app, để thay bằng bản giả khi test). Dùng abstract class khi nhiều class con dùng chung code và state (ví dụ `ViewModel` của Android).

</details>

**3. SOLID là gì? Nêu một nguyên tắc có trong app.**

<details><summary>Đáp án</summary>

S: một class một lý do để đổi. O: mở để mở rộng, đóng để sửa. L: class con thay được class cha. I: interface nhỏ, đúng nhu cầu. D: phụ thuộc vào trừu tượng, không vào cài đặt cụ thể.

Ví dụ D và I: `AuthInterceptor` nhận interface `TokenStorage` thay vì class `TokenStore` (cần `Context`), nên unit test chạy trên JVM được ([bài 1](./learn-android-kotlin.md) mục 19).

</details>

**4. `HashMap` hoạt động bên trong thế nào? Độ phức tạp?**

<details><summary>Đáp án</summary>

Mảng các "ngăn" (bucket). `hashCode()` của key chọn ngăn; trong ngăn, so `equals` để tìm đúng key. Trùng ngăn thì xếp thành danh sách liên kết; từ Java 8, ngăn quá 8 phần tử chuyển thành cây đỏ-đen. Vượt hệ số tải 0,75 thì mảng gấp đôi và chia lại (rehash). Trung bình O(1), xấu nhất O(log n) với cây. `HashMap` không an toàn đa luồng; dùng `ConcurrentHashMap`.

</details>

**5. `ArrayList` khác `LinkedList`?**

<details><summary>Đáp án</summary>

`ArrayList`: mảng động, truy cập theo chỉ số O(1), chèn/xóa ở giữa O(n). `LinkedList`: truy cập O(n), chèn/xóa ở hai đầu O(1). Thực tế gần như luôn dùng `ArrayList` (bộ nhớ liền nhau, nhanh với cache CPU); cần hàng đợi hai đầu thì dùng `ArrayDeque`.

</details>

**6. Vì sao `String` bất biến? `String` khác `StringBuilder`?**

<details><summary>Đáp án</summary>

Bất biến để dùng chung an toàn trong string pool, làm key `HashMap` (hash không đổi), và an toàn đa luồng. Mỗi lần nối `String` trong vòng lặp tạo object mới; nối nhiều lần thì dùng `StringBuilder`.

</details>

**7. Garbage collector làm gì? Rò rỉ bộ nhớ trong Java/Android vẫn xảy ra thế nào?**

<details><summary>Đáp án</summary>

GC thu hồi object không còn được tham chiếu từ "gốc" (luồng đang chạy, biến static…). Rò rỉ xảy ra khi còn tham chiếu không cần thiết: biến static giữ `Activity`, listener đăng ký mà không gỡ, inner class không static giữ class ngoài, coroutine sống lâu hơn màn hình. Ví dụ trong app: `callbackFlow` phải có `awaitClose` để gỡ callback ([bài 1](./learn-android-kotlin.md) mục 17); ViewModel không được giữ View hay `Context` của Activity (mục 24).

</details>

**8. `synchronized` và `volatile` khác nhau thế nào? Deadlock là gì?**

<details><summary>Đáp án</summary>

`volatile`: mọi luồng thấy giá trị mới nhất của biến, nhưng **không** làm `count++` thành nguyên tử (dòng F). `synchronized`: chỉ một luồng vào đoạn code tại một thời điểm, vừa nguyên tử vừa đảm bảo thấy giá trị mới. Deadlock: luồng A giữ khóa 1 chờ khóa 2, luồng B giữ khóa 2 chờ khóa 1. Tránh bằng cách luôn lấy khóa theo cùng một thứ tự. App dùng `Mutex` của coroutine cho hàng đợi sync ([bài 2](./learn-android-architecture.md) mục 30) và `AtomicBoolean` cho cờ xử lý ảnh của camera.

</details>

**9. Checked và unchecked exception?**

<details><summary>Đáp án</summary>

Checked (`IOException`): Java bắt phải khai báo hoặc bắt. Unchecked (`RuntimeException`, `NullPointerException`): không bắt buộc. Kotlin không có checked exception. Trong coroutine, không nuốt `CancellationException` ([bài 1](./learn-android-kotlin.md) mục 10).

</details>

**10. Kể 4 design pattern và chỗ chúng xuất hiện trong Android/app.**

<details><summary>Đáp án</summary>

- **Singleton:** `object SrsAlgorithm`, các `@Singleton` của Hilt.
- **Builder:** `OkHttpClient.Builder()`, `Room.databaseBuilder(...)`, `NotificationCompat.Builder`.
- **Observer:** `Flow`/`StateFlow`; giao diện "quan sát" state của ViewModel.
- **Adapter/Proxy:** Proxy của AIDL ([learn-android-framework.md](./learn-android-framework.md) mục 5); `AndroidView` bọc View cũ vào Compose.
- **Repository, Dependency Injection:** cả lớp data của app.

</details>

**11. Java khác Kotlin ở những điểm nào hay được hỏi?**

<details><summary>Đáp án</summary>

Kotlin có null safety trong kiểu (`String?`), `data class`, extension function, coroutine, `val`/`var`, không có checked exception, `when` mạnh hơn `switch`, hàm mặc định `final` (phải `open` mới kế thừa được). Gọi qua lại được với nhau vì cùng chạy trên JVM/ART.

</details>

---

## Phần 2. Mười bài thuật toán, gắn với app

Mỗi bài: đề, kỹ thuật, độ phức tạp, chỗ liên quan trong app, lời giải Java đã chạy thật. Hãy tự viết trước, rồi mới so.

### 1. Two Sum: tìm hai số có tổng bằng `target`

- **Kỹ thuật:** HashMap. **Độ phức tạp:** O(n) thời gian, O(n) bộ nhớ.
- **Liên hệ app:** Mẫu "đã thấy gì rồi" dùng khắp nơi: kiểm trùng, đếm. Chat của app gộp tin từ REST và SSE rồi loại trùng bằng `associateBy { it.id }` (hàm `mergeMessages` trong `presentation/community/CommunityViewModels.kt`, [bài 4](./learn-android-features.md) mục 3).
- **Kết quả chạy thật:** `[0, 1]` với `nums = [2, 7, 11, 15]`, `target = 9`.

```java
// 1. Two Sum — HashMap, O(n)
static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        Integer j = seen.get(target - nums[i]);
        if (j != null) return new int[]{j, i};
        seen.put(nums[i], i);
    }
    return new int[0];
}
```

### 2. Ngoặc hợp lệ

- **Kỹ thuật:** Stack (`ArrayDeque`). **Độ phức tạp:** O(n).
- **Liên hệ app:** Stack là nền của back stack điều hướng: `navController` đẩy/bật màn hình đúng kiểu này.
- **Kết quả chạy thật:** `{[()]}` → `true`, `([)]` → `false`.

```java
// 2. Ngoặc hợp lệ — Stack
static boolean validBrackets(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') stack.push(c);
        else {
            if (stack.isEmpty()) return false;
            char open = stack.pop();
            if ((c == ')' && open != '(') || (c == ']' && open != '[') || (c == '}' && open != '{')) return false;
        }
    }
    return stack.isEmpty();
}
```

### 3. LRU cache dung lượng k

- **Kỹ thuật:** `LinkedHashMap` với `accessOrder = true`. **Độ phức tạp:** O(1) mỗi thao tác.
- **Liên hệ app:** Đúng cách app cache bản dịch: `LinkedHashMap(accessOrder = true)` + `removeEldestEntry`, LRU 200 mục ([bài 2](./learn-android-architecture.md) mục 33). Phỏng vấn có thể yêu cầu tự viết bằng HashMap + danh sách liên kết đôi.
- **Kết quả chạy thật:** Dung lượng 2: thêm ねこ, いぬ, đọc ねこ, thêm とり → còn `[ねこ, とり]` (いぬ ít dùng nhất bị bỏ).

```java
// 3. LRU cache — LinkedHashMap accessOrder (giống cache dịch trong app)
static class LruCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;
    LruCache(int capacity) { super(16, 0.75f, true); this.capacity = capacity; }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) { return size() > capacity; }
}
```

### 4. Tìm vị trí đầu tiên lớn hơn x trong mảng đã sắp xếp

- **Kỹ thuật:** Binary search. **Độ phức tạp:** O(log n).
- **Liên hệ app:** Danh sách thẻ SRS sắp xếp theo `nextReviewAt`: "bao nhiêu thẻ đã đến hạn" chính là bài này. Chú ý `lo + (hi - lo) / 2` để không tràn số.
- **Kết quả chạy thật:** `[100, 200, 200, 300, 500]`, x = 200 → `3`.

```java
// 4. Tìm vị trí đầu tiên có giá trị > x trong mảng đã sắp xếp — binary search (upper bound)
static int firstGreater(long[] sorted, long x) {
    int lo = 0, hi = sorted.length;          // tìm trong [lo, hi)
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;        // không (lo+hi)/2: tránh tràn số
        if (sorted[mid] <= x) lo = mid + 1; else hi = mid;
    }
    return lo;                               // = số phần tử <= x
}
```

### 5. Xáo trộn đều (Fisher–Yates)

- **Kỹ thuật:** Đổi chỗ từ cuối về đầu. **Độ phức tạp:** O(n).
- **Liên hệ app:** exam-service dùng đúng thuật toán này (`shuffle` trong `packages/nest-common/src/utils/array.ts`) để xáo phương án trả lời của đề thi thử ([learn-js-ts.md](./learn-js-ts.md) mục 7.2). Lỗi hay gặp: `rnd.nextInt(n)` thay vì `nextInt(i + 1)` làm kết quả lệch.
- **Kết quả chạy thật:** `Random(42)` → `[2, 3, 4, 5, 1]`, vẫn đủ 5 phần tử.

```java
// 5. Fisher–Yates shuffle — O(n), mọi hoán vị đồng xác suất
static <T> void shuffle(List<T> list, Random rnd) {
    for (int i = list.size() - 1; i > 0; i--) {
        int j = rnd.nextInt(i + 1);
        Collections.swap(list, i, j);
    }
}
```

### 6. K từ xuất hiện nhiều nhất

- **Kỹ thuật:** HashMap đếm + min-heap kích thước K. **Độ phức tạp:** O(n log k).
- **Liên hệ app:** Ví dụ: K trợ từ học viên hay sai nhất từ lịch sử làm bài.
- **Kết quả chạy thật:** `[は,が,は,を,が,は,に]`, k = 2 → `[は, が]`.

```java
// 6. Top K phần tử xuất hiện nhiều nhất — HashMap + min-heap kích thước K, O(n log k)
static List<String> topK(String[] words, int k) {
    Map<String, Integer> count = new HashMap<>();
    for (String w : words) count.merge(w, 1, Integer::sum);
    PriorityQueue<Map.Entry<String, Integer>> heap = new PriorityQueue<>(
        (a, b) -> a.getValue().equals(b.getValue()) ? b.getKey().compareTo(a.getKey()) : a.getValue() - b.getValue());
    for (Map.Entry<String, Integer> e : count.entrySet()) {
        heap.offer(e);
        if (heap.size() > k) heap.poll();
    }
    List<String> result = new ArrayList<>();
    while (!heap.isEmpty()) result.add(heap.poll().getKey());
    Collections.reverse(result);
    return result;
}
```

### 7. Đếm số đảo trong lưới

- **Kỹ thuật:** BFS (hàng đợi). **Độ phức tạp:** O(rows × cols).
- **Liên hệ app:** BFS/DFS trên lưới hay ra trong bài test. Đánh dấu ô đã thăm ngay khi cho vào hàng đợi để không thăm hai lần.
- **Kết quả chạy thật:** Lưới 4×5 mẫu → `3` đảo.

```java
// 7. Số đảo trong lưới — BFS
static int countIslands(char[][] grid) {
    int rows = grid.length, cols = grid[0].length, islands = 0;
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
        if (grid[r][c] != '1') continue;
        islands++;
        Deque<int[]> queue = new ArrayDeque<>();
        queue.add(new int[]{r, c}); grid[r][c] = '0';
        while (!queue.isEmpty()) {
            int[] p = queue.poll();
            for (int[] d : dirs) {
                int nr = p[0] + d[0], nc = p[1] + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == '1') {
                    grid[nr][nc] = '0'; queue.add(new int[]{nr, nc});
                }
            }
        }
    }
    return islands;
}
```

### 8. Giới hạn request theo cửa sổ trượt

- **Kỹ thuật:** `Deque` lưu thời điểm. **Độ phức tạp:** O(1) trung bình mỗi request.
- **Liên hệ app:** Cùng ý tưởng với rate limit sliding window của gateway (Redis sorted set, [learn-nestjs.md](./learn-nestjs.md) mục 5.5).
- **Kết quả chạy thật:** limit 3 / 1000 ms: t = 0, 100, 200 → cho qua; 300 → chặn; 1000 → cho qua (request lúc 0 đã ra khỏi cửa sổ).

```java
// 8. Giới hạn request kiểu cửa sổ trượt — Deque (giống rate limit của gateway)
static class SlidingWindowLimiter {
    private final int limit; private final long windowMs; private final Deque<Long> times = new ArrayDeque<>();
    SlidingWindowLimiter(int limit, long windowMs) { this.limit = limit; this.windowMs = windowMs; }
    boolean allow(long now) {
        while (!times.isEmpty() && times.peekFirst() <= now - windowMs) times.pollFirst();
        if (times.size() >= limit) return false;
        times.addLast(now); return true;
    }
}
```

### 9. Phát hiện vòng trong danh sách liên kết

- **Kỹ thuật:** Hai con trỏ nhanh/chậm. **Độ phức tạp:** O(n) thời gian, O(1) bộ nhớ.
- **Liên hệ app:** Câu hỏi kinh điển về con trỏ và tham chiếu; trả lời thêm được cách tìm điểm bắt đầu vòng là điểm cộng.
- **Kết quả chạy thật:** Không vòng → `false`; nối cuối về đầu → `true`.

```java
// 9. Phát hiện vòng trong danh sách liên kết — hai con trỏ nhanh/chậm
static class Node { int val; Node next; Node(int v) { val = v; } }
static boolean hasCycle(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next; fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}
```

### 10. Chuỗi con dài nhất không lặp ký tự

- **Kỹ thuật:** Cửa sổ trượt + HashMap vị trí cuối. **Độ phức tạp:** O(n).
- **Liên hệ app:** Mẫu cửa sổ trượt dùng cho mọi bài "đoạn con liên tiếp thỏa điều kiện".
- **Kết quả chạy thật:** `abcabcbb` → `3`, `bbbbb` → `1`.

```java
// 10. Chuỗi con dài nhất không lặp ký tự — cửa sổ trượt + HashMap
static int longestUniqueSubstring(String s) {
    Map<Character, Integer> last = new HashMap<>();
    int best = 0, start = 0;
    for (int i = 0; i < s.length(); i++) {
        Integer prev = last.get(s.charAt(i));
        if (prev != null && prev >= start) start = prev + 1;
        last.put(s.charAt(i), i);
        best = Math.max(best, i - start + 1);
    }
    return best;
}
```

---

## Phần 3. 38 bài luyện thêm theo dạng

Thứ tự trong mỗi dạng đi từ dễ tới khó. Mỗi bài, tự làm tối đa 30 phút; chưa ra thì đọc **Gợi ý** trước, rồi mới đọc lời giải. Mọi lời giải đã chạy thật bằng JDK 21, kèm kiểm tra tự động: `PASS 38/38`.

Lớp phụ trợ dùng chung cho các bài danh sách liên kết và cây (có cả hàm dựng từ mảng, để tự chạy ví dụ):

```java
// ===== Danh sách liên kết =====
static class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }
static ListNode list(int... v) { ListNode d = new ListNode(0), c = d; for (int x : v) { c.next = new ListNode(x); c = c.next; } return d.next; }
static String str(ListNode n) { StringBuilder sb = new StringBuilder("["); for (; n != null; n = n.next) sb.append(n.val).append(n.next != null ? ", " : ""); return sb.append("]").toString(); }

// ===== Cây nhị phân =====
static class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }
/** Dựng cây từ mảng theo thứ tự từng tầng, null là không có nút (giống LeetCode). */
static TreeNode tree(Integer... v) {
    if (v.length == 0 || v[0] == null) return null;
    TreeNode root = new TreeNode(v[0]); Deque<TreeNode> q = new ArrayDeque<>(); q.add(root); int i = 1;
    while (!q.isEmpty() && i < v.length) {
        TreeNode n = q.poll();
        if (i < v.length && v[i] != null) { n.left = new TreeNode(v[i]); q.add(n.left); } i++;
        if (i < v.length && v[i] != null) { n.right = new TreeNode(v[i]); q.add(n.right); } i++;
    }
    return root;
}
```

### Mảng và chuỗi

#### 11. Mua bán cổ phiếu một lần

Mảng `prices[i]` là giá ngày i. Mua một ngày, bán một ngày sau đó. Lãi lớn nhất là bao nhiêu (không lãi thì 0)?

- **Ví dụ:** `[7, 1, 5, 3, 6, 4]` → `5` (mua giá 1, bán giá 6)
- **Kỹ thuật:** Duyệt một lượt, nhớ giá thấp nhất đã gặp. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Với mỗi ngày bán, ngày mua tốt nhất là ngày rẻ nhất **trước** nó.

</details>

<details><summary>Lời giải</summary>

```java
static int maxProfit(int[] prices) {
    int minPrice = Integer.MAX_VALUE, best = 0;
    for (int p : prices) {
        minPrice = Math.min(minPrice, p);
        best = Math.max(best, p - minPrice);
    }
    return best;
}
```

</details>

#### 12. Tích các phần tử trừ chính nó

Trả mảng `res` với `res[i]` = tích mọi phần tử trừ `nums[i]`. **Không dùng phép chia.**

- **Ví dụ:** `[1, 2, 3, 4]` → `[24, 12, 8, 6]`
- **Kỹ thuật:** Tích tiền tố bên trái × tích hậu tố bên phải. **Độ phức tạp:** O(n), O(1) ngoài mảng kết quả (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Lượt đi từ trái tính tích bên trái; lượt đi từ phải nhân thêm tích bên phải.

</details>

<details><summary>Lời giải</summary>

```java
static int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] res = new int[n];
    res[0] = 1;
    for (int i = 1; i < n; i++) res[i] = res[i - 1] * nums[i - 1];   // tích bên trái
    int right = 1;
    for (int i = n - 1; i >= 0; i--) { res[i] *= right; right *= nums[i]; }  // nhân tích bên phải
    return res;
}
```

</details>

#### 13. Tổng đoạn con lớn nhất

Tìm đoạn con liên tiếp có tổng lớn nhất.

- **Ví dụ:** `[-2, 1, -3, 4, -1, 2, 1, -5, 4]` → `6` (đoạn `[4, -1, 2, 1]`)
- **Kỹ thuật:** Kadane. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Tại mỗi phần tử: nối tiếp đoạn đang có, hay bắt đầu đoạn mới từ chính nó?

</details>

<details><summary>Lời giải</summary>

```java
static int maxSubArray(int[] nums) {
    int cur = nums[0], best = nums[0];
    for (int i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);   // nối tiếp hay bắt đầu lại
        best = Math.max(best, cur);
    }
    return best;
}
```

</details>

#### 14. Dồn số 0 về cuối

Dồn mọi số 0 về cuối mảng, giữ thứ tự các số khác, sửa ngay trên mảng.

- **Ví dụ:** `[0, 1, 0, 3, 12]` → `[1, 3, 12, 0, 0]`
- **Kỹ thuật:** Con trỏ ghi. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Một con trỏ `write` chỉ chỗ ghi số khác 0 tiếp theo.

</details>

<details><summary>Lời giải</summary>

```java
static void moveZeroes(int[] nums) {
    int write = 0;
    for (int x : nums) if (x != 0) nums[write++] = x;
    while (write < nums.length) nums[write++] = 0;
}
```

</details>

#### 15. Hai chuỗi là anagram

Hai chuỗi có cùng các ký tự với cùng số lần không?

- **Ví dụ:** `ねこいぬ`, `いぬねこ` → `true`; `rat`, `car` → `false`
- **Kỹ thuật:** Đếm bằng HashMap. **Độ phức tạp:** O(n), O(số ký tự khác nhau) (thời gian, bộ nhớ).
- **Liên hệ:** Dữ liệu của app là tiếng Nhật: đừng giả định chỉ có chữ Latin.

<details><summary>Gợi ý</summary>

Mảng `int[26]` chỉ đúng với chữ a–z; dùng `HashMap` thì chạy được cả kana, kanji.

</details>

<details><summary>Lời giải</summary>

```java
static boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    Map<Character, Integer> count = new HashMap<>();   // HashMap: chạy được cả với kana, kanji
    for (char c : s.toCharArray()) count.merge(c, 1, Integer::sum);
    for (char c : t.toCharArray()) {
        Integer k = count.get(c);
        if (k == null || k == 0) return false;
        count.put(c, k - 1);
    }
    return true;
}
```

</details>

#### 16. Nhóm các anagram

Gom các từ là anagram của nhau thành nhóm.

- **Ví dụ:** `[eat, tea, tan, ate, nat, bat]` → `[[eat, tea, ate], [tan, nat], [bat]]`
- **Kỹ thuật:** HashMap với khóa là chuỗi đã sắp xếp. **Độ phức tạp:** O(n · k log k), k là độ dài từ (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Hai anagram sắp xếp ký tự xong thì giống hệt nhau.

</details>

<details><summary>Lời giải</summary>

```java
static List<List<String>> groupAnagrams(String[] words) {
    Map<String, List<String>> groups = new LinkedHashMap<>();
    for (String w : words) {
        char[] key = w.toCharArray();
        Arrays.sort(key);
        groups.computeIfAbsent(new String(key), k -> new ArrayList<>()).add(w);
    }
    return new ArrayList<>(groups.values());
}
```

</details>

#### 17. Tiền tố chung dài nhất

Tìm tiền tố chung dài nhất của mọi chuỗi.

- **Ví dụ:** `[flower, flow, flight]` → `fl`
- **Kỹ thuật:** Thu ngắn dần tiền tố. **Độ phức tạp:** O(tổng độ dài) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Bắt đầu bằng cả từ đầu tiên, cắt bớt cho tới khi mọi từ đều bắt đầu bằng nó.

</details>

<details><summary>Lời giải</summary>

```java
static String longestCommonPrefix(String[] words) {
    if (words.length == 0) return "";
    String prefix = words[0];
    for (String w : words)
        while (!w.startsWith(prefix)) prefix = prefix.substring(0, prefix.length() - 1);
    return prefix;
}
```

</details>

### Hai con trỏ và cửa sổ trượt

#### 18. Two Sum trên mảng đã sắp xếp

Mảng đã sắp xếp tăng dần, tìm hai chỉ số có tổng bằng `target`, chỉ dùng O(1) bộ nhớ.

- **Ví dụ:** `[2, 7, 11, 15]`, 9 → `[0, 1]`
- **Kỹ thuật:** Hai con trỏ từ hai đầu. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).
- **Liên hệ:** So với bài 1 (HashMap): biết mảng đã sắp xếp thì bỏ được HashMap.

<details><summary>Gợi ý</summary>

Tổng nhỏ quá thì dời con trỏ trái, lớn quá thì dời con trỏ phải.

</details>

<details><summary>Lời giải</summary>

```java
static int[] twoSumSorted(int[] nums, int target) {
    int l = 0, r = nums.length - 1;
    while (l < r) {
        int sum = nums[l] + nums[r];
        if (sum == target) return new int[]{l, r};
        if (sum < target) l++; else r--;
    }
    return new int[0];
}
```

</details>

#### 19. 3Sum

Tìm mọi bộ ba **không trùng** có tổng bằng 0.

- **Ví dụ:** `[-1, 0, 1, 2, -1, -4]` → `[[-1, -1, 2], [-1, 0, 1]]`
- **Kỹ thuật:** Sắp xếp + cố định một số + hai con trỏ. **Độ phức tạp:** O(n²), O(1) ngoài kết quả (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Phần khó là bỏ trùng: bỏ qua số đầu trùng, và sau khi tìm được bộ ba thì bỏ qua các số trùng ở hai phía.

</details>

<details><summary>Lời giải</summary>

```java
static List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> res = new ArrayList<>();
    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;          // bỏ số đầu trùng
        int l = i + 1, r = nums.length - 1;
        while (l < r) {
            int sum = nums[i] + nums[l] + nums[r];
            if (sum == 0) {
                res.add(List.of(nums[i], nums[l], nums[r]));
                while (l < r && nums[l] == nums[l + 1]) l++;    // bỏ trùng
                while (l < r && nums[r] == nums[r - 1]) r--;
                l++; r--;
            } else if (sum < 0) l++; else r--;
        }
    }
    return res;
}
```

</details>

#### 20. Bể chứa nhiều nước nhất

`h[i]` là chiều cao cột i. Chọn hai cột để lượng nước giữa chúng lớn nhất.

- **Ví dụ:** `[1, 8, 6, 2, 5, 4, 8, 3, 7]` → `49`
- **Kỹ thuật:** Hai con trỏ. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Luôn dời cột **thấp hơn**: dời cột cao hơn thì chiều rộng giảm mà chiều cao không thể tăng.

</details>

<details><summary>Lời giải</summary>

```java
static int maxArea(int[] h) {
    int l = 0, r = h.length - 1, best = 0;
    while (l < r) {
        best = Math.max(best, Math.min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) l++; else r--;                         // dời cột thấp hơn
    }
    return best;
}
```

</details>

#### 21. Đoạn con ngắn nhất có tổng ≥ target

Mảng số dương. Tìm độ dài đoạn con liên tiếp ngắn nhất có tổng ≥ `target` (không có thì 0).

- **Ví dụ:** `target = 7`, `[2, 3, 1, 2, 4, 3]` → `2` (đoạn `[4, 3]`)
- **Kỹ thuật:** Cửa sổ trượt co giãn. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).
- **Liên hệ:** Cùng họ với bài 8 (rate limit) và bài 10.

<details><summary>Gợi ý</summary>

Mở rộng bên phải tới khi đủ tổng, rồi co bên trái hết mức có thể.

</details>

<details><summary>Lời giải</summary>

```java
static int minSubArrayLen(int target, int[] nums) {
    int l = 0, sum = 0, best = Integer.MAX_VALUE;
    for (int r = 0; r < nums.length; r++) {
        sum += nums[r];
        while (sum >= target) { best = Math.min(best, r - l + 1); sum -= nums[l++]; }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}
```

</details>

### Stack và queue

#### 22. Bao nhiêu ngày nữa thì ấm hơn

Với mỗi ngày, cần chờ bao nhiêu ngày mới có ngày ấm hơn (không có thì 0)?

- **Ví dụ:** `[73, 74, 75, 71, 69, 72, 76, 73]` → `[1, 1, 4, 2, 1, 1, 0, 0]`
- **Kỹ thuật:** Stack đơn điệu (giữ chỉ số có nhiệt độ giảm dần). **Độ phức tạp:** O(n), O(n) (thời gian, bộ nhớ).
- **Liên hệ:** Mẫu "phần tử lớn hơn kế tiếp" rất hay ra.

<details><summary>Gợi ý</summary>

Gặp ngày ấm hơn đỉnh stack thì đỉnh stack đã có đáp án.

</details>

<details><summary>Lời giải</summary>

```java
static int[] dailyTemperatures(int[] t) {
    int[] res = new int[t.length];
    Deque<Integer> stack = new ArrayDeque<>();                  // chỉ số, nhiệt độ giảm dần
    for (int i = 0; i < t.length; i++) {
        while (!stack.isEmpty() && t[i] > t[stack.peek()]) {
            int j = stack.pop();
            res[j] = i - j;
        }
        stack.push(i);
    }
    return res;
}
```

</details>

#### 23. Stack có getMin() O(1)

Thiết kế stack có `push`, `pop`, `top`, `getMin`, tất cả O(1).

- **Ví dụ:** push −2, 0, −3 → `getMin` = −3; pop → `top` = 0, `getMin` = −2
- **Kỹ thuật:** Lưu kèm "min tới đây" ở mỗi phần tử. **Độ phức tạp:** O(1) mỗi thao tác (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Mỗi phần tử nhớ min của chính nó và mọi phần tử bên dưới.

</details>

<details><summary>Lời giải</summary>

```java
static class MinStack {
    private final Deque<int[]> stack = new ArrayDeque<>();     // [giá trị, min tới đây]
    void push(int x) { stack.push(new int[]{x, stack.isEmpty() ? x : Math.min(x, stack.peek()[1])}); }
    void pop() { stack.pop(); }
    int top() { return stack.peek()[0]; }
    int getMin() { return stack.peek()[1]; }
}
```

</details>

#### 24. Hàng đợi bằng hai stack

Cài đặt hàng đợi (FIFO) chỉ bằng hai stack.

- **Ví dụ:** add 1, add 2, peek → 1, poll → 1, add 3, poll → 2, poll → 3
- **Kỹ thuật:** Stack vào + stack ra, chỉ đổ khi stack ra rỗng. **Độ phức tạp:** O(1) trung bình mỗi thao tác (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Mỗi phần tử bị chuyển từ stack vào sang stack ra đúng một lần.

</details>

<details><summary>Lời giải</summary>

```java
static class QueueByStacks {
    private final Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();
    void add(int x) { in.push(x); }
    int poll() { move(); return out.pop(); }
    int peek() { move(); return out.peek(); }
    private void move() { if (out.isEmpty()) while (!in.isEmpty()) out.push(in.pop()); }  // trung bình O(1)
}
```

</details>

### Binary search

#### 25. Tìm trong mảng sắp xếp đã bị xoay

Mảng tăng dần bị xoay ở một điểm, ví dụ `[4, 5, 6, 7, 0, 1, 2]`. Tìm chỉ số của `target` trong O(log n).

- **Ví dụ:** target 0 → `4`; target 3 → `-1`
- **Kỹ thuật:** Binary search, xác định nửa nào đã sắp xếp. **Độ phức tạp:** O(log n), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Ở mỗi bước, ít nhất một nửa đã sắp xếp; kiểm `target` có nằm trong nửa đó không.

</details>

<details><summary>Lời giải</summary>

```java
static int searchRotated(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {                            // nửa trái đã sắp xếp
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
        } else {                                                // nửa phải đã sắp xếp
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
        }
    }
    return -1;
}
```

</details>

#### 26. Căn bậc hai lấy phần nguyên

Tính `⌊√x⌋` không dùng hàm `Math.sqrt`.

- **Ví dụ:** 8 → `2`; 2147395599 → `46339`
- **Kỹ thuật:** Binary search trên **đáp án**. **Độ phức tạp:** O(log x), O(1) (thời gian, bộ nhớ).
- **Liên hệ:** Mẫu "tìm giá trị lớn nhất thỏa điều kiện" dùng cho nhiều bài khó hơn.

<details><summary>Gợi ý</summary>

Dùng `long` cho `mid * mid` để không tràn số; làm tròn `mid` lên để vòng lặp luôn thu hẹp.

</details>

<details><summary>Lời giải</summary>

```java
static int mySqrt(int x) {
    long lo = 0, hi = x;
    while (lo < hi) {
        long mid = (lo + hi + 1) / 2;                           // làm tròn lên để không lặp vô hạn
        if (mid * mid <= x) lo = mid; else hi = mid - 1;
    }
    return (int) lo;
}
```

</details>

### Danh sách liên kết

#### 27. Đảo ngược danh sách liên kết

Đảo ngược danh sách liên kết đơn.

- **Ví dụ:** `[1, 2, 3, 4, 5]` → `[5, 4, 3, 2, 1]`
- **Kỹ thuật:** Ba con trỏ `prev`, `head`, `next`. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Trước khi đổi `head.next`, phải lưu `next` lại, không thì mất phần còn lại.

</details>

<details><summary>Lời giải</summary>

```java
static ListNode reverse(ListNode head) {
    ListNode prev = null;
    while (head != null) { ListNode next = head.next; head.next = prev; prev = head; head = next; }
    return prev;
}
```

</details>

#### 28. Trộn hai danh sách đã sắp xếp

Trộn hai danh sách tăng dần thành một danh sách tăng dần.

- **Ví dụ:** `[1, 2, 4]` + `[1, 3, 4]` → `[1, 1, 2, 3, 4, 4]`
- **Kỹ thuật:** Nút giả (dummy) + con trỏ đuôi. **Độ phức tạp:** O(n + m), O(1) (thời gian, bộ nhớ).
- **Liên hệ:** Cùng ý với gộp tin nhắn REST và SSE đã sắp theo thời gian trong chat của app.

<details><summary>Gợi ý</summary>

Nút giả giúp khỏi xử lý riêng trường hợp nút đầu.

</details>

<details><summary>Lời giải</summary>

```java
static ListNode mergeTwo(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;             // nút giả: khỏi xử lý riêng nút đầu
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; } else { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;
    return dummy.next;
}
```

</details>

#### 29. Xóa nút thứ n tính từ cuối

Xóa nút thứ n tính từ cuối, chỉ duyệt một lượt.

- **Ví dụ:** `[1, 2, 3, 4, 5]`, n = 2 → `[1, 2, 3, 5]`
- **Kỹ thuật:** Hai con trỏ cách nhau n+1 bước. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Con trỏ nhanh tới cuối thì con trỏ chậm đứng ngay trước nút cần xóa.

</details>

<details><summary>Lời giải</summary>

```java
static ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0); dummy.next = head;
    ListNode fast = dummy, slow = dummy;
    for (int i = 0; i <= n; i++) fast = fast.next;               // fast đi trước n+1 bước
    while (fast != null) { fast = fast.next; slow = slow.next; }
    slow.next = slow.next.next;
    return dummy.next;
}
```

</details>

### Cây

#### 30. Độ sâu lớn nhất của cây

Số tầng của cây nhị phân.

- **Ví dụ:** `[3, 9, 20, null, null, 15, 7]` → `3`
- **Kỹ thuật:** Đệ quy (DFS). **Độ phức tạp:** O(n), O(chiều cao) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Độ sâu cây = 1 + độ sâu lớn hơn của hai cây con.

</details>

<details><summary>Lời giải</summary>

```java
static int maxDepth(TreeNode root) {
    return root == null ? 0 : 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

</details>

#### 31. Duyệt theo từng tầng

Trả giá trị các nút theo từng tầng.

- **Ví dụ:** cây trên → `[[3], [9, 20], [15, 7]]`
- **Kỹ thuật:** BFS với hàng đợi, đếm số nút mỗi tầng. **Độ phức tạp:** O(n), O(n) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Đọc `q.size()` **trước** vòng lặp để chỉ lấy đúng các nút của tầng hiện tại.

</details>

<details><summary>Lời giải</summary>

```java
static List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Deque<TreeNode> q = new ArrayDeque<>(); q.add(root);
    while (!q.isEmpty()) {
        List<Integer> level = new ArrayList<>();
        for (int size = q.size(); size > 0; size--) {             // chỉ lấy đúng số nút của tầng này
            TreeNode n = q.poll(); level.add(n.val);
            if (n.left != null) q.add(n.left);
            if (n.right != null) q.add(n.right);
        }
        res.add(level);
    }
    return res;
}
```

</details>

#### 32. Kiểm tra cây nhị phân tìm kiếm

Cây có phải BST không: mọi nút bên trái < nút, mọi nút bên phải > nút?

- **Ví dụ:** `[2, 1, 3]` → `true`; `[5, 4, 6, null, null, 3, 7]` → `false`
- **Kỹ thuật:** DFS mang theo khoảng hợp lệ (lo, hi). **Độ phức tạp:** O(n), O(chiều cao) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Bẫy kinh điển: chỉ so với **con trực tiếp** là sai. Ở ví dụ thứ hai, 3 nằm bên phải 5 dù nhỏ hơn 5.

</details>

<details><summary>Lời giải</summary>

```java
static boolean isValidBST(TreeNode root) { return valid(root, Long.MIN_VALUE, Long.MAX_VALUE); }
private static boolean valid(TreeNode n, long lo, long hi) {
    if (n == null) return true;
    if (n.val <= lo || n.val >= hi) return false;               // mọi nút bên trái < nút cha, không chỉ con trực tiếp
    return valid(n.left, lo, n.val) && valid(n.right, n.val, hi);
}
```

</details>

#### 33. Tổ tiên chung gần nhất trong BST

Tìm nút thấp nhất nhận cả p và q làm con cháu.

- **Ví dụ:** `[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]`, p = 2, q = 8 → `6`; p = 2, q = 4 → `2`
- **Kỹ thuật:** Đi từ gốc theo tính chất BST. **Độ phức tạp:** O(chiều cao), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Cả hai nhỏ hơn nút thì sang trái, cả hai lớn hơn thì sang phải, còn lại chính là đáp án.

</details>

<details><summary>Lời giải</summary>

```java
static int lcaBST(TreeNode root, int p, int q) {
    TreeNode n = root;
    while (n != null) {
        if (p < n.val && q < n.val) n = n.left;
        else if (p > n.val && q > n.val) n = n.right;
        else return n.val;                                      // p, q nằm hai phía (hoặc trùng n)
    }
    return -1;
}
```

</details>

### Đồ thị

#### 34. Thứ tự học các bài có điều kiện tiên quyết

Có n bài, `prereq[i] = {a, b}` nghĩa là muốn học a phải học b trước. Trả một thứ tự học hết được, hoặc rỗng nếu không thể (có vòng).

- **Ví dụ:** 4 bài, `{1,0}, {2,0}, {3,1}, {3,2}` → `[0, 1, 2, 3]`; `{0,1}, {1,0}` → `[]`
- **Kỹ thuật:** Sắp xếp tô-pô (thuật toán Kahn, BFS theo bậc vào). **Độ phức tạp:** O(V + E), O(V + E) (thời gian, bộ nhớ).
- **Liên hệ:** Lộ trình docs của repo cũng là một đồ thị như vậy: mỗi bài có mục "Cần biết trước".

<details><summary>Gợi ý</summary>

Bài nào không còn điều kiện tiên quyết (bậc vào 0) thì học được ngay; học xong thì giảm bậc vào của các bài phụ thuộc.

</details>

<details><summary>Lời giải</summary>

```java
/** prereq[i] = {bài, bài cần học trước}. Có vòng phụ thuộc thì không học hết được. */
static List<Integer> studyOrder(int n, int[][] prereq) {
    List<List<Integer>> next = new ArrayList<>();
    for (int i = 0; i < n; i++) next.add(new ArrayList<>());
    int[] indegree = new int[n];
    for (int[] e : prereq) { next.get(e[1]).add(e[0]); indegree[e[0]]++; }
    Deque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.add(i);
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int c = q.poll(); order.add(c);
        for (int d : next.get(c)) if (--indegree[d] == 0) q.add(d);
    }
    return order.size() == n ? order : List.of();               // rỗng = có vòng
}
```

</details>

#### 35. Đường ngắn nhất trong mê cung

Lưới 0 (đi được) và 1 (tường). Số bước ít nhất từ góc trên trái tới góc dưới phải, đi 4 hướng (không tới được thì −1).

- **Ví dụ:** `[[0,0,0],[1,1,0],[1,1,0]]` → `4`; `[[0,1],[1,0]]` → `-1`
- **Kỹ thuật:** BFS (đồ thị không trọng số). **Độ phức tạp:** O(rows × cols) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

BFS tìm đường ngắn nhất khi mọi bước có cùng chi phí; DFS thì không.

</details>

<details><summary>Lời giải</summary>

```java
static int shortestPath(int[][] grid) {                         // 0 = đi được, 1 = tường; từ góc trên trái tới góc dưới phải
    int rows = grid.length, cols = grid[0].length;
    if (grid[0][0] == 1) return -1;
    int[][] dist = new int[rows][cols];
    for (int[] row : dist) Arrays.fill(row, -1);
    Deque<int[]> q = new ArrayDeque<>(); q.add(new int[]{0, 0}); dist[0][0] = 0;
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!q.isEmpty()) {
        int[] p = q.poll();
        for (int[] d : dirs) {
            int r = p[0] + d[0], c = p[1] + d[1];
            if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] == 0 && dist[r][c] == -1) {
                dist[r][c] = dist[p[0]][p[1]] + 1; q.add(new int[]{r, c});
            }
        }
    }
    return dist[rows - 1][cols - 1];
}
```

</details>

### Heap, khoảng và tham lam

#### 36. Gộp các khoảng giao nhau

Gộp mọi khoảng có giao nhau.

- **Ví dụ:** `[[1,3], [8,10], [2,6], [15,18]]` → `[[1,6], [8,10], [15,18]]`
- **Kỹ thuật:** Sắp xếp theo điểm đầu rồi duyệt. **Độ phức tạp:** O(n log n), O(n) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Sau khi sắp xếp, khoảng mới chỉ có thể giao với khoảng **cuối cùng** trong kết quả.

</details>

<details><summary>Lời giải</summary>

```java
static int[][] mergeIntervals(int[][] intervals) {
    int[][] sorted = intervals.clone();
    Arrays.sort(sorted, Comparator.comparingInt(a -> a[0]));
    List<int[]> res = new ArrayList<>();
    for (int[] cur : sorted) {
        if (res.isEmpty() || res.get(res.size() - 1)[1] < cur[0]) res.add(cur.clone());
        else res.get(res.size() - 1)[1] = Math.max(res.get(res.size() - 1)[1], cur[1]);
    }
    return res.toArray(new int[0][]);
}
```

</details>

#### 37. Ít nhất bao nhiêu phòng cho các buổi học

Cho giờ bắt đầu và kết thúc của các buổi coaching. Cần ít nhất bao nhiêu phòng (hoặc coach) để không buổi nào trùng?

- **Ví dụ:** `[[9,10], [9,12], [10,11], [11,13]]` → `2`
- **Kỹ thuật:** Sắp xếp + min-heap giờ kết thúc. **Độ phức tạp:** O(n log n), O(n) (thời gian, bộ nhớ).
- **Liên hệ:** App có đặt lịch coach ([learn-stripe-idempotency.md](./learn-stripe-idempotency.md)): kiểm trùng lịch là bài toán khoảng.

<details><summary>Gợi ý</summary>

Buổi mới dùng lại phòng **trống sớm nhất** nếu phòng đó đã trống.

</details>

<details><summary>Lời giải</summary>

```java
static int minRooms(int[][] sessions) {
    int[][] sorted = sessions.clone();
    Arrays.sort(sorted, Comparator.comparingInt(a -> a[0]));
    PriorityQueue<Integer> ends = new PriorityQueue<>();        // giờ kết thúc của các phòng đang dùng
    for (int[] s : sorted) {
        if (!ends.isEmpty() && ends.peek() <= s[0]) ends.poll();  // phòng sớm trống nhất đã trống
        ends.add(s[1]);
    }
    return ends.size();
}
```

</details>

#### 38. Phần tử lớn thứ k

Tìm phần tử lớn thứ k (tính cả trùng).

- **Ví dụ:** `[3, 2, 3, 1, 2, 4, 5, 5, 6]`, k = 4 → `4`
- **Kỹ thuật:** Min-heap kích thước k. **Độ phức tạp:** O(n log k), O(k) (thời gian, bộ nhớ).
- **Liên hệ:** Cùng mẫu với bài 6.

<details><summary>Gợi ý</summary>

Giữ k số lớn nhất trong heap; đỉnh heap chính là số lớn thứ k.

</details>

<details><summary>Lời giải</summary>

```java
static int kthLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    for (int x : nums) { heap.add(x); if (heap.size() > k) heap.poll(); }
    return heap.peek();
}
```

</details>

### Quy hoạch động

#### 39. Leo cầu thang

Mỗi lần leo 1 hoặc 2 bậc. Có bao nhiêu cách lên bậc n?

- **Ví dụ:** n = 5 → `8`
- **Kỹ thuật:** Quy hoạch động 1 chiều (giống Fibonacci). **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).
- **Liên hệ:** Bài nhập môn để học cách nghĩ: "đáp án của bài lớn từ đáp án của bài nhỏ".

<details><summary>Gợi ý</summary>

Cách lên bậc i = cách lên bậc i−1 + cách lên bậc i−2.

</details>

<details><summary>Lời giải</summary>

```java
static int climbStairs(int n) {
    int a = 1, b = 1;                                           // số cách tới bậc i-2, i-1
    for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; }
    return b;
}
```

</details>

#### 40. Đổi tiền ít đồng nhất

Có các mệnh giá `coins` (không giới hạn số đồng). Cần ít nhất bao nhiêu đồng để đủ `amount` (không được thì −1)?

- **Ví dụ:** `[1, 2, 5]`, 11 → `3` (5+5+1); `[2]`, 3 → `-1`
- **Kỹ thuật:** Quy hoạch động theo số tiền. **Độ phức tạp:** O(amount × số mệnh giá), O(amount) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

`dp[a]` = ít đồng nhất cho số tiền a. Tham lam (lấy đồng lớn nhất trước) **sai** với nhiều bộ mệnh giá.

</details>

<details><summary>Lời giải</summary>

```java
static int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);                                // "vô cực"
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}
```

</details>

#### 41. Dãy con tăng dài nhất

Độ dài dãy con (không cần liên tiếp) tăng ngặt dài nhất.

- **Ví dụ:** `[10, 9, 2, 5, 3, 7, 101, 18]` → `4` (ví dụ `2, 3, 7, 18`)
- **Kỹ thuật:** Mảng `tails` + binary search. **Độ phức tạp:** O(n log n), O(n) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Bản O(n²) dễ nghĩ hơn; nói bản đó trước, rồi cải tiến bằng binary search.

</details>

<details><summary>Lời giải</summary>

```java
static int lengthOfLIS(int[] nums) {
    int[] tails = new int[nums.length]; int size = 0;           // tails[i]: phần tử cuối nhỏ nhất của dãy tăng dài i+1
    for (int x : nums) {
        int lo = 0, hi = size;
        while (lo < hi) { int mid = (lo + hi) / 2; if (tails[mid] < x) lo = mid + 1; else hi = mid; }
        tails[lo] = x;
        if (lo == size) size++;
    }
    return size;
}
```

</details>

#### 42. Khoảng cách chỉnh sửa

Số thao tác ít nhất (chèn, xóa, thay một ký tự) để biến chuỗi a thành chuỗi b.

- **Ví dụ:** `horse` → `ros`: `3`; `konnichiwa` → `konichiwa`: `1`
- **Kỹ thuật:** Quy hoạch động 2 chiều. **Độ phức tạp:** O(m × n), O(m × n) (thời gian, bộ nhớ).
- **Liên hệ:** Ứng dụng thật: chấm romaji gõ gần đúng (sai một chữ thì vẫn gợi ý "gần đúng"). App hiện so khớp chính xác sau khi chuẩn hóa (`normalizeAnswer`).

<details><summary>Gợi ý</summary>

`dp[i][j]` = khoảng cách giữa i ký tự đầu của a và j ký tự đầu của b.

</details>

<details><summary>Lời giải</summary>

```java
static int editDistance(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
    for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++)
            dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1)
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));  // thay, xóa, chèn
    return dp[a.length()][b.length()];
}
```

</details>

#### 43. Dãy con chung dài nhất

Độ dài dãy con chung (không cần liên tiếp) dài nhất của hai chuỗi.

- **Ví dụ:** `abcde`, `ace` → `3`
- **Kỹ thuật:** Quy hoạch động 2 chiều. **Độ phức tạp:** O(m × n), O(m × n) (thời gian, bộ nhớ).
- **Liên hệ:** Nền của các công cụ so sánh văn bản (`git diff`).

<details><summary>Gợi ý</summary>

Hai ký tự cuối giống nhau thì cộng 1 từ ô chéo; khác thì lấy lớn hơn của hai ô bên cạnh.

</details>

<details><summary>Lời giải</summary>

```java
static int lcs(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++)
            dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[a.length()][b.length()];
}
```

</details>

### Quay lui

#### 44. Mọi tập con

Liệt kê mọi tập con của một mảng không có số trùng.

- **Ví dụ:** `[1, 2, 3]` → 8 tập con, từ `[]` tới `[1, 2, 3]`
- **Kỹ thuật:** Quay lui: chọn, đi tiếp, bỏ chọn. **Độ phức tạp:** O(n · 2ⁿ) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Nhớ **chép** danh sách hiện tại khi thêm vào kết quả, vì danh sách đó còn bị sửa tiếp.

</details>

<details><summary>Lời giải</summary>

```java
static List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    backtrackSubsets(nums, 0, new ArrayList<>(), res);
    return res;
}
private static void backtrackSubsets(int[] nums, int start, List<Integer> cur, List<List<Integer>> res) {
    res.add(new ArrayList<>(cur));                              // chép: cur còn bị sửa tiếp
    for (int i = start; i < nums.length; i++) {
        cur.add(nums[i]);
        backtrackSubsets(nums, i + 1, cur, res);
        cur.remove(cur.size() - 1);                             // trả lại trạng thái cũ
    }
}
```

</details>

#### 45. Mọi hoán vị

Liệt kê mọi hoán vị của một mảng không có số trùng.

- **Ví dụ:** `[1, 2, 3]` → 6 hoán vị
- **Kỹ thuật:** Quay lui với mảng `used`. **Độ phức tạp:** O(n · n!) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Cấu trúc giống bài 44; khác ở chỗ mỗi bước được chọn bất kỳ phần tử chưa dùng.

</details>

<details><summary>Lời giải</summary>

```java
static List<List<Integer>> permutations(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    permute(nums, new boolean[nums.length], new ArrayList<>(), res);
    return res;
}
private static void permute(int[] nums, boolean[] used, List<Integer> cur, List<List<Integer>> res) {
    if (cur.size() == nums.length) { res.add(new ArrayList<>(cur)); return; }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.add(nums[i]);
        permute(nums, used, cur, res);
        used[i] = false; cur.remove(cur.size() - 1);
    }
}
```

</details>

### Bit và cấu trúc đặc biệt

#### 46. Số chỉ xuất hiện một lần

Mọi số xuất hiện hai lần, trừ đúng một số. Tìm số đó với O(1) bộ nhớ.

- **Ví dụ:** `[4, 1, 2, 1, 2]` → `4`
- **Kỹ thuật:** XOR. **Độ phức tạp:** O(n), O(1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

`a ^ a = 0` và `a ^ 0 = a`, nên các cặp tự triệt tiêu.

</details>

<details><summary>Lời giải</summary>

```java
static int singleNumber(int[] nums) {
    int x = 0;
    for (int n : nums) x ^= n;                                  // a ^ a = 0, a ^ 0 = a
    return x;
}
```

</details>

#### 47. Đếm bit 1

Đếm số bit 1 trong biểu diễn nhị phân 32 bit.

- **Ví dụ:** 11 (`1011`) → `3`; −1 → `32`
- **Kỹ thuật:** `n & (n - 1)` xóa bit 1 thấp nhất. **Độ phức tạp:** O(số bit 1) (thời gian, bộ nhớ).

<details><summary>Gợi ý</summary>

Số âm trong Java dùng bù hai; vòng `while (n != 0)` vẫn dừng vì mỗi lượt xóa một bit.

</details>

<details><summary>Lời giải</summary>

```java
static int countBits(int n) {
    int count = 0;
    while (n != 0) { n &= n - 1; count++; }                    // xóa bit 1 thấp nhất mỗi lượt
    return count;
}
```

</details>

#### 48. Trie: gợi ý từ theo tiền tố

Thiết kế cấu trúc lưu từ và trả mọi từ bắt đầu bằng một tiền tố.

- **Ví dụ:** thêm `sakura, sake, sakana, sushi, neko`; tiền tố `sak` → `[sakana, sake, sakura]`
- **Kỹ thuật:** Cây tiền tố (Trie). **Độ phức tạp:** Thêm và tìm O(độ dài từ) (thời gian, bộ nhớ).
- **Liên hệ:** App có thật tính năng này: màn **Tra từ** gõ romaji tới đâu gợi ý tới đó, offline. Code: [RomajiTrie.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/domain/search/RomajiTrie.kt) (Kotlin, cùng ý tưởng với lời giải Java dưới đây, thêm xử lý trường âm `ō`), có cả bản iOS, Flutter, React Native và bản backend cho web; giải thích ở [learn-android-features.md](./learn-android-features.md) mục 11.

<details><summary>Gợi ý</summary>

Mỗi nút là một ký tự; đánh dấu nút kết thúc một từ.

</details>

<details><summary>Lời giải</summary>

```java
static class Trie {
    private static class Node { Map<Character, Node> next = new TreeMap<>(); boolean word; }
    private final Node root = new Node();
    void insert(String w) { Node n = root; for (char c : w.toCharArray()) n = n.next.computeIfAbsent(c, k -> new Node()); n.word = true; }
    List<String> startsWith(String prefix) {
        Node n = root;
        for (char c : prefix.toCharArray()) { n = n.next.get(c); if (n == null) return List.of(); }
        List<String> res = new ArrayList<>(); collect(n, new StringBuilder(prefix), res); return res;
    }
    private void collect(Node n, StringBuilder sb, List<String> res) {
        if (n.word) res.add(sb.toString());
        for (Map.Entry<Character, Node> e : n.next.entrySet()) { sb.append(e.getKey()); collect(e.getValue(), sb, res); sb.deleteCharAt(sb.length() - 1); }
    }
}
```

</details>

---

## Phần 4. Câu hỏi hành vi và tiếng Anh

Các công ty đa quốc gia thường có một phần bằng tiếng Anh. Chuẩn bị sẵn:

1. **Giới thiệu bản thân** (1 phút, tiếng Anh): học gì, làm dự án gì, vì sao muốn làm Android ở công ty đó.
2. **Ba câu chuyện STAR** từ app này (xem [interview-android.md](./interview-android.md)):
   - đồng bộ offline không mất dữ liệu (hàng đợi sync, L12);
   - lỗi bảo mật nền tảng tự tìm và sửa (token theo bản sao lưu);
   - lỗi chỉ lộ ra khi chạy thật (SSE bị logging interceptor nuốt).
3. **"Kể một lần bạn sai và sửa thế nào"**: chọn một trong 5 lỗi "unit test xanh mà vẫn sai" ở [bài 4](./learn-android-features.md) mục 10.

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-devops.md](./interview-devops.md) — DevOps
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-android.md](./interview-android.md) — Android: câu hỏi theo code nihongo-android, gồm cả Framework, Binder, Automotive
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
