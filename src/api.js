/**
 * =========================================================================================
 * ไฟล์: src/api.js (API Client Service)
 * -----------------------------------------------------------------------------------------
 * หน้าที่หลัก:
 * - ตัวกลางสำหรับส่ง HTTP Request (GET, POST, PUT) เชื่อมต่อระหว่าง Frontend และ Backend
 * - จัดการ Header `Content-Type: application/json` และแปลง Body เป็น JSON String อัตโนมัติ
 * 
 * การดึงข้อมูลและเชื่อมโยง:
 * - เรียกใช้งาน Native `fetch` ของเบราว์เซอร์
 * - Path เป็นแบบ Relative (เช่น '/lockers', '/my-bookings')
 *   ซึ่งจะถูก Vite Dev Proxy (ใน vite.config.js) หรือ Production Web Server
 *   ส่งต่อไปยัง Backend API Server ที่พอร์ต 5000 (server.js / app.js)
 * 
 * ไฟล์ที่เรียกใช้ไฟล์นี้ (Consumers):
 * - src/pages/HomePage.jsx (ดึงตู้, การจอง, ชำระเงิน, บันทึกการใช้งาน)
 * - src/pages/AdminPage.jsx (ดึงสถิติ, จัดการผู้ใช้, จัดการตู้ล็อกเกอร์, รายงาน)
 * - src/components/UserHistory.jsx (ดึงประวัติการจองของผู้ใช้)
 * - src/components/RelocationModal.jsx (ดึงตัวเลือกตู้ว่างสำหรับย้ายตู้)
 * - src/components/RevenuePanel.jsx (ดึงข้อมูลรายได้)
 * =========================================================================================
 */

/**
 * ฟังก์ชันพื้นฐานสำหรับส่ง Request ไปยัง Backend
 * @param {string} path - URL path ปลายทาง เช่น '/lockers'
 * @param {RequestInit} [options={}] - Options เพิ่มเติม เช่น method, headers, body
 * @returns {Promise<Response>} Response object จาก fetch
 */
async function request(path, options = {}) {
  const res = await fetch(path, options);
  return res;
}

/**
 * ส่ง GET Request และแปลงผลลัพธ์เป็น JSON ทันที
 * @example const json = await getJSON('/lockers?user_id=1');
 * @param {string} path - URL path ปลายทาง
 * @returns {Promise<any>} ข้อมูล JSON ที่ได้รับจาก Server
 */
export async function getJSON(path) {
  const res = await request(path);
  return res.json();
}

/**
 * ส่ง POST Request พร้อมข้อมูลแบบ JSON ใน Body
 * @example const res = await postJSON('/payment-sessions', { user_id: 1, locker_id: 2 });
 * @param {string} path - URL path ปลายทาง
 * @param {object} body - Payload ข้อมูลที่จะส่งไป (จะถูก JSON.stringify อัตโนมัติ)
 * @returns {Promise<Response>} Response object จาก fetch
 */
export async function postJSON(path, body) {
  const res = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

/**
 * ส่ง PUT Request สำหรับแก้ไขหรืออัปเดตข้อมูล
 * @example const res = await putJSON('/users/5/status', { status: 'suspended' });
 * @param {string} path - URL path ปลายทาง
 * @param {object} [body] - Payload ข้อมูลที่จะแก้ไข (ถ้ามี)
 * @returns {Promise<Response>} Response object จาก fetch
 */
export async function putJSON(path, body) {
  const res = await request(path, {
    method: 'PUT',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export { request };
