plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
    id("androidx.baselineprofile")
}

android {
    namespace = "com.edu.nihongo"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.edu.nihongo"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // Emulator → máy host: 10.0.2.2 (KHÔNG dùng localhost — đó là chính emulator).
        // API qua nginx :8080 → api-gateway (cùng cổng với Keycloak).
        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"http://10.0.2.2:8080/api/\"",
        )
        buildConfigField(
            "String",
            "KEYCLOAK_URL",
            "\"http://10.0.2.2:8080\"",
        )
        buildConfigField("String", "KEYCLOAK_REALM", "\"edu-app\"")
        buildConfigField("String", "KEYCLOAK_CLIENT_ID", "\"nihongo-mobile\"")
        buildConfigField(
            "String",
            "KEYCLOAK_REDIRECT_URI",
            "\"com.edu.nihongo:/oauth2redirect\"",
        )

        // Required by net.openid:appauth (RedirectUriReceiverActivity scheme)
        manifestPlaceholders["appAuthRedirectScheme"] = "com.edu.nihongo"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // MigrationTestHelper đọc file schema JSON mà Room export ra thư mục schemas/
    sourceSets {
        getByName("androidTest").assets.srcDir("$projectDir/schemas")
    }

    buildTypes {
        release {
            // R8: bỏ code không dùng, đổi tên ngắn, tối ưu. Quy tắc giữ lại ở proguard-rules.pro
            isMinifyEnabled = true
            isShrinkResources = true
            // Chỉ để cài thử bản release trên máy dev/CI. Phát hành thật: ký bằng keystore riêng
            // (signingConfigs + secret trong CI), không bao giờ bằng debug key.
            signingConfig = signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

// Room ghi schema mỗi version vào đây (commit vào git) để viết và test migration
ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

dependencies {
    val roomVersion = "2.6.1"
    val cameraxVersion = "1.4.1"
    val lifecycleVersion = "2.8.7"
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")

    implementation("androidx.core:core-ktx:1.15.0")
    // Cài Baseline Profile lúc cài app (bản không qua Play cũng được biên dịch trước)
    implementation("androidx.profileinstaller:profileinstaller:1.4.1")
    baselineProfile(project(":baselineprofile"))
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:$lifecycleVersion")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:$lifecycleVersion")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:$lifecycleVersion")
    implementation("androidx.navigation:navigation-compose:2.8.4")

    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("com.google.dagger:hilt-android:2.52")
    ksp("com.google.dagger:hilt-android-compiler:2.52")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Gửi hàng đợi ôn tập lên server khi có mạng, kể cả sau khi đóng app
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("androidx.hilt:hilt-work:1.2.0")
    ksp("androidx.hilt:hilt-compiler:1.2.0")

    // Widget màn hình chính viết bằng API kiểu Compose
    implementation("androidx.glance:glance-appwidget:1.1.1")
    implementation("androidx.glance:glance-material3:1.1.1")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    // Server-Sent Events cho chat cộng đồng realtime
    implementation("com.squareup.okhttp3:okhttp-sse:4.12.0")

    implementation("net.openid:appauth:0.11.1")
    implementation("androidx.browser:browser:1.8.0")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    implementation("androidx.camera:camera-core:$cameraxVersion")
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")

    implementation("com.google.mlkit:text-recognition-japanese:16.0.1")

    implementation("com.google.accompanist:accompanist-permissions:0.36.0")

    val liveKitVersion = "2.26.0"
    val liveKitComponentsVersion = "2.4.0"
    implementation("io.livekit:livekit-android:$liveKitVersion")
    implementation("io.livekit:livekit-android-compose-components:$liveKitComponentsVersion")

    testImplementation("junit:junit:4.13.2")
    // runTest, StandardTestDispatcher, Dispatchers.setMain cho test ViewModel
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    // Server HTTP giả để test Authenticator / CookieJar của OkHttp
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")

    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.room:room-testing:$roomVersion")
    androidTestImplementation("androidx.work:work-testing:2.9.1")
    androidTestImplementation("androidx.glance:glance-appwidget-testing:1.1.1")
    androidTestImplementation(composeBom)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
