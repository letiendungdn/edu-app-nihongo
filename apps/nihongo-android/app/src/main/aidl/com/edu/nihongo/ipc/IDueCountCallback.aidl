// Callback do client cài đặt, service gọi ngược lại qua Binder.
package com.edu.nihongo.ipc;

oneway interface IDueCountCallback {
    void onResult(int dueCount, int servicePid);
}
