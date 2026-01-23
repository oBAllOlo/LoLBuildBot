# LoLBuildBot 🏆

Discord Bot สำหรับแนะนำวิธีการออกของ (Build) และข้อมูลต่าง ๆ ในเกม League of Legends

## คุณสมบัติ (Features)

- **/build [champion] [role]** - ค้นหาการออกของ (Item Build), รูน (Runes) และเวท (Spells) จากสถิติผู้เล่นระดับสูง (Mobalytics)
- **/counter [champion]** - ดูแชมเปี้ยนที่ชนะทาง หรือแชมเปี้ยนที่แพ้ทางตัวที่ระบุ
- **/tier-list** - แสดง Tier List ของ Meta ปัจจุบัน (ทุกตำแหน่ง) พร้อมรูปภาพ
- **/ping** - ตรวจสอบความเร็วในการตอบสนองของบอท
- **Multi-Server Support** - รองรับการอัปเดตคำสั่งทันใจในหลาย Server พร้อมกัน
- **Keep-Alive Server** - ระบบป้องกันบอทหลับ (ทำงานร่วมกับ UptimeRobot)
- **Auto-Update Patch** - อัพเดทแพทช์เกมอัตโนมัติทุก 15 นาที
- **Smart Autocomplete** - แสดงรายชื่อ champions ทั้งหมดเรียงตามตัวอักษร
- **Environment Detection** - ตรวจสอบและแยก localhost กับ production อัตโนมัติ
- **Error Handling** - จัดการ error 404/403 และแสดงข้อความที่ชัดเจน

## การตั้งค่า (Configuration)

### สำหรับการพัฒนาเครื่องส่วนตัว (Local Development):

⚠️ **สำคัญ: เพื่อป้องกันไม่ให้บอททดสอบชนกับ production bot**

1. **สร้างบอททดสอบแยกจาก production:**
   - ไปที่ [Discord Developer Portal](https://discord.com/developers/applications)
   - สร้าง Application ใหม่สำหรับทดสอบ (หรือใช้บอทที่มีอยู่แล้ว)
   - Copy Bot Token มาใช้

2. **สร้างไฟล์ `.env` ไว้ในโฟลเดอร์หลัก (Root):**

**วิธีที่ 1: ใช้ TOKEN เดียว**

```env
TOKEN=your_test_bot_token_here
DEV_GUILD_IDS=123456789012345678
NODE_ENV=development
PORT=8080
```

**วิธีที่ 2: แยก TOKEN_PROD และ TOKEN_TEST (แนะนำ)**

```env
# TOKEN_PROD จะใช้เมื่อ NODE_ENV=production
TOKEN_PROD=your_production_bot_token_here

# TOKEN_TEST จะใช้เมื่อ NODE_ENV=development
TOKEN_TEST=your_test_bot_token_here

# ใส่ Guild ID ของ test server เท่านั้น
# หา Guild ID: เปิด Developer Mode ใน Discord → Right-click server → Copy ID
DEV_GUILD_IDS=123456789012345678

# ตั้งเป็น development เพื่อจำกัดบอทให้ทำงานเฉพาะใน dev guilds
# รองรับทั้ง NODE_ENV และ DEV_MODE
NODE_ENV=development
# หรือ
DEV_MODE=true

# Port สำหรับ Keep-Alive server (optional)
PORT=8080
```

**หมายเหตุ:** ถ้าตั้งทั้ง `TOKEN`, `TOKEN_PROD`, และ `TOKEN_TEST` ไว้ ระบบจะใช้ `TOKEN` ก่อน

**ทำไมต้องตั้งค่าแบบนี้?**

- `DEV_GUILD_IDS`: จำกัดให้คำสั่งถูก register เฉพาะใน test server เท่านั้น (ไม่ไปชนกับ production)
- `NODE_ENV=development` หรือ `DEV_MODE=true`: บอทจะตรวจสอบและตอบสนองเฉพาะใน dev guilds เท่านั้น
- **ใช้บอทแยก**: Production bot ทำงานบน Render, Test bot ทำงานบน localhost → ไม่ชนกัน
- **Token Auto-Selection**: ระบบจะเลือกใช้ `TOKEN_TEST` อัตโนมัติเมื่อ `NODE_ENV=development`

_หมายเหตุ: `DEV_GUILD_IDS` สามารถใส่ได้หลาย Server โดยคั่นด้วยเครื่องหมายจุลภาค (comma)_

### สำหรับ Production (Render/Replit):

**บน Render:**

- ตั้ง Environment Variables ใน Render Dashboard:
  - `TOKEN` หรือ `TOKEN_PROD` = token ของ production bot
  - `NODE_ENV` = `production` (หรือไม่ตั้งก็ได้)
  - `DEV_GUILD_IDS` = ค่าว่าง หรือไม่ตั้ง (เพื่อให้คำสั่งเป็น global)

**บน Replit:**

- ใช้หน้าต่าง **Secrets** แทนไฟล์ `.env`:
  - เพิ่ม `TOKEN` หรือ `TOKEN_PROD` (production bot token)
  - เพิ่ม `DEV_GUILD_IDS` (optional - ใส่ ID ของ Server ที่ต้องการให้อัปเดตคำสั่งทันที)
  - `NODE_ENV` = `production` (optional)

## คำสั่งสำหรับนักพัฒนา (Development)

```bash
npm install     # ติดตั้ง dependency
npm run dev     # รันบอทในโหมดพัฒนา (auto-reload)
npm start       # รันบอทตามปกติ
```

## ความต้องการ (Requirements)

- Node.js 18 ขึ้นไป
- Discord Bot Token

## การติดตั้ง (Deployment)

### Render

- Deploy บน Render และตั้ง Environment Variables ตามที่ระบุด้านบน
- Production bot จะทำงานตลอดเวลา

### Replit

- ดูขั้นตอนได้ที่ [DEPLOY_REPLIT.md](./DEPLOY_REPLIT.md)
- _คำเตือน: Replit รุ่นฟรี บอทจะหลับหากไม่มีการใช้งาน 5 นาที_

## 🧪 การทดสอบบน Localhost (ไม่ชนกับ Production)

เมื่อคุณ deploy บน Render แล้ว และต้องการทดสอบบน localhost:

1. **สร้างบอททดสอบแยก** (สำคัญมาก!)
2. **ตั้งค่า `.env`** ตามตัวอย่างด้านบน
3. **รัน `npm run dev`** - บอทจะทำงานเฉพาะใน test server ที่ระบุใน `DEV_GUILD_IDS`
4. **Production bot บน Render** จะไม่ได้รับผลกระทบ เพราะใช้บอทคนละตัว

**ตรวจสอบว่า setup ถูกต้อง:**

เมื่อรันบอท ควรเห็น logs แบบนี้:

```
============================================================
[Bot] 🚀 Starting Bot...
[Bot] 📍 Host: Localhost (Development)
[Bot] 🔧 Environment: DEVELOPMENT
[Bot] 🏠 Running on: LOCALHOST
[Bot] ⚠️  Running in DEVELOPMENT mode - commands will be limited to dev guilds only!
[Bot] 🔑 Using TOKEN_TEST for development mode
[Bot] Dev Guild IDs: 123456789012345678
============================================================
```

**ถ้าเห็น warning:**

- `⚠️ WARNING: Running in DEVELOPMENT mode but no DEV_GUILD_IDS specified!` → ยังไม่ได้ตั้ง `DEV_GUILD_IDS`
- `⚠️ WARNING: Running on localhost but NODE_ENV is not 'development'!` → ยังไม่ได้ตั้ง `NODE_ENV=development` หรือ `DEV_MODE=true`

## ระบบ Keep-Alive & UptimeRobot

บอทมีระบบ Keep-Alive มาในตัว! ดูวิธีการตั้งค่าเพื่อเปิดบอท 24 ชม. ได้ที่ [UPTIMEROBOT_SETUP.md](./UPTIMEROBOT_SETUP.md)

## 🔄 Auto-Update Patch

บอทจะอัพเดทแพทช์เกมอัตโนมัติ:

- **ตรวจสอบ version ใหม่ทุก 15 นาที**
- **Auto clear cache** เมื่อพบแพทช์ใหม่
- **อัพเดทข้อมูล** champions, items, runes, spells อัตโนมัติ
- **Log เมื่อแพทช์เปลี่ยน**: `🔄 Patch updated: 14.1.1 → 14.2.1`

## 🎯 Autocomplete Features

- **แสดง champions ทั้งหมด** เมื่อ query ว่าง (25 ตัวแรก)
- **เรียงตามตัวอักษร** (A-Z)
- **กรองตาม query** เมื่อพิมพ์
- **Error handling** และ timeout protection

## 🛡️ Error Handling

บอทมีการจัดการ error ที่ดี:

- **404/403 Detection**: ตรวจสอบและแสดงข้อความว่าไม่มีข้อมูล build
- **URL Validation**: ตรวจสอบ URL ก่อนส่งไป Discord
- **Graceful Fallback**: ไม่ crash เมื่อเกิด error
- **Clear Error Messages**: แสดงข้อความที่เข้าใจง่าย

## 📊 Logging & Debugging

บอทมี logging system ที่ครบถ้วน:

- **Environment Detection**: แสดงสถานะ localhost หรือ production
- **Token Source**: แสดงว่าใช้ token ไหน
- **Request Logging**: แสดง URL และ status code
- **Error Logging**: แสดง error details สำหรับ debugging

ดูคู่มือแก้ปัญหาเพิ่มเติมได้ที่ [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 📝 ไฟล์ที่เกี่ยวข้อง

- `env.template` - Template สำหรับ environment variables
- `TROUBLESHOOTING.md` - คู่มือแก้ปัญหา
- `DEPLOY_REPLIT.md` - คู่มือ deploy บน Replit
- `UPTIMEROBOT_SETUP.md` - คู่มือตั้งค่า UptimeRobot
