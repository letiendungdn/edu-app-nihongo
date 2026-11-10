package com.edu.nihongo.utils

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProcessInfoTest {
    @Test
    fun mainProcess_hasExactlyThePackageName() {
        assertTrue(isMainProcess("com.edu.nihongo", "com.edu.nihongo"))
    }

    @Test
    fun secondaryProcess_hasColonSuffix() {
        assertFalse(isMainProcess("com.edu.nihongo:ipc", "com.edu.nihongo"))
    }
}
