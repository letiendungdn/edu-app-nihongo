package com.edu.nihongo.presentation.mywords

import com.edu.nihongo.domain.repository.AuthRepository
import com.edu.nihongo.domain.repository.PersonalWord
import com.edu.nihongo.domain.repository.PersonalWordsRepository
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.io.IOException

private class FakeAuth(var loggedIn: Boolean = true) : AuthRepository {
    override suspend fun login(email: String, password: String) = Result.success(Unit)
    override suspend fun loginWithOidc(accessToken: String, idToken: String?) = Result.success(Unit)
    override suspend fun logout() {}
    override suspend fun isLoggedIn() = loggedIn
}

/** Repository giả: dữ liệu trong bộ nhớ, điều khiển được lỗi và thứ tự trả kết quả. */
private class FakeWords : PersonalWordsRepository {
    val words = mutableListOf(PersonalWord(1, "わたし", "tôi", 1), PersonalWord(2, "たべます", "ăn", 6))
    var failNext: Exception? = null
    val gates = ArrayDeque<CompletableDeferred<Unit>>() // mỗi lần list() lấy một cổng và chờ
    var addCalls = 0

    private fun <T> result(v: () -> T): Result<T> = failNext?.let { failNext = null; Result.failure(it) } ?: Result.success(v())

    override suspend fun list(lesson: Int?): Result<List<PersonalWord>> {
        gates.removeFirstOrNull()?.await()
        return result { words.filter { lesson == null || it.lesson == lesson } }
    }
    override suspend fun add(kana: String, meaning: String, lesson: Int): Result<PersonalWord> {
        addCalls++
        return result { PersonalWord(words.size + 1L, kana, meaning, lesson).also { words += it } }
    }
    override suspend fun delete(id: Long) = result { words.removeAll { it.id == id }; Unit }
}

class PersonalWordsViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val repo = FakeWords()
    private val auth = FakeAuth()

    private fun data(vm: PersonalWordsViewModel) = (vm.state.value.content as WordsContent.Data).words.map { it.kana }

    @Test fun chuaDangNhap_moiDangNhap() = runTest(main.dispatcher) {
        auth.loggedIn = false
        val vm = PersonalWordsViewModel(repo, auth)
        advanceUntilIdle()
        assertEquals(WordsContent.NeedsLogin, vm.state.value.content)
    }

    @Test fun taiDanhSach_vaLoc() = runTest(main.dispatcher) {
        val vm = PersonalWordsViewModel(repo, auth)
        advanceUntilIdle()
        assertEquals(listOf("わたし", "たべます"), data(vm))
        vm.selectLesson(6)
        advanceUntilIdle()
        assertEquals(listOf("たべます"), data(vm))
    }

    @Test fun doiBoLocLienTuc_ketQuaCuKhongGhiDe() = runTest(main.dispatcher) {
        val vm = PersonalWordsViewModel(repo, auth)
        advanceUntilIdle()
        val bai1 = CompletableDeferred<Unit>()
        val bai6 = CompletableDeferred<Unit>()
        repo.gates += bai1
        repo.gates += bai6
        vm.selectLesson(1)
        advanceUntilIdle()
        vm.selectLesson(6)
        advanceUntilIdle()
        bai6.complete(Unit) // "bài 6" về trước…
        advanceUntilIdle()
        bai1.complete(Unit) // …"bài 1" (cũ) về sau
        advanceUntilIdle()
        assertEquals(listOf("たべます"), data(vm))
    }

    @Test fun them_duLieuSai_khongGoiServer() = runTest(main.dispatcher) {
        val vm = PersonalWordsViewModel(repo, auth)
        advanceUntilIdle()
        vm.add("abc", " ", "99") {}
        advanceUntilIdle()
        assertEquals(WordErrors("Chỉ dùng hiragana hoặc katakana", "Nhập nghĩa", "Bài từ 1 tới 50"), vm.state.value.formErrors)
        assertEquals(0, repo.addCalls)
    }

    @Test fun them_serverBaoTrung_hienCauCuaServer_khongXoaO() = runTest(main.dispatcher) {
        val vm = PersonalWordsViewModel(repo, auth)
        advanceUntilIdle()
        repo.failNext = Exception("Từ này đã có trong sổ")
        var cleared = false
        vm.add("わたし", "tôi", "1") { cleared = true }
        advanceUntilIdle()
        assertEquals("Từ này đã có trong sổ", vm.state.value.serverError)
        assertEquals(false, cleared)
    }

    @Test fun xoaLoi_traLaiDong() = runTest(main.dispatcher) {
        val vm = PersonalWordsViewModel(repo, auth)
        advanceUntilIdle()
        repo.failNext = IOException("offline")
        vm.delete(PersonalWord(1, "わたし", "tôi", 1))
        assertEquals(listOf("たべます"), data(vm)) // lạc quan: mất ngay
        advanceUntilIdle()
        assertEquals(listOf("わたし", "たべます"), data(vm)) // lỗi: trả lại
        assertTrue(vm.state.value.message!!.isNotBlank())
    }
}
