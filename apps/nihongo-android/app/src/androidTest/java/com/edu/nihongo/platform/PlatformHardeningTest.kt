package com.edu.nihongo.platform

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.security.NetworkSecurityPolicy
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.edu.nihongo.data.live.LiveCallService
import com.edu.nihongo.data.live.ServiceLiveCallKeeper
import com.edu.nihongo.data.local.KeystoreTokenCipher
import com.edu.nihongo.data.local.TokenStore
import com.edu.nihongo.data.local.tokenDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/** Ba lỗ hổng nền tảng đã sửa: token trong bản sao lưu, HTTP mọi domain, live không có foreground service. */
@RunWith(AndroidJUnit4::class)
class PlatformHardeningTest {
    private val context: Context = ApplicationProvider.getApplicationContext()

    @Before fun grantCallPermissions() {
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        listOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
            .forEach { automation.grantRuntimePermission(context.packageName, it) }
    }

    // ── Token ──────────────────────────────────────────────────────────────

    @Test fun keystoreCipherRoundTripsWithFreshIvEachTime() {
        val cipher = KeystoreTokenCipher()
        val a = cipher.encrypt("refresh-token-123")
        val b = cipher.encrypt("refresh-token-123")
        assertNotEquals("GCM phải dùng IV mới mỗi lần", a.toList(), b.toList())
        assertEquals("refresh-token-123", cipher.decrypt(a))
        a[a.size - 1] = (a[a.size - 1].toInt() xor 1).toByte()
        assertEquals("sửa 1 bit → GCM phát hiện, không trả rác", null, cipher.decrypt(a))
    }

    @Test fun tokenFileOnDiskIsEncryptedAndLegacyPlaintextIsMigrated() = runBlocking {
        val store = TokenStore(context, KeystoreTokenCipher())
        // Giả lập bản cũ: ghi thẳng token dạng thường vào DataStore "auth" (một instance duy nhất cho mỗi file)
        context.tokenDataStore.edit { it[stringPreferencesKey("refresh_cookie")] = "refresh_token=OLD-PLAIN" }

        assertEquals("refresh_token=OLD-PLAIN", store.getRefreshCookie()) // không bị đăng xuất

        val raw = context.tokenDataStore.data.first()[stringPreferencesKey("refresh_cookie")]!!
        assertTrue("đã ghi lại dạng mã hóa", raw.startsWith("v1:"))
        val file = File(context.filesDir, "datastore/auth.preferences_pb")
        assertTrue(file.exists())
        assertFalse("file trên đĩa không còn token dạng thường", String(file.readBytes(), Charsets.ISO_8859_1).contains("OLD-PLAIN"))
        store.clearRefreshCookie()
    }

    // ── Mạng ───────────────────────────────────────────────────────────────

    @Test fun cleartextBlockedEverywhereExceptLocalDevHosts() {
        val policy = NetworkSecurityPolicy.getInstance()
        assertFalse(policy.isCleartextTrafficPermitted("example.com"))
        assertFalse(policy.isCleartextTrafficPermitted("api.nihongo.app"))
        assertTrue(policy.isCleartextTrafficPermitted("10.0.2.2"))
        assertTrue(policy.isCleartextTrafficPermitted("localhost"))
    }

    // ── Foreground service cho buổi live ──────────────────────────────────

    @Test fun liveCallRunsAsForegroundServiceWithOngoingNotification() {
        val keeper = ServiceLiveCallKeeper(context)
        val notifications = context.getSystemService(NotificationManager::class.java)
        try {
            assertTrue(keeper.start())
            val shown = waitUntil { notifications.activeNotifications.any { it.id == LiveCallService.NOTIFICATION_ID } }
            assertTrue("thông báo 'Đang phát live' phải hiện", shown)
        } finally {
            keeper.stop()
        }
        assertTrue(waitUntil { notifications.activeNotifications.none { it.id == LiveCallService.NOTIFICATION_ID } })
    }

    private fun waitUntil(timeoutMs: Long = 5_000, condition: () -> Boolean): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            if (condition()) return true
            Thread.sleep(100)
        }
        return condition()
    }
}
