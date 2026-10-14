/**
 * =========================================================================================
 * ไฟล์: src/components/UserHistory.jsx (User Booking History Component)
 * -----------------------------------------------------------------------------------------
 * หน้าที่หลัก:
 * - แสดงประวัติการจองตู้ล็อกเกอร์ในอดีตเฉพาะของผู้ใช้งานปัจจุบันที่ล็อกอินอยู่
 * - แสดงรายการที่ 'คืนตู้แล้ว (completed)' และ 'ถูกยกเลิก (cancelled)' พร้อมสรุปยอดใช้งานรวม
 * 
 * แหล่งที่มาของข้อมูล (Data Source & Flow):
 * 1. API Endpoint: `GET /my-history?user_id=${user.user_id}`
 *    - ควบคุมโดย: Backend `src/controllers/report.controller.js` ฟังก์ชัน `myHistory`
 *    - ฐานข้อมูล: ตาราง `bookings` JOIN กับตาราง `lockers` โดยกรอง `user_id = $1`
 *    - ผลลัพธ์: คืนค่า Array `data` (รายการจองในอดีต) และ Object `summary` (จำนวนครั้ง, ยอดเงินรวม, จำนวนนาทีรวม)
 * 2. ฟังก์ชันยูทิลิตี้ (Utility Helpers):
 *    - `../utils/format.js`: `formatMinutes` (แปลงนาที), `formatBaht` (แปลงค่าเงิน), `formatDateTimeFull` (แปลงวันเวลา)
 * 3. คอมโพเนนต์ลูก (Child Component):
 *    - `./SquirclePagination.jsx`: ระบบเปลี่ยนหน้า (Pagination) สไตล์มินิมอล Squircle
 * 
 * จุดที่เรียกใช้งาน (Consumer):
 * - ถูกเรียกใช้งานใน `src/pages/HomePage.jsx` บรรทัดที่ 1326 เมื่อผู้ใช้คลิกเมนู "ประวัติการใช้งาน" (`page === 'history'`)
 * =========================================================================================
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { getJSON } from '../api';
import { formatMinutes, formatBaht, formatDateTimeFull } from '../utils/format';
import SquirclePagination from './SquirclePagination';

// ป้ายกำกับขนาดตู้ภาษาไทย
const SIZE_LABEL = { small: 'เล็ก', medium: 'กลาง', large: 'ใหญ่' };

// ป้ายกำกับสถานะการจองในอดีต
const STATUS_LABEL = { completed: 'คืนตู้แล้ว', cancelled: 'ยกเลิก' };

// ตัวเลือกตัวกรองสถานะ
const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'completed', label: 'คืนตู้แล้ว' },
  { key: 'cancelled', label: 'ยกเลิก' },
];

/**
 * คอมโพเนนต์แสดงประวัติการใช้งานของผู้ใช้
 * @param {object} props.user - ข้อมูลผู้ใช้ปัจจุบัน { user_id, username, role, ... } ดึงมาจาก localStorage 'locker_user'
 * @param {boolean} props.active - สถานะว่าแท็บประวัติการใช้งานกำลังถูกเปิดอยู่หรือไม่ (page === 'history')
 */
export default function UserHistory({ user, active }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [state, setState] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  /**
   * ดึงข้อมูลประวัติการจองจาก Backend API
   * Endpoint: /my-history?user_id=...
   */
  const load = useCallback(async () => {
    try {
      const json = await getJSON('/my-history?user_id=' + user.user_id);
      if (!json.success) throw new Error(json.message);
      setRows(json.data || []);
      setSummary(json.summary);
      setState('ok');
    } catch {
      setState('error');
    }
  }, [user.user_id]);

  // โหลดข้อมูลใหม่โดยอัตโนมัติทุกครั้งที่ผู้ใช้สลับมายังแท็บประวัตินี้
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  // กรองข้อมูลตามสถานะที่เลือก (ทั้งหมด, คืนตู้แล้ว, ยกเลิก)
  const visible = rows.filter((r) => filter === 'all' || r.status === filter);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const activePage = Math.min(Math.max(1, page), totalPages);

  // ตัดแบ่งข้อมูลตามหน้า (Pagination Slice)
  const paginatedRows = useMemo(() => {
    return visible.slice((activePage - 1) * pageSize, activePage * pageSize);
  }, [visible, activePage, pageSize]);

  return (
    <div>
      <div className="section-label">
        <span>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4Z" />
            <path d="M13 5v2M13 17v2M13 10.5v3" />
          </svg>
          ประวัติการใช้งานของฉัน — รายการที่เคยจอง
        </span>
        <div className="rule" />
      </div>

      {/* กล่องการ์ดสรุปยอดการใช้งาน (Summary Cards) */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">จำนวนครั้งที่เคยใช้</div>
            <div className="stat-val">{summary.total_bookings} <span style={{ fontSize: 13, fontWeight: 400 }}>ครั้ง</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">คืนตู้สำเร็จ</div>
            <div className="stat-val" style={{ color: 'var(--ok)' }}>{summary.completed_bookings} <span style={{ fontSize: 13, fontWeight: 400 }}>ครั้ง</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ยกเลิก</div>
            <div className="stat-val" style={{ color: summary.cancelled_bookings > 0 ? 'var(--danger)' : 'var(--muted)' }}>
              {summary.cancelled_bookings} <span style={{ fontSize: 13, fontWeight: 400 }}>ครั้ง</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">เวลารวมที่ฝาก</div>
            <div className="stat-val" style={{ fontSize: 20 }}>{formatMinutes(summary.total_minutes_used)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ยอดชำระสะสม</div>
            <div className="stat-val" style={{ fontSize: 20, color: 'var(--gold)' }}>{formatBaht(summary.total_spent)}</div>
          </div>
        </div>
      )}

      {/* แถบตัวกรองสถานะ */}
      <div className="filter-chips" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => { setFilter(f.key); setPage(1); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ตารางแสดงข้อมูลรายการจอง */}
      {state === 'loading' && <p className="hint">กำลังโหลดประวัติการใช้งาน...</p>}
      {state === 'error' && <p className="hint" style={{ color: 'var(--danger)' }}>โหลดประวัติไม่สำเร็จ</p>}
      {state === 'ok' && visible.length === 0 && <p className="hint">ไม่มีประวัติการใช้งานในหมวดนี้</p>}

      {state === 'ok' && visible.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ตู้</th>
                  <th>ขนาด</th>
                  <th>สถานที่</th>
                  <th>เวลาที่เริ่ม</th>
                  <th>สิ้นสุด</th>
                  <th>ระยะเวลา</th>
                  <th>ค่าบริการ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r) => (
                  <tr key={r.booking_id}>
                    <td><b>{r.locker_number}</b></td>
                    <td>{SIZE_LABEL[r.size] || r.size}</td>
                    <td>{r.location || '–'}</td>
                    <td>{formatDateTimeFull(r.start_time)}</td>
                    <td>{formatDateTimeFull(r.end_time)}</td>
                    <td>{formatMinutes(r.planned_minutes)}</td>
                    <td>{formatBaht(r.fee_paid)}</td>
                    <td>
                      <span className={`status-pill ${r.status === 'completed' ? 'ok' : 'danger'}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ระบบเปลี่ยนหน้า Pagination */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            <SquirclePagination
              currentPage={activePage}
              totalPages={totalPages}
              totalItems={visible.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
