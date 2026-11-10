// Lab Binder/AIDL (docs/learn-android-framework.md): service chạy ở tiến trình riêng ":ipc".
// File .aidl là "hợp đồng". Build sinh ra IDueCardsService.Stub (phía service cài đặt) và
// IDueCardsService.Stub.Proxy (phía client gọi; mỗi lời gọi được đóng gói thành Parcel đi qua Binder).
package com.edu.nihongo.ipc;

import com.edu.nihongo.ipc.IDueCountCallback;

interface IDueCardsService {
    /** Gọi đồng bộ: client CHỜ tới khi service trả lời. Không gọi từ main thread nếu việc lâu. */
    int getDueCount(long nowMillis);

    /** PID của tiến trình chạy service, để thấy lời gọi thật sự sang tiến trình khác. */
    int getServicePid();

    /**
     * oneway: gửi đi rồi quay về ngay, không chờ. Kết quả trả qua callback (cũng là một Binder,
     * do client tạo và truyền sang).
     */
    oneway void requestDueCount(long nowMillis, IDueCountCallback callback);
}
