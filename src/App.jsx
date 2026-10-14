/**
 * =========================================================================================
 * ไฟล์: src/App.jsx (Root Application Component & Router)
 * -----------------------------------------------------------------------------------------
 * หน้าที่หลัก:
 * - คอมโพเนนต์รากฐานของระบบ กำหนดเส้นทาง (Routing) ของเว็บแอปพลิเคชัน
 * - แยกหน้าระหว่าง "ผู้ใช้งานทั่วไป (User)" และ "ผู้ดูแลระบบ (Admin)" อย่างชัดเจน
 * 
 * การดึงข้อมูลและเชื่อมโยง:
 * - นำเข้า BrowserRouter, Routes, Route จาก 'react-router-dom'
 * - ดึงหน้าหลัก:
 *   1) HomePage.jsx (Path: '/') -> ระบบจองตู้, ปลดล็อก, คืนตู้, ดูตู้ของฉัน, แจ้งเตือน
 *   2) AdminPage.jsx (Path: '/admin') -> แดชบอร์ดสรุปสถิติ, จัดการผู้ใช้, รายงาน, จัดการตู้
 * 
 * ไฟล์ที่เรียกใช้ไฟล์นี้ (Consumers):
 * - src/main.jsx (Mount เข้ากับ DOM element #root)
 * =========================================================================================
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* เส้นทางหลัก (User Console): สำหรับนักศึกษาและบุคลากรทั่วไป เข้ามาเลือกจองตู้ล็อกเกอร์ */}
        <Route path="/" element={<HomePage />} />

        {/* เส้นทางผู้ดูแลระบบ (Admin Console): สำหรับเจ้าหน้าที่ดูแลจัดการตู้ สถิติ และผู้ใช้งาน */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
