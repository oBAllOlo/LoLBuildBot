# 📋 ไฟล์ที่ไม่ได้ถูกใช้งาน (Unused Files)

รายการไฟล์และโฟลเดอร์ที่ไม่ได้ถูกเรียกใช้ในโปรเจกต์:

## 🗑️ ไฟล์ที่ไม่ได้ใช้ (Unused Files)

### Debug/Test Scripts (ใช้สำหรับ debugging เท่านั้น)
- `debug-cf.ts` - Debug script สำหรับ Cloudflare
- `debug-dump.ts` - Debug script สำหรับ dump HTML
- `debug-env.ts` - Debug script สำหรับ environment variables
- `debug-scraper.ts` - Debug script สำหรับ scraper
- `test.ts` - Test script (มีแค่ console.log)
- `test_ddragon.ts` - Test script สำหรับ DDragon
- `startup_test.ts` - Test script สำหรับ startup

### Utility Scripts (ใช้เมื่อต้องการเท่านั้น)
- `clear-commands.ts` - Script สำหรับลบ commands (ใช้เมื่อต้องการ clear)
- `delete_global_commands.ts` - Script สำหรับลบ global commands
- `delete_guild_commands.ts` - Script สำหรับลบ guild commands
- `verify_ids.ts` - Script สำหรับ verify IDs

### Documentation/Logs
- `welcome.md` - Welcome message จาก CommandKit template
- `bot_output.log` - Log file (auto-generated)

## ⚠️ ไฟล์ที่ไม่ได้ถูกใช้งาน (Unused Services)

### `src/services/riot.ts`
- **Status**: ไม่ได้ถูกใช้จริง (ลบ import ออกแล้ว)
- **Details**: 
  - มี functions: `getChallengerBuild()`, `getChallengerBuildAllRegions()`
  - ใช้ Riot API เพื่อดึงข้อมูลจาก Challenger players
  - **ตอนนี้ใช้ Mobalytics แทน** (ผ่าน `scraper.ts`)
  - อาจจะใช้ในอนาคตหรือเป็น fallback
  - **Note**: ต้องมี `RIOT_API_KEY` ใน environment variables

### `src/services/league-of-graphs.ts`
- **Status**: ไม่ได้ถูก import หรือใช้เลย
- **Details**:
  - มี function: `fetchChampionBuild()` และ `fetchCounterData()`
  - ไม่ได้ถูก import ในไฟล์ใดๆ
  - ใช้ League of Graphs เป็น data source
  - อาจจะเป็น alternative data source ที่ยังไม่ได้ใช้

## ✅ ไฟล์ที่ถูกใช้งาน (Used Files)

### Core Files
- `src/index.ts` - Entry point
- `src/commands/**/*.ts` - All commands
- `src/services/mobalytics.ts` - ใช้สำหรับดึงข้อมูล build
- `src/services/scraper.ts` - ใช้สำหรับดึงข้อมูล build
- `src/services/image-gen.ts` - ใช้สำหรับสร้างรูป build
- `src/utils/**/*.ts` - All utilities
- `src/events/**/*.ts` - All events
- `src/types/**/*.ts` - All types
- `src/data/builds.ts` - ใช้สำหรับ static builds (import ใน scraper.ts)

### Configuration
- `package.json` - Dependencies
- `.gitignore` - Git ignore rules
- `env.template` - Environment template
- `.replit` - Replit configuration

### Documentation
- `README.md` - Main documentation
- `TROUBLESHOOTING.md` - Troubleshooting guide
- `DEPLOY_REPLIT.md` - Replit deployment guide
- `UPTIMEROBOT_SETUP.md` - UptimeRobot setup guide

## 💡 คำแนะนำ

### ไฟล์ที่ควรเก็บไว้:
- **Debug scripts** - เก็บไว้สำหรับ debugging ในอนาคต
- **Utility scripts** - เก็บไว้สำหรับ maintenance (clear commands, etc.)
- **riot.ts** - อาจจะใช้ในอนาคต หรือเป็น fallback
- **league-of-graphs.ts** - อาจจะเป็น alternative data source

### ไฟล์ที่สามารถลบได้ (ถ้าต้องการ):
- `test.ts` - มีแค่ console.log ไม่มีประโยชน์
- `welcome.md` - Template file ไม่จำเป็น
- `bot_output.log` - Log file (auto-generated, ควร ignore)

### ไฟล์ที่ควร ignore:
- `bot_output.log` - ควรเพิ่มใน `.gitignore` (ถ้ายังไม่มี)

## 📝 สรุป

**ไฟล์ที่ไม่ได้ใช้จริง:**
1. `src/services/league-of-graphs.ts` - ไม่ได้ถูก import เลย
2. `test.ts` - Test script ที่ไม่มีประโยชน์
3. `welcome.md` - Template file

**ไฟล์ที่ไม่ได้ใช้จริง:**
1. `src/services/riot.ts` - ไม่ได้ถูก import หรือใช้ (ลบ import ออกแล้ว)

**ไฟล์ที่ใช้สำหรับ debugging/maintenance:**
- Debug scripts - เก็บไว้สำหรับ debugging
- Utility scripts - เก็บไว้สำหรับ maintenance
