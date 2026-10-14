/**
 * =========================================================================================
 * ไฟล์: src/components/RevenuePanel.jsx (แผงรายงานรายได้และสรุปยอดการชำระเงินสำหรับ Admin)
 * -----------------------------------------------------------------------------------------
 * หน้าที่หลักของคอมโพเนนต์นี้:
 * 1. แสดงการ์ดสรุปยอดรายได้ (Revenue Summary Cards):
 *    - รายได้วันนี้ (today)
 *    - รายได้เดือนนี้ (this_month)
 *    - รายได้สะสมทั้งหมด (total)
 *    - จำนวนรายการชำระเงินทั้งหมด (total_bookings)
 * 2. ตัวกรองช่วงเวลา (Period Filter): สรุปตาม 'รายวัน' (daily), 'รายเดือน' (monthly), หรือ 'รายปี' (yearly)
 * 3. ตารางแจกแจงรายได้ตามขนาดตู้:
 *    - จำนวนรายการ, รายได้จากตู้เล็ก (small), ตู้กลาง (medium), ตู้ใหญ่ (large), รายได้รวม, และยอดที่ยกเลิก
 * 4. ตารางประวัติรายการชำระเงินล่าสุด (Recent Transactions):
 *    - แสดงเวลา, ชื่อผู้ใช้งาน (@username), หมายเลขตู้และขนาด, ยอดเงิน, และสถานะการชำระ
 * 
 * การดึงข้อมูลและเชื่อมโยง (Data Flow):
 * - API Endpoint:
 *   - `GET /admin/revenue?period={period}&user_id={adminId}` (ดำเนินการโดย admin.controller.js)
 * - Props:
 *   - `adminId`: รหัสผู้ดูแลระบบ (user_id ของ admin เพื่อตรวจสอบสิทธิ์)
 *   - `active`: สถานะว่าแท็บนี้กำลังถูกเปิดอยู่หรือไม่ (หาก true จะทำการ fetch ข้อมูลใหม่ทันที)
 * =========================================================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { getJSON } from '../api';
import { formatBaht, formatDateTimeFull } from '../utils/format';

// ป้ายกำกับภาษาไทยสำหรับขนาดตู้, สถานะการจอง, และหัวตารางช่วงเวลา
const SIZE_LABEL = { small: 'เล็ก', medium: 'กลาง', large: 'ใหญ่' };
const STATUS_LABEL = { active: 'ใช้งาน/รอใช้', completed: 'คืนตู้แล้ว', cancelled: 'ยกเลิก' };
const PERIOD_HEAD = { daily: 'วันที่', monthly: 'เดือน', yearly: 'ปี' };

export default function RevenuePanel({ adminId, active }) {
  // สถานะการเลือกช่วงเวลา (daily, monthly, yearly)
  const [period, setPeriod] = useState('daily');
  // ข้อมูลรายได้ที่ได้จาก Backend API
  const [data, setData] = useState(null);
  // สถานะการโหลดข้อมูล: 'loading' | 'ok' | 'error'
  const [state, setState] = useState('loading');

  /**
   * ฟังก์ชันดึงข้อมูลสรุปรายได้จาก Backend ผ่าน API /admin/revenue
   */
  const load = useCallback(async () => {
    try {
      const json = await getJSON(`/admin/revenue?period=${period}&user_id=${adminId}`);
      if (!json.success) throw new Error(json.message);
      setData(json);
      setState('ok');
    } catch {
      setState('error');
    }
  }, [period, adminId]);

  // เมื่อคอมโพเนนต์ถูกเปิดใช้งาน (active = true) หรือเมื่อ period เปลี่ยน จะโหลดข้อมูลใหม่
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const head = PERIOD_HEAD[period];
  const rows = data?.data || [];
  const tx = data?.transactions || [];

  return (
    <div>
      {/* ส่วนหัวข้อหลักของแผงรายได้ */}
      <div className="section-label">
        <span>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h3v-4Z" />
          </svg>
          ประวัติรายได้และสรุปยอดการชำระเงิน
        </span>
        <div className="rule" />
      </div>

      {/* การ์ดสถิติสรุปยอดเงิน 4 ช่อง (วันนี้ / เดือนนี้ / สะสม / จำนวนรายการ) */}
      {data && (
        <div className="stats admin">
          <div className="stat ok"><div className="num">{data.summary.today.toLocaleString('th-TH')}</div><div className="label">รายได้วันนี้ (บาท)</div></div>
          <div className="stat ok"><div className="num">{data.summary.this_month.toLocaleString('th-TH')}</div><div className="label">เดือนนี้ (บาท)</div></div>
          <div className="stat ok"><div className="num">{data.summary.total.toLocaleString('th-TH')}</div><div className="label">รายได้สะสม (บาท)</div></div>
          <div className="stat"><div className="num">{data.summary.total_bookings}</div><div className="label">จำนวนรายการชำระ</div></div>
        </div>
      )}

      {/* แถบตัวเลือกช่วงเวลา (รายวัน / รายเดือน / รายปี) */}
      <div className="filter-row">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="ช่วงเวลา">
          <option value="daily">รายวัน</option>
          <option value="monthly">รายเดือน</option>
          <option value="yearly">รายปี</option>
        </select>
        <span className="hint">รายได้ไม่รวมรายการที่ยกเลิก (แสดงแยกเป็นคอลัมน์ "ยกเลิก")</span>
      </div>

      {/* ตารางแสดงการแจกแจงรายได้ตามช่วงเวลาและขนาดตู้ */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{head}</th><th>จำนวนรายการ</th><th>ตู้เล็ก</th><th>ตู้กลาง</th><th>ตู้ใหญ่</th>
              <th>รายได้รวม</th><th>ยกเลิก</th>
            </tr>
          </thead>
          <tbody>
            {state === 'error' ? (
              <tr><td colSpan={7} className="empty">โหลดข้อมูลรายได้ไม่สำเร็จ</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="empty">ยังไม่มีข้อมูลรายได้</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.period_label}>
                  <td data-label={head}>{r.period_label}</td>
                  <td data-label="จำนวนรายการ">{r.bookings}</td>
                  <td data-label="ตู้เล็ก">{r.small.toLocaleString('th-TH')}</td>
                  <td data-label="ตู้กลาง">{r.medium.toLocaleString('th-TH')}</td>
                  <td data-label="ตู้ใหญ่">{r.large.toLocaleString('th-TH')}</td>
                  <td data-label="รายได้รวม"><b>{formatBaht(r.revenue)}</b></td>
                  <td data-label="ยกเลิก">{r.cancelled_count ? `${r.cancelled_count} รายการ (${formatBaht(r.cancelled_amount)})` : '–'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ส่วนหัวข้อตารางรายการชำระเงินล่าสุด */}
      <div className="section-label"><span>รายการชำระเงินล่าสุด</span><div className="rule" /></div>
      
      {/* ตารางแสดงรายละเอียดธุรกรรมการชำระเงินล่าสุด 10 รายการ */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>เวลา</th><th>ผู้ใช้</th><th>ตู้</th><th>จำนวนเงิน</th><th>สถานะ</th></tr>
          </thead>
          <tbody>
            {tx.length === 0 ? (
              <tr><td colSpan={5} className="empty">ยังไม่มีรายการ</td></tr>
            ) : (
              tx.map((t) => (
                <tr key={t.booking_id}>
                  <td data-label="เวลา">{formatDateTimeFull(t.created_at)}</td>
                  <td data-label="ผู้ใช้">{t.firstname} {t.lastname} <small style={{ color: 'var(--muted)' }}>@{t.username}</small></td>
                  <td data-label="ตู้">{t.locker_number} · {SIZE_LABEL[t.size] || t.size}</td>
                  <td data-label="จำนวนเงิน">{t.status === 'cancelled' ? <s>{formatBaht(t.amount)}</s> : <b>{formatBaht(t.amount)}</b>}</td>
                  <td data-label="สถานะ"><span className={`badge ${t.status}`}>{STATUS_LABEL[t.status] || t.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

