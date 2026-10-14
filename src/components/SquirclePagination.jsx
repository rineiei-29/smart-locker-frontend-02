/**
 * =========================================================================================
 * ไฟล์: src/components/SquirclePagination.jsx (Squircle Pagination Component)
 * -----------------------------------------------------------------------------------------
 * หน้าที่หลัก:
 * - คอมโพเนนต์ควบคุมการเปลี่ยนหน้าตารางข้อมูล (Pagination) สไตล์โมเดิร์นมินิมอลทรง Squircle
 * - รองรับการคำนวณหน้าแบบมีจุดไข่ปลา '...' อัตโนมัติเมื่อจำนวนหน้ามีมาก
 * - รองรับการปรับเปลี่ยนจำนวนแถวต่อหน้า (Page Size Selector: เช่น 5, 10, 20 รายการ)
 * 
 * จุดที่เรียกใช้งาน (Consumers):
 * - src/pages/HomePage.jsx: ใช้แบ่งหน้าตาราง "ประวัติเหตุการณ์ (Event Logs)"
 * - src/pages/AdminPage.jsx: ใช้แบ่งหน้าตาราง "การจองทั้งหมด", "จัดการผู้ใช้", "ประวัติระบบ"
 * - src/components/UserHistory.jsx: ใช้แบ่งหน้าตาราง "ประวัติการใช้งานของฉัน"
 * =========================================================================================
 */

import { useMemo } from 'react';

export default function SquirclePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
}) {
  // Generate pages array with ellipsis (matching `< [1] [2] [3] ... [40] >`)
  const pages = useMemo(() => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  if (totalPages <= 0) return null;

  return (
    <div className="squircle-pagination-wrap">
      <div className="squircle-pagination">
        {/* Previous Page Button (<) */}
        <button
          type="button"
          className="squircle-page-btn arrow-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          title="หน้าก่อนหน้า"
          aria-label="Previous Page"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Page Buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="squircle-page-dots">
                ...
              </span>
            );
          }
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              className={`squircle-page-btn ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              title={`หน้า ${p}`}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page Button (>) */}
        <button
          type="button"
          className="squircle-page-btn arrow-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          title="หน้าถัดไป"
          aria-label="Next Page"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="pagination-meta">
        {totalItems != null && (
          <span className="pagination-info-text">
            แสดง {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} จากทั้งหมด {totalItems} รายการ
          </span>
        )}
        {onPageSizeChange && (
          <div className="pagination-pagesize-group">
            <span>แสดงหน้าละ:</span>
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
              <option value={5}>5 รายการ</option>
              <option value={10}>10 รายการ</option>
              <option value={20}>20 รายการ</option>
              <option value={50}>50 รายการ</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
