# R8 thu gọn và đổi tên class/field ở bản release. Thư viện dùng reflection thì phải giữ lại.

# ── Gson ─────────────────────────────────────────────────────────────────────
# Gson đọc tên field bằng reflection. R8 đổi tên field là JSON không khớp nữa và mọi field ra null,
# không có lỗi nào báo ra. Giữ field của mọi class được (de)serialize:
#   - data.remote: DTO của Retrofit
#   - domain.entity: lưu dạng JSON trong Room (ExamQuestion, ExamResult, SrsCard trong sync_queue)
-keep class com.edu.nihongo.data.remote.** { <fields>; <init>(...); }
-keep class com.edu.nihongo.domain.entity.** { <fields>; <init>(...); }
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
# TypeToken<List<...>> cần giữ thông tin generic
-keepattributes Signature
-keep,allowobfuscation,allowshrinking class com.google.gson.reflect.TypeToken
-keep,allowobfuscation,allowshrinking class * extends com.google.gson.reflect.TypeToken

# ── Retrofit ─────────────────────────────────────────────────────────────────
# Retrofit đọc annotation và kiểu trả về generic của interface lúc chạy
-keepattributes *Annotation*, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
# suspend fun: kiểu trả về nằm trong tham số Continuation<T>
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation

# ── Crash report dễ đọc ──────────────────────────────────────────────────────
# Giữ số dòng; tên class đổi thì dịch ngược bằng app/build/outputs/mapping/release/mapping.txt
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
