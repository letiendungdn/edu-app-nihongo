package com.edu.nihongo.data.local

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

/** Mã hóa / giải mã chuỗi bí mật (token). Tách interface để test không cần Keystore. */
interface TokenCipher {
    fun encrypt(plain: String): ByteArray

    /** null = không giải mã được (khóa đã mất, dữ liệu hỏng). */
    fun decrypt(data: ByteArray): String?
}

/**
 * AES-256-GCM với khóa nằm trong Android Keystore: khóa không bao giờ ra khỏi phần cứng bảo mật,
 * không đi theo bản sao lưu. File token có bị chép sang máy khác cũng không giải mã được.
 */
@Singleton
class KeystoreTokenCipher @Inject constructor() : TokenCipher {
    private fun key(): SecretKey {
        val store = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }

    override fun encrypt(plain: String): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key()) // Keystore tự sinh IV ngẫu nhiên mỗi lần
        return cipher.iv + cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
    }

    override fun decrypt(data: ByteArray): String? = runCatching {
        if (data.size <= IV_SIZE) return null
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_BITS, data, 0, IV_SIZE))
        String(cipher.doFinal(data, IV_SIZE, data.size - IV_SIZE), Charsets.UTF_8)
    }.getOrNull()

    private companion object {
        const val KEYSTORE = "AndroidKeyStore"
        const val ALIAS = "nihongo-token-key"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_SIZE = 12
        const val TAG_BITS = 128
    }
}

/**
 * Định dạng lưu: `v1:` + base64(iv ‖ ciphertext). Giá trị KHÔNG có tiền tố là token dạng thường
 * do bản cũ ghi: vẫn đọc được để người dùng không bị đăng xuất, và báo cần ghi lại dạng mã hóa.
 * Hàm thuần (chỉ phụ thuộc [TokenCipher]) để test trên JVM.
 */
class TokenCodec(
    private val cipher: TokenCipher,
    private val base64Encode: (ByteArray) -> String = { Base64.encodeToString(it, Base64.NO_WRAP) },
    private val base64Decode: (String) -> ByteArray = { Base64.decode(it, Base64.NO_WRAP) },
) {
    data class Decoded(val value: String?, val needsRewrite: Boolean)

    fun encode(plain: String): String = PREFIX + base64Encode(cipher.encrypt(plain))

    fun decode(stored: String?): Decoded {
        if (stored.isNullOrEmpty()) return Decoded(null, needsRewrite = false)
        if (!stored.startsWith(PREFIX)) return Decoded(stored, needsRewrite = true) // bản cũ: dạng thường
        val bytes = runCatching { base64Decode(stored.removePrefix(PREFIX)) }.getOrNull()
        val plain = bytes?.let(cipher::decrypt)
        // Không giải mã được (khóa mất sau khi khôi phục máy, dữ liệu hỏng) → coi như chưa đăng nhập
        return Decoded(plain, needsRewrite = plain == null)
    }

    private companion object {
        const val PREFIX = "v1:"
    }
}
