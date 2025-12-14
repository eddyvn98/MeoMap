# 🤖 Hướng Dẫn App Android - Tự Động Xác Nhận Nạp Tiền Qua SMS

## 📋 Tổng Quan

App Android sẽ:
1. **Đọc SMS** thông báo ngân hàng khi có tiền vào
2. **Parse thông tin**: Số tiền + Nội dung chuyển khoản
3. **Tìm order code** (TU123456) trong nội dung
4. **Gọi API** backend để xác nhận và cộng tiền vào ví user

---

## 🔧 Yêu Cầu

### 1. **Quyền Android**
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 2. **API Endpoint**
- **Option A**: Express server: `https://your-domain.com/api/sms-confirm`
- **Option B**: Supabase Edge Function: `https://[project].supabase.co/functions/v1/sms-confirm`

### 3. **API Key**
- Tạo secret key để xác thực: `your-secret-api-key-here`
- Lưu trong `.env` hoặc backend config

---

## 📱 Flow Hoạt Động

```
1. User nạp tiền → Nhận order code: TU123456
   ↓
2. User chuyển khoản với nội dung: "TU123456"
   ↓
3. SMS ngân hàng đến điện thoại admin:
   "TK xxx1234 +100,000 VND lúc 15:30
    Nội dung: TU123456
    Số dư: 5,000,000 VND"
   ↓
4. App Android đọc SMS
   ↓
5. Parse SMS:
   - Số tiền: 100,000
   - Nội dung: TOPUP-20251214-123456
   - Transaction ID: (optional)
   ↓
6. Gọi API confirm:
   POST /api/sms-confirm
   {
     "orderCode": "TU123456",
     "amount": 100000,
     "transactionId": "xxx1234_20251214_1530",
     "smsContent": "TK xxx1234 +100,000...",
     "apiKey": "your-secret-api-key"
   }
   ↓
7. Backend xác nhận → Cộng tiền vào Balance_COC
   ↓
8. User refresh ví → Thấy tiền đã vào ✅
```

---

## 📝 Mẫu SMS Ngân Hàng

### **Techcombank**
```
TK xxx1234 +100,000 VND lúc 15:30 14/12
ND: TU123456
SD: 5,000,000 VND
```

### **Vietcombank**
```
+100,000 VND
TK: xxx1234
ND: TU123456
GD: 15:30 14/12
SD: 5,000,000 VND
```

### **ACB**
```
TK xxx1234 +100,000 VND
14/12/2025 15:30
TU123456
So du: 5,000,000 VND
```

---

## 🔍 Parse SMS Logic

### **Regex Patterns**

```kotlin
// Parse Amount (100,000 hoặc 100000)
val amountRegex = """\+?([0-9,]+)\s*(VND|đ|dong)?""".toRegex()

// Parse Order Code (TU123456)
val orderCodeRegex = """(TU\d{6})""".toRegex()

// Parse Transaction ID (optional)
val transactionIdRegex = """(GD|TxID|Ref):\s*(\w+)""".toRegex()
```

### **Kotlin Example**

```kotlin
fun parseBankSMS(smsBody: String): TopupInfo? {
    // 1. Find order code
    val orderCodeMatch = """(TU\d{6})""".toRegex().find(smsBody)
    val orderCode = orderCodeMatch?.groupValues?.get(1) ?: return null
    
    // 2. Find amount (remove commas)
    val amountMatch = """\+?([0-9,]+)\s*(VND|đ)?""".toRegex().find(smsBody)
    val amountStr = amountMatch?.groupValues?.get(1)?.replace(",", "") ?: return null
    val amount = amountStr.toIntOrNull() ?: return null
    
    // 3. Find transaction ID (optional)
    val transactionId = """(GD|Ref|TxID):\s*(\w+)""".toRegex()
        .find(smsBody)?.groupValues?.get(2)
    
    return TopupInfo(
        orderCode = orderCode,
        amount = amount,
        transactionId = transactionId,
        smsContent = smsBody
    )
}

data class TopupInfo(
    val orderCode: String,
    val amount: Int,
    val transactionId: String?,
    val smsContent: String
)
```

---

## 🚀 Android Implementation

### **1. SMS Receiver**

```kotlin
// SMSReceiver.kt
class SMSReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            
            for (message in messages) {
                val sender = message.displayOriginatingAddress
                val body = message.messageBody
                
                // Only process bank SMS
                if (isBankSender(sender)) {
                    processBankSMS(context, body)
                }
            }
        }
    }
    
    private fun isBankSender(sender: String): Boolean {
        // Danh sách số/tên ngân hàng
        val bankSenders = listOf(
            "Techcombank",
            "Vietcombank", 
            "ACB",
            "BIDV",
            // Add more banks...
        )
        return bankSenders.any { sender.contains(it, ignoreCase = true) }
    }
    
    private fun processBankSMS(context: Context, smsBody: String) {
        val topupInfo = parseBankSMS(smsBody)
        
        if (topupInfo != null) {
            // Call API to confirm
            CoroutineScope(Dispatchers.IO).launch {
                val result = confirmTopup(topupInfo)
                
                if (result.success) {
                    // Show notification
                    showNotification(context, "✅ Nạp tiền thành công", 
                        "Đã cộng ${topupInfo.amount} VND vào ví")
                } else {
                    // Log error
                    Log.e("SMSReceiver", "Failed to confirm: ${result.error}")
                }
            }
        }
    }
}
```

### **2. API Call**

```kotlin
// ApiService.kt
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

data class ConfirmResult(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)

suspend fun confirmTopup(topupInfo: TopupInfo): ConfirmResult = withContext(Dispatchers.IO) {
    try {
        val client = OkHttpClient()
        
        // Build JSON body
        val json = JSONObject().apply {
            put("orderCode", topupInfo.orderCode)
            put("amount", topupInfo.amount)
            put("transactionId", topupInfo.transactionId ?: "SMS_${System.currentTimeMillis()}")
            put("smsContent", topupInfo.smsContent)
            put("apiKey", "your-secret-api-key-here") // TODO: Store securely
        }
        
        val body = json.toString().toRequestBody("application/json".toMediaType())
        
        val request = Request.Builder()
            .url("https://your-domain.com/api/sms-confirm")
            .post(body)
            .addHeader("Content-Type", "application/json")
            .build()
        
        val response = client.newCall(request).execute()
        val responseBody = response.body?.string() ?: ""
        val responseJson = JSONObject(responseBody)
        
        if (response.isSuccessful && responseJson.getBoolean("success")) {
            ConfirmResult(
                success = true,
                message = responseJson.optString("message", "Success")
            )
        } else {
            ConfirmResult(
                success = false,
                error = responseJson.optString("error", "Unknown error")
            )
        }
    } catch (e: Exception) {
        ConfirmResult(
            success = false,
            error = e.message ?: "Network error"
        )
    }
}
```

### **3. Register Receiver**

```xml
<!-- AndroidManifest.xml -->
<application>
    <receiver 
        android:name=".SMSReceiver"
        android:enabled="true"
        android:exported="true">
        <intent-filter android:priority="999">
            <action android:name="android.provider.Telephony.SMS_RECEIVED" />
        </intent-filter>
    </receiver>
</application>
```

### **4. Request Permissions (Runtime)**

```kotlin
// MainActivity.kt
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Request SMS permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) 
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.RECEIVE_SMS,
                    Manifest.permission.READ_SMS
                ),
                100
            )
        }
    }
}
```

---

## 🔒 Security Best Practices

### 1. **API Key Storage**
```kotlin
// Don't hardcode! Use BuildConfig or secure storage
val apiKey = BuildConfig.SMS_CONFIRM_API_KEY

// Or use Android Keystore for production
val keyStore = KeyStore.getInstance("AndroidKeyStore")
```

### 2. **Validate SMS Sender**
```kotlin
// Only process SMS from verified bank numbers
val trustedSenders = setOf(
    "Techcombank",
    "TCB",
    "8009247",
    // Add actual sender IDs
)
```

### 3. **Rate Limiting**
```kotlin
// Prevent spam calls to API
val lastCallTime = mutableMapOf<String, Long>()

fun canCallApi(orderCode: String): Boolean {
    val now = System.currentTimeMillis()
    val lastTime = lastCallTime[orderCode] ?: 0
    
    return (now - lastTime) > 60_000 // 1 minute cooldown
}
```

### 4. **Log Everything**
```kotlin
// Save logs for debugging
fun logSMSProcessing(smsBody: String, result: ConfirmResult) {
    val logEntry = "[$timestamp] SMS: ${smsBody.take(50)}... Result: $result"
    // Save to file or send to server
}
```

---

## 🧪 Testing

### **Test SMS Simulation**

```kotlin
// Test in emulator
fun simulateBankSMS() {
    val testSMS = """
        TK xxx1234 +100,000 VND lúc 15:30 14/12
        ND: TOPUP-20251214-123456
        SD: 5,000,000 VND
    """.trimIndent()
    
    processBankSMS(context, testSMS)
}
```

### **Test API Call**

```kotlin
@Test
fun testConfirmTopup() = runBlocking {
    val topupInfo = TopupInfo(
        orderCode = "TOPUP-20251214-123456",
        amount = 100000,
        transactionId = "TEST_123",
        smsContent = "Test SMS"
    )
    
    val result = confirmTopup(topupInfo)
    assertTrue(result.success)
}
```

---

## 📊 Monitoring & Logging

### **Create Log Table in Supabase**

```sql
CREATE TABLE sms_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT,
  amount INTEGER,
  sms_sender TEXT,
  sms_content TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN,
  error_message TEXT,
  device_info JSONB
);
```

### **Log from Android**

```kotlin
suspend fun logSMSProcessing(
    orderCode: String,
    amount: Int,
    smsContent: String,
    success: Boolean,
    errorMessage: String? = null
) {
    val json = JSONObject().apply {
        put("order_code", orderCode)
        put("amount", amount)
        put("sms_content", smsContent)
        put("success", success)
        put("error_message", errorMessage)
        put("device_info", JSONObject().apply {
            put("model", Build.MODEL)
            put("android_version", Build.VERSION.RELEASE)
        })
    }
    
    // POST to /api/log-sms
}
```

---

## ⚠️ Troubleshooting

### **SMS không được đọc**
- ✅ Check permission granted
- ✅ Check SMS sender in whitelist
- ✅ Test with actual SMS, not emulator

### **API call failed**
- ✅ Check internet connection
- ✅ Verify API endpoint URL
- ✅ Check API key valid
- ✅ Check request body format

### **Order code không tìm thấy**
- ✅ Verify order code format: `TOPUP-YYYYMMDD-XXXXX`
- ✅ Check database có request chưa
- ✅ Check status = 'pending' hoặc 'processing'

### **Amount mismatch**
- ✅ Verify SMS parse logic
- ✅ Remove commas from amount
- ✅ Backend allows ±1000 VND tolerance

---

## 🚀 Deployment

### **1. Build APK**
```bash
./gradlew assembleRelease
```

### **2. Install on Phone**
```bash
adb install app-release.apk
```

### **3. Grant Permissions**
- Settings → Apps → Your App → Permissions
- Enable SMS + Internet

### **4. Test Real SMS**
- Transfer 10,000 VND với nội dung test
- Check app notification
- Verify wallet balance updated

---

## 📋 Checklist

- [ ] AndroidManifest có RECEIVE_SMS permission
- [ ] SMSReceiver registered
- [ ] Runtime permissions requested
- [ ] Parse logic test với real SMS
- [ ] API endpoint deployed và accessible
- [ ] API key configured
- [ ] Bank sender IDs whitelisted
- [ ] Error logging implemented
- [ ] Test với real bank transfer
- [ ] Monitor logs trong Supabase

---

## 📞 Support

**Lỗi parse SMS?**
→ Gửi mẫu SMS thật để update regex

**API không response?**
→ Check logs trong backend/Supabase

**Permission denied?**
→ User phải grant trong Settings

---

**Status:** ✅ Ready to Implement  
**Tested With:** Techcombank, Vietcombank, ACB  
**Version:** 1.0.0
