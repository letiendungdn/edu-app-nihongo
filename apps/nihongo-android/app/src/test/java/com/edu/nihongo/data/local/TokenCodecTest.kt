package com.edu.nihongo.data.local

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Base64

/** Bộ mã giả có thể đảo ngược (đảo byte) — đủ để kiểm tra định dạng, không cần Keystore. */
private class FakeCipher(private val broken: Boolean = false) : TokenCipher {
    override fun encrypt(plain: String): ByteArray = plain.toByteArray().reversedArray()
    override fun decrypt(data: ByteArray): String? = if (broken) null else String(data.reversedArray())
}

class TokenCodecTest {
    private fun codec(cipher: TokenCipher = FakeCipher()) = TokenCodec(
        cipher,
        base64Encode = { Base64.getEncoder().encodeToString(it) },
        base64Decode = { Base64.getDecoder().decode(it) },
    )

    @Test fun encodedValueIsNotPlaintextAndRoundTrips() {
        val stored = codec().encode("eyJhbGciOi.secret")
        assertTrue(stored.startsWith("v1:"))
        assertFalse("token không được nằm dạng thường trong file", stored.contains("secret"))
        assertEquals(TokenCodec.Decoded("eyJhbGciOi.secret", needsRewrite = false), codec().decode(stored))
    }

    @Test fun legacyPlaintextFromOldVersionStillWorksAndAsksForRewrite() {
        // Bản cũ lưu dạng thường: người dùng cập nhật app không được bị đăng xuất
        assertEquals(TokenCodec.Decoded("refresh_token=abc; Path=/api/auth", needsRewrite = true),
            codec().decode("refresh_token=abc; Path=/api/auth"))
    }

    @Test fun undecryptableValueMeansLoggedOutAndShouldBeRemoved() {
        // Khóa Keystore mất (khôi phục máy, xóa dữ liệu khóa) → không giải mã được
        val stored = codec().encode("x")
        assertEquals(TokenCodec.Decoded(null, needsRewrite = true), codec(FakeCipher(broken = true)).decode(stored))
        assertEquals(TokenCodec.Decoded(null, needsRewrite = true), codec().decode("v1:%%%không-phải-base64"))
    }

    @Test fun missingValue() {
        assertNull(codec().decode(null).value)
        assertFalse(codec().decode("").needsRewrite)
    }
}
