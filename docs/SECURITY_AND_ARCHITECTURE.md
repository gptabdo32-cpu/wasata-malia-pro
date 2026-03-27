# معايير الأمان والمعمارية التقنية لنظام الضمان الذكي

وثيقة شاملة توضح معايير الأمان والتقنيات المستخدمة في تطوير ميزة "الضمان الذكي" (Smart Escrow) في منصة وثقلي.

## 1. معايير الأمان (Security Standards)

### 1.1 التشفير (Encryption)

يستخدم النظام معيار **AES-256-GCM** لتشفير جميع البيانات الحساسة قبل تخزينها في قاعدة البيانات. هذا المعيار يوفر تشفيراً قوياً مع التحقق من سلامة البيانات (Authenticated Encryption).

**البيانات المشفرة:**
- إحداثيات GPS (Latitude/Longitude)
- قراءات درجات الحرارة والرطوبة
- معلومات الموقع الحساسة
- بيانات الأجهزة الشخصية

**مثال التطبيق:**
```typescript
import { encryptData, decryptData } from "../_core/encryption";

const sensitiveData = JSON.stringify({ latitude: 32.88, longitude: 13.19 });
const encrypted = encryptData(sensitiveData);
// Store encrypted in database
const decrypted = decryptData(encrypted);
```

### 1.2 التحقق من الهوية (Authentication & Authorization)

**JWT (JSON Web Tokens):**
- توليد رموز JWT آمنة مع صلاحية محدودة (24 ساعة افتراضياً)
- التحقق من صحة الرموز على كل طلب
- دعم التحديث التلقائي للرموز (Token Refresh)

**توثيق أجهزة IoT:**
- كل جهاز يحصل على **Secure Token** فريد عند التسجيل
- التحقق من الرموز قبل قبول أي بيانات من الجهاز
- تسجيل محاولات الوصول غير المصرح بها

### 1.3 حماية من الثغرات الشائعة (OWASP Top 10)

| الثغرة | الحماية المطبقة |
|-------|-----------------|
| Injection | استخدام Parameterized Queries و MongoDB Sanitization |
| Broken Authentication | JWT مع Secure Tokens و Rate Limiting على نقاط الدخول |
| Sensitive Data Exposure | تشفير AES-256-GCM و HTTPS إجباري |
| XML External Entities (XXE) | تعطيل معالجة XML الخارجية |
| Broken Access Control | التحقق من الصلاحيات على كل عملية |
| Security Misconfiguration | Helmet.js للـ Security Headers |
| XSS (Cross-Site Scripting) | XSS-Clean و Content Security Policy |
| Insecure Deserialization | Validation على جميع المدخلات |
| Using Components with Known Vulnerabilities | تحديث منتظم للمكتبات |
| Insufficient Logging & Monitoring | Audit Logging شامل |

### 1.4 معدل الطلبات (Rate Limiting)

**حدود مختلفة حسب نوع الطلب:**
- **عام:** 100 طلب لكل 15 دقيقة
- **المصادقة:** 5 محاولات لكل 15 دقيقة
- **أجهزة IoT:** 100 طلب لكل دقيقة

### 1.5 رؤوس الأمان (Security Headers)

تطبيق Helmet.js مع الإعدادات التالية:
- **Content-Security-Policy:** تقييد مصادر المحتوى
- **HSTS:** فرض HTTPS لمدة سنة واحدة
- **X-Frame-Options:** منع Clickjacking
- **X-Content-Type-Options:** منع MIME Sniffing

## 2. المعمارية التقنية (Technical Architecture)

### 2.1 طبقات النظام

```
┌─────────────────────────────────────┐
│   Frontend (React + TypeScript)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   tRPC API Layer (Type-Safe)        │
│   - Protected Procedures            │
│   - Public Procedures               │
│   - Middleware Validation           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Business Logic Services           │
│   - Smart Escrow Router             │
│   - Milestone Verification          │
│   - IoT Integration                 │
│   - Rules Engine                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Data Access Layer (Drizzle ORM)   │
│   - Database Operations             │
│   - Query Optimization              │
│   - Transaction Management          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Database (MySQL/TiDB)             │
│   - escrowMilestones                │
│   - iotDevices                      │
│   - blockchainLogs                  │
│   - milestoneSignatures             │
└─────────────────────────────────────┘
```

### 2.2 تدفق العقد الذكي (Smart Contract Flow)

```
1. إنشاء العقد (Create Escrow)
   ↓
2. إضافة المراحل (Add Milestones)
   ↓
3. تسجيل أجهزة IoT (Register Devices)
   ↓
4. جمع بيانات IoT (Collect Data)
   ↓
5. تقييم القواعس (Evaluate Rules)
   ↓
6. التحقق من المراحل (Verify Milestones)
   ↓
7. توقيع رقمي (Digital Signatures)
   ↓
8. تحرير الأموال (Release Funds)
   ↓
9. تسجيل على البلوك تشين (Log to Blockchain)
```

### 2.3 قاعدة البيانات (Database Schema)

**جدول escrowMilestones:**
- معرف المرحلة وحالتها
- المبلغ والموعد النهائي
- نوع التحقق (GitHub, URL, API, Manual)
- بيانات التحقق المشفرة

**جدول iotDevices:**
- معرف الجهاز والنوع
- Secure Token للمصادقة
- الإعدادات والحدود (درجات حرارة، موقع، إلخ)
- آخر قراءة مشفرة

**جدول blockchainLogs:**
- معرف المعاملة على البلوك تشين
- نوع الإجراء (تمويل، إنجاز، تحرير)
- البيانات الوصفية

**جدول milestoneSignatures:**
- التوقيع الرقمي للمستخدم
- وقت التوقيع
- معرف المرحلة

## 3. خدمات التحقق الآلي (Automated Verification Services)

### 3.1 التحقق من GitHub

**أنواع التحقق المدعومة:**
- **GitHub Commit:** التحقق من وجود commit محدد
- **GitHub PR:** التحقق من دمج Pull Request
- **GitHub Issue:** التحقق من إغلاق Issue

**مثال:**
```typescript
const verification = await milestoneVerificationService.verify(
  "github_pr",
  { repo: "owner/repo", prNumber: 123 }
);
```

### 3.2 التحقق من الـ URL

**الميزات:**
- التحقق من إمكانية الوصول للـ URL
- التحقق من رمز الحالة (Status Code)
- التحقق من نوع المحتوى

### 3.3 التحقق من API الخارجية

**الميزات:**
- استدعاء API خارجية
- التحقق من الاستجابة
- دعم POST و GET

## 4. محرك القواعس (Rules Engine)

يسمح محرك القواعس بإنشاء قواعس معقدة لتحرير الأموال تلقائياً.

**أمثلة على القواعس:**

**قاعدة درجة الحرارة:**
```typescript
const tempRule = RulesEngine.createTemperatureRule(15, 25);
// تحرير الأموال إذا كانت درجة الحرارة بين 15-25 درجة
```

**قاعدة الموقع الجغرافي (Geofencing):**
```typescript
const geofenceRule = RulesEngine.createGeofenceRule(32.88, 13.19, 500);
// تحرير الأموال إذا وصل المنتج لموقع محدد (500 متر)
```

**قاعدة معقدة:**
```typescript
const complexRule = RulesEngine.createComplexRule(
  [
    { field: "temperature", operator: "gte", value: 15 },
    { field: "temperature", operator: "lte", value: 25 },
    { field: "location", operator: "eq", value: targetLocation }
  ],
  "AND"
);
```

## 5. تكامل IoT (IoT Integration)

### 5.1 دورة حياة جهاز IoT

```
1. التسجيل (Registration)
   - إنشاء معرف فريد
   - توليد Secure Token
   - تخزين الإعدادات

2. المصادقة (Authentication)
   - التحقق من Secure Token
   - تسجيل محاولات الوصول

3. جمع البيانات (Data Collection)
   - استقبال القراءات
   - تشفير البيانات الحساسة
   - تخزين في قاعدة البيانات

4. تقييم القواعس (Rule Evaluation)
   - تطبيق محرك القواعس
   - اكتشاف الشذوذ
   - إنشاء التنبيهات

5. الإجراء التلقائي (Automatic Action)
   - تحرير الأموال
   - إرسال إشعارات
   - تحديث الحالة
```

### 5.2 أنواع الأجهزة المدعومة

| نوع الجهاز | الاستخدام | البيانات |
|-----------|----------|---------|
| GPS Tracker | تتبع الموقع | Latitude, Longitude, Accuracy |
| Temperature Sensor | مراقبة درجة الحرارة | Temperature, Humidity |
| Humidity Sensor | مراقبة الرطوبة | Humidity, Dew Point |
| Impact Sensor | كشف الصدمات | Impact Force (G-force) |
| Smart Lock | قفل ذكي | Lock Status, Battery |

## 6. التوقيعات الرقمية (Digital Signatures)

**الهدف:** ضمان عدم الإنكار (Non-repudiation) وتوثيق إنجاز المراحل.

**الآلية:**
1. كل طرف (مشتري/بائع) يوقع على إنجاز المرحلة
2. التوقيع يُخزن في جدول `milestoneSignatures`
3. عند استقبال التوقيعات المطلوبة، تُحرر الأموال تلقائياً

**مثال:**
```typescript
await smartEscrowRouter.signMilestone({
  milestoneId: 1,
  signature: "0x..." // Digital signature
});
```

## 7. سجل البلوك تشين (Blockchain Logging)

**الهدف:** توفير سجل غير قابل للتغيير لجميع المعاملات.

**المعاملات المسجلة:**
- إنشاء العقد
- إضافة المراحل
- إنجاز المراحل
- تحرير الأموال
- حل النزاعات

**الشبكات المدعومة:**
- Polygon Mumbai (Testnet)
- Polygon Mainnet
- Ethereum (اختياري)

## 8. الامتثال والخصوصية (Compliance & Privacy)

### 8.1 GDPR Compliance

- تشفير البيانات الشخصية
- حق الوصول والحذف
- سياسات الاحتفاظ بالبيانات

### 8.2 Data Retention Policies

| نوع البيانات | فترة الاحتفاظ |
|------------|------------|
| السجلات | 90 يوم |
| المعاملات | سنة واحدة |
| البيانات الشخصية | سنتان |
| سجلات التدقيق | 7 سنوات |

## 9. الاختبار والمراقبة (Testing & Monitoring)

### 9.1 اختبارات الأمان

- اختبارات الاختراق (Penetration Testing)
- تحليل الثغرات (Vulnerability Scanning)
- اختبارات الامتثال

### 9.2 المراقبة المستمرة

- تسجيل جميع الأحداث الأمنية
- تنبيهات فورية للأحداث الحرجة
- تقارير دورية عن الأمان

## 10. الخطوات التالية والتحسينات المستقبلية

- تطبيق Multi-Signature للعقود الكبيرة
- دعم العملات المشفرة المتعددة
- تطبيق Machine Learning لكشف الاحتيال
- توسيع دعم أجهزة IoT
- تطبيق Zero-Knowledge Proofs للخصوصية المحسنة

---

**آخر تحديث:** مارس 2026
**الإصدار:** 1.0
**الحالة:** جاهز للإنتاج
