# 🔧 Troubleshooting Guide

## ปัญหา: Bot Test ใช้ไม่ได้ / Autocomplete ไม่ทำงาน

### อาการ
- เมื่อพิมพ์ `/build champion` ไม่มี autocomplete แสดง
- แสดงข้อความ "ไม่พบตัวเลือกที่ตรงกับคำค้นหา"

### สาเหตุที่เป็นไปได้

#### 1. Bot Test ไม่ได้ Register Commands
**ตรวจสอบ:**
- Bot test ต้องอยู่ใน test server ที่ระบุใน `DEV_GUILD_IDS`
- Bot test ต้องมี permission `applications.commands` ใน test server
- รอสักครู่หลัง bot online (commands อาจจะยัง register ไม่เสร็จ)

**วิธีแก้:**
1. ตรวจสอบว่า bot test อยู่ใน test server หรือไม่
2. ไปที่ Server Settings → Integrations → Bot Test
3. ตรวจสอบว่า "Use Slash Commands" เปิดอยู่
4. รอ 1-2 นาทีหลัง bot online แล้วลองใหม่

#### 2. Champion Names ยังไม่ถูกโหลด
**ตรวจสอบ:**
- ดู console logs ว่าเห็น `[DDragon] Cached X champion names` หรือไม่
- ดู console logs ว่าเห็น `[Build Autocomplete]` logs หรือไม่

**วิธีแก้:**
1. รอให้ bot online และ pre-warm cache เสร็จก่อน
2. ตรวจสอบ internet connection (ต้อง fetch จาก Data Dragon API)
3. ลองพิมพ์ชื่อ champion ตรงๆ แทน autocomplete

#### 3. Environment Variables ไม่ถูกต้อง
**ตรวจสอบ:**
- ไฟล์ `.env` มี `TOKEN_TEST` หรือ `TOKEN` ตั้งไว้หรือไม่
- `DEV_GUILD_IDS` ตั้งไว้หรือไม่
- `DEV_MODE=true` หรือ `NODE_ENV=development` ตั้งไว้หรือไม่

**วิธีแก้:**
```env
TOKEN_TEST=your_test_bot_token
DEV_GUILD_IDS=your_test_server_id
DEV_MODE=true
```

#### 4. Bot Test ใช้ Token ผิด
**ตรวจสอบ:**
- ดู console logs ว่าใช้ `TOKEN_TEST` หรือไม่
- ตรวจสอบว่า token ถูกต้อง (ไม่ใช่ production token)

**วิธีแก้:**
1. ตรวจสอบ console logs เมื่อ bot เริ่มต้น
2. ควรเห็น: `[Bot] 🔑 Using TOKEN_TEST for development mode`
3. ถ้าไม่เห็น แสดงว่า token ไม่ถูกต้อง

### วิธี Debug

#### 1. ตรวจสอบ Console Logs
เมื่อรัน bot ควรเห็น:
```
[Bot] 🚀 Starting Bot...
[Bot] 📍 Host: Localhost (Development)
[Bot] 🔧 Environment: DEVELOPMENT
[Bot] 🏠 Running on: LOCALHOST
[Bot] 🔑 Using TOKEN_TEST for development mode
[Bot] Dev Guild IDs: 805871254657695824
[System] Pre-warming DDragon cache...
[DDragon] Cached 169 champion names.
[Bot] ✅ YourBot#1234 is online!
```

#### 2. ตรวจสอบ Autocomplete Logs
เมื่อพิมพ์ใน Discord ควรเห็น:
```
[Build Autocomplete] Query: "yas"
[Build Autocomplete] Found 169 champions
[Build Autocomplete] Filtered to 1 matches
[Build Autocomplete] Responded with 1 choices
```

#### 3. ทดสอบ Autocomplete
1. เปิด Discord
2. พิมพ์ `/build` 
3. พิมพ์ในช่อง champion (เช่น "yas")
4. ควรเห็น autocomplete แสดง

### วิธีแก้ไขแบบ Step-by-Step

1. **ตรวจสอบ .env file:**
   ```env
   TOKEN_TEST=your_test_bot_token_here
   DEV_GUILD_IDS=805871254657695824
   DEV_MODE=true
   ```

2. **Restart bot:**
   ```bash
   npm run dev
   ```

3. **ตรวจสอบ console logs:**
   - ดูว่า bot online หรือไม่
   - ดูว่า champion names ถูก cache หรือไม่
   - ดูว่าใช้ TOKEN_TEST หรือไม่

4. **รอ 1-2 นาที** หลัง bot online

5. **ลองใช้ command ใน Discord:**
   - พิมพ์ `/build`
   - พิมพ์ชื่อ champion (เช่น "yasuo")
   - ดูว่า autocomplete แสดงหรือไม่

6. **ถ้ายังไม่ได้:**
   - ตรวจสอบว่า bot test อยู่ใน test server หรือไม่
   - ตรวจสอบว่า bot test มี permission หรือไม่
   - ลอง kick และ invite bot test ใหม่

### คำสั่งสำหรับ Debug

```bash
# ตรวจสอบ environment variables
npm run dev

# ดู logs ทั้งหมด
# ควรเห็น logs เกี่ยวกับ:
# - Bot environment
# - Token source
# - Champion names cache
# - Autocomplete queries
```

### สิ่งที่ควรตรวจสอบ

- ✅ Bot test online และอยู่ใน test server
- ✅ Console แสดง "Using TOKEN_TEST"
- ✅ Console แสดง "Cached X champion names"
- ✅ Bot test มี permission ใน test server
- ✅ DEV_GUILD_IDS ตั้งไว้ถูกต้อง
- ✅ รอ 1-2 นาทีหลัง bot online
