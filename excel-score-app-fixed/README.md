# ระบบตรวจสอบคะแนนพนักงาน (Employee Score Checker)

ระบบ Web Application สำหรับอัปโหลดไฟล์ Excel และแสดงรายชื่อพนักงานที่ได้คะแนน 5/5

---

## โครงสร้างโปรเจกต์

```
excel-score-app/
├── backend/
│   ├── app.py               ← Flask API (Python)
│   └── requirements.txt     ← รายการ Python packages
├── frontend/
│   ├── index.html           ← หน้าเว็บหลัก
│   └── static/
│       ├── css/style.css    ← สไตล์
│       └── js/app.js        ← JavaScript logic
└── sample_data/
    └── employee_scores_sample.xlsx   ← ไฟล์ตัวอย่าง
```

---

## การติดตั้งและรันระบบ

### ข้อกำหนด

- Python 3.9+
- Browser ทันสมัย (Chrome, Firefox, Edge, Safari)

### ขั้นตอน

#### 1. ติดตั้ง Python packages

```bash
cd backend
pip install -r requirements.txt
```

#### 2. รัน Flask Backend

```bash
cd backend
python app.py
```

Backend จะรันที่ `http://localhost:5000`

#### 3. เปิด Frontend

เปิดไฟล์ `frontend/index.html` ด้วย Browser โดยตรง
หรือใช้ Live Server (VS Code Extension) เพื่อประสบการณ์ที่ดีขึ้น

---

## API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/health` | ตรวจสอบสถานะ Server |
| POST | `/api/upload` | รับไฟล์ Excel และประมวลผล |
| POST | `/api/export` | Export ผลลัพธ์เป็น Excel |

### POST /api/upload

**Request:** `multipart/form-data` กับ field `file` เป็นไฟล์ .xlsx

**Response (Success):**
```json
{
  "success": true,
  "total_rows": 1020,
  "perfect_count": 412,
  "data": [
    {
      "Timestamp": "2026-06-17 09:00:00",
      "Employee ID": "EMP001",
      "Name": "Somchai Jaidee"
    }
  ]
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "ไม่พบคอลัมน์ที่จำเป็น: Score"
}
```

---

## โครงสร้างไฟล์ Excel ที่รองรับ

| คอลัมน์ | ประเภทข้อมูล | ตัวอย่าง |
|---------|-------------|---------|
| Timestamp | ข้อความหรือ DateTime | 2026-06-17 09:00:00 |
| Employee ID | ข้อความ | EMP001 |
| Name | ข้อความ | Somchai Jaidee |
| Score | ข้อความ | 5/5, 3/5, 1/5 |

---

## ฟีเจอร์ระบบ

- อัปโหลดไฟล์ผ่านปุ่มหรือ Drag & Drop
- กรองแถวที่ Score = "5/5" อัตโนมัติ
- แสดงสถิติ: จำนวนทั้งหมด, ผู้ได้คะแนนเต็ม, สัดส่วน
- ค้นหาชื่อพนักงานแบบ Real-time
- เรียงลำดับตามคอลัมน์ต่าง ๆ
- Pagination (10, 25, 50, 100 แถวต่อหน้า)
- Export ผลลัพธ์เป็น Excel
- Responsive สำหรับมือถือและคอมพิวเตอร์
- รองรับไฟล์ขนาดใหญ่ 5,000+ แถว

---

## การแก้ปัญหาเบื้องต้น

**ขึ้น CORS Error:**
ตรวจสอบว่า Flask กำลังทำงาน และ `API_BASE` ใน `app.js` ตรงกับ port ที่ใช้

**ขึ้น "ไม่พบคอลัมน์ Score":**
ตรวจสอบชื่อคอลัมน์ในไฟล์ Excel ว่าตรงกับที่กำหนด (case-sensitive)

**ไฟล์ใหญ่โหลดช้า:**
ปกติสำหรับไฟล์ 5,000+ แถว Flask จะประมวลผลด้วย Pandas ซึ่งรวดเร็ว

---

## เทคโนโลยีที่ใช้

- **Backend:** Python Flask + Pandas + OpenPyXL
- **Frontend:** HTML5 + Bootstrap 5 + Vanilla JavaScript
- **ไฟล์ Excel:** OpenPyXL (อ่าน/เขียน)
