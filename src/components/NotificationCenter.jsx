import { useState, useEffect, useRef, useCallback } from 'react';
import { formatClock } from '../utils/format';

/**
 * =========================================================================================
 * คอมโพเนนต์ระบบแจ้งเตือนสำหรับผู้ใช้งาน (User Notification System)
 * ระบบตู้ล็อกเกอร์อัจฉริยะ (Smart Storage Locker)
 * 
 * คุณสมบัติหลักและเงื่อนไขการทำงาน:
 * 1. แจ้งเตือนก่อนถึงเวลาจอง (สำหรับการจองล่วงหน้า):
 *    - คำนวณเวลาเริ่มต้นใช้งาน (start_time)
 *    - เมื่อเหลือเวลาอีกไม่เกิน 10 นาที (diff <= 10 นาที) ระบบจะส่งการแจ้งเตือนทันที
 * 
 * 2. แจ้งเตือนก่อนหมดเวลาจอง/ใช้งาน:
 *    - คำนวณเวลาสิ้นสุดการใช้งาน (end_time)
 *    - เมื่อเหลือเวลาอีกไม่เกิน 10 นาที (diff <= 10 นาที) ระบบจะส่งการแจ้งเตือนให้เตรียมคืนตู้
 * 
 * รูปแบบการแจ้งเตือนที่รองรับ:
 * - In-App Floating Toast: การแจ้งเตือนลอยมุมขวาบน พร้อมเวลานับถอยหลังและปุ่มกดดูตู้
 * - Notification Center Dropdown: แผงรวมประวัติการแจ้งเตือนทั้งหมด พร้อมตัวเลขนับ (Badge)
 * - Browser Web Push Notification: แจ้งเตือนผ่านระบบปฏิบัติการ/เบราว์เซอร์ แม้จะสลับแท็บไปหน้าอื่น
 * =========================================================================================
 */

// ระยะเวลาที่ใช้ในการแจ้งเตือนล่วงหน้า (10 นาที แปลงเป็นมิลลิวินาที)
const NOTIFICATION_THRESHOLD_MS = 10 * 60 * 1000; // 10 นาที = 600,000 ms

export default function NotificationCenter({ bookings = [], currentUser, onNavigateMine }) {
  // สถานะเปิด-ปิดหน้าต่างรายการแจ้งเตือน (Dropdown)
  const [isOpen, setIsOpen] = useState(false);

  // รายการประวัติการแจ้งเตือนทั้งหมด
  const [notifications, setNotifications] = useState([]);

  // รายการ Toast แจ้งเตือนที่กำลังแสดงลอยอยู่บนหน้าจอ ณ ปัจจุบัน
  const [toasts, setToasts] = useState([]);

  // สถานะสิทธิ์การแจ้งเตือนผ่าน Browser Notification API ('default' | 'granted' | 'denied')
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  // ใช้ Ref บันทึกรหัสการแจ้งเตือนที่เคยส่งไปแล้ว เพื่อป้องกันการแจ้งเตือนซ้ำซ้อนในรอบเวลาเดียวกัน
  // รูปแบบ Key: `upcoming_${booking_id}` หรือ `expiring_${booking_id}`
  const notifiedKeysRef = useRef(new Set());

  // Ref สำหรับอ้างอิงตำแหน่งปุ่มเพื่อตรวจจับการคลิกภายนอก (Click Outside)
  const dropdownRef = useRef(null);

  // ---------------------------------------------------------------------------------------
  // 1. โหลดประวัติการแจ้งเตือนเดิมและ Key ที่เคยแจ้งเตือนแล้วจาก LocalStorage เมื่อโหลดคอมโพเนนต์
  // ---------------------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser?.user_id) return;

    try {
      // โหลดประวัติแจ้งเตือนเฉพาะของ user คนนี้
      const savedNotifs = localStorage.getItem(`locker_notifs_${currentUser.user_id}`);
      if (savedNotifs) {
        setNotifications(JSON.parse(savedNotifs));
      }

      // โหลด key ที่เคยแจ้งเตือนแล้ว
      const savedKeys = localStorage.getItem(`locker_notified_keys_${currentUser.user_id}`);
      if (savedKeys) {
        notifiedKeysRef.current = new Set(JSON.parse(savedKeys));
      }
    } catch (err) {
      console.error('Error loading notification cache:', err);
    }
  }, [currentUser?.user_id]);

  // บันทึกรายการแจ้งเตือนลง LocalStorage เมื่อมีการอัปเดต
  const saveNotificationsToStorage = useCallback((items) => {
    if (!currentUser?.user_id) return;
    try {
      localStorage.setItem(`locker_notifs_${currentUser.user_id}`, JSON.stringify(items));
    } catch (err) {
      console.error('Error saving notifications to storage:', err);
    }
  }, [currentUser?.user_id]);

  // บันทึก Key ที่แจ้งเตือนแล้วลง LocalStorage
  const saveNotifiedKeysToStorage = useCallback(() => {
    if (!currentUser?.user_id) return;
    try {
      localStorage.setItem(
        `locker_notified_keys_${currentUser.user_id}`,
        JSON.stringify(Array.from(notifiedKeysRef.current))
      );
    } catch (err) {
      console.error('Error saving notified keys:', err);
    }
  }, [currentUser?.user_id]);

  // ---------------------------------------------------------------------------------------
  // 2. ฟังก์ชันขอสิทธิ์การแจ้งเตือนผ่าน Browser Web Notification API
  // ---------------------------------------------------------------------------------------
  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('เบราว์เซอร์นี้ไม่รองรับระบบ Web Push Notification');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === 'granted') {
        // ส่งข้อความแจ้งเตือนทดสอบยืนยันการเปิดใช้งานสำเร็จ
        new Notification('ระบบแจ้งเตือนตู้ล็อกเกอร์อัจฉริยะ', {
          body: 'เปิดใช้งานการแจ้งเตือนผ่านเบราว์เซอร์สำเร็จแล้ว',
          icon: '/favicon.ico',
        });
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  // ---------------------------------------------------------------------------------------
  // 3. ฟังก์ชันสร้างและส่งการแจ้งเตือน (Dispatch Notification)
  //    ส่งทั้ง In-App Toast, Web Browser Notification, เสียงแจ้งเตือน และบันทึกลง History
  // ---------------------------------------------------------------------------------------
  const dispatchNotification = useCallback((newNotif) => {
    // 3.1 เพิ่มลงในประวัติแจ้งเตือน
    setNotifications((prev) => {
      const updated = [newNotif, ...prev].slice(0, 50); // เก็บไว้สูงสุด 50 รายการล่าสุด
      saveNotificationsToStorage(updated);
      return updated;
    });

    // 3.2 เพิ่มลงใน Toast ลอยบนหน้าจอ (In-App Notification)
    setToasts((prev) => [...prev, newNotif]);

    // ตั้งเวลาให้ Toast หายไปเองอัตโนมัติหลังจากแสดงผล 8 วินาที
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
    }, 8000);

    // 3.3 ส่งผ่าน Browser Notification หากได้รับอนุญาต
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, {
          body: newNotif.message,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.error('Failed to trigger native Notification:', err);
      }
    }
  }, [saveNotificationsToStorage]);

  // ---------------------------------------------------------------------------------------
  // 4. กลไกหลัก: ตรวจสอบและคำนวณเงื่อนไขการแจ้งเตือนทั้ง 2 ข้อ (Check Logic Engine)
  // ---------------------------------------------------------------------------------------
  const checkBookingNotifications = useCallback(() => {
    if (!currentUser || !Array.isArray(bookings) || bookings.length === 0) return;

    const now = Date.now();

    bookings.forEach((booking) => {
      // ข้ามรายการที่ไม่ได้อยู่ในสถานะ active หรือยกเลิก/คืนตู้ไปแล้ว
      if (booking.status !== 'active') return;

      const startTime = new Date(booking.start_time).getTime();
      const endTime = new Date(booking.end_time).getTime();

      // ตรวจสอบความถูกต้องของเวลา
      if (Number.isNaN(startTime) || Number.isNaN(endTime)) return;

      // ===================================================================================
      // เงื่อนไขที่ 1: แจ้งเตือนก่อนถึงเวลาจอง (สำหรับการจองล่วงหน้า) 10 นาที
      // ===================================================================================
      // ตรวจสอบเฉพาะการจองล่วงหน้า (เวลาเริ่มยังมาไม่ถึง: now < startTime)
      if (now < startTime) {
        const timeUntilStartMs = startTime - now;

        // คำนวณเป็นนาทีที่เหลือ (ปัดเศษขึ้น เช่น 9.5 นาที = 10 นาที)
        const minutesLeft = Math.ceil(timeUntilStartMs / (60 * 1000));

        // ตรวจสอบว่าเหลือเวลาน้อยกว่าหรือเท่ากับ 10 นาที (NOTIFICATION_THRESHOLD_MS)
        // และยังไม่เคยส่งการแจ้งเตือนประเภทนี้สำหรับ booking นี้
        const upcomingKey = `upcoming_${booking.booking_id}`;

        if (timeUntilStartMs <= NOTIFICATION_THRESHOLD_MS && !notifiedKeysRef.current.has(upcomingKey)) {
          // บันทึก Key เพื่อไม่ให้แจ้งเตือนซ้ำ
          notifiedKeysRef.current.add(upcomingKey);
          saveNotifiedKeysToStorage();

          // สร้างเนื้อหาการแจ้งเตือน
          const newNotif = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            key: upcomingKey,
            type: 'upcoming', // ประเภท: ใกล้ถึงเวลาเริ่มใช้งาน
            title: `ใกล้ถึงเวลาใช้งานตู้ล็อกเกอร์ ${booking.locker_number || ''}`,
            message: `การจองตู้ ${booking.locker_number || ''} จะเริ่มในอีก ${minutesLeft} นาที (เวลา ${formatClock(booking.start_time)}) กรุณาเตรียมตัวเข้าใช้งาน`,
            bookingId: booking.booking_id,
            lockerNumber: booking.locker_number,
            timestamp: new Date().toISOString(),
            read: false,
          };

          dispatchNotification(newNotif);
        }
      }

      // ===================================================================================
      // เงื่อนไขที่ 2: แจ้งเตือนก่อนหมดเวลาจอง/ใช้งาน 10 นาที
      // ===================================================================================
      // ตรวจสอบเมื่อตู้เริ่มใช้งานแล้ว (now >= startTime) และยังไม่เลยเวลาสิ้นสุด (now < endTime)
      if (now >= startTime && now < endTime) {
        const timeUntilEndMs = endTime - now;

        // คำนวณเป็นนาทีที่เหลือ
        const minutesLeft = Math.ceil(timeUntilEndMs / (60 * 1000));

        // ตรวจสอบว่าเหลือเวลาน้อยกว่าหรือเท่ากับ 10 นาที (NOTIFICATION_THRESHOLD_MS)
        // และยังไม่เคยส่งการแจ้งเตือนประเภทนี้สำหรับ booking นี้
        const expiringKey = `expiring_${booking.booking_id}`;

        if (timeUntilEndMs <= NOTIFICATION_THRESHOLD_MS && !notifiedKeysRef.current.has(expiringKey)) {
          // บันทึก Key เพื่อไม่ให้แจ้งเตือนซ้ำ
          notifiedKeysRef.current.add(expiringKey);
          saveNotifiedKeysToStorage();

          // สร้างเนื้อหาการแจ้งเตือน
          const newNotif = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            key: expiringKey,
            type: 'expiring', // ประเภท: ใกล้หมดเวลาการใช้งาน
            title: `ใกล้หมดเวลาใช้งานตู้ล็อกเกอร์ ${booking.locker_number || ''}`,
            message: `ตู้ ${booking.locker_number || ''} จะครบกำหนดในอีก ${minutesLeft} นาที (เวลา ${formatClock(booking.end_time)}) กรุณานำสัมภาระออกและกดคืนตู้`,
            bookingId: booking.booking_id,
            lockerNumber: booking.locker_number,
            timestamp: new Date().toISOString(),
            read: false,
          };

          dispatchNotification(newNotif);
        }
      }
    });
  }, [currentUser, bookings, dispatchNotification, saveNotifiedKeysToStorage]);

  // ---------------------------------------------------------------------------------------
  // 5. ตั้งรอบการตรวจสอบอัตโนมัติ (Polling Check ทุกๆ 5 วินาที)
  // ---------------------------------------------------------------------------------------
  useEffect(() => {
    checkBookingNotifications();
    const intervalId = setInterval(() => {
      checkBookingNotifications();
    }, 5000); // ตรวจสอบทุกๆ 5 วินาทีแบบ Realtime

    return () => clearInterval(intervalId);
  }, [checkBookingNotifications]);

  // ---------------------------------------------------------------------------------------
  // 6. การจัดการสถานะการอ่าน / ปิดหน้าต่าง / ทำความสะอาดรายการ
  // ---------------------------------------------------------------------------------------
  // จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotificationsToStorage(updated);
  };

  // ล้างการแจ้งเตือนทั้งหมด
  const handleClearAll = () => {
    setNotifications([]);
    saveNotificationsToStorage([]);
  };

  // ลบ Toast ชิ้นใดชิ้นหนึ่ง
  const handleDismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ปิด Dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ---------------------------------------------------------------------------------------
  // 7. ฟังก์ชันจำลองการทดสอบระบบแจ้งเตือน (Demo Test Triggers)
  //    ช่วยให้ผู้ใช้หรือผู้ตรวจสามารถกดทดสอบได้ทันทีโดยไม่ต้องรอเวลานับถอยหลัง 10 นาทีจริง
  // ---------------------------------------------------------------------------------------
  const handleTestUpcoming = () => {
    const testNotif = {
      id: 'demo_' + Date.now(),
      type: 'upcoming',
      title: 'ใกล้ถึงเวลาใช้งานตู้ล็อกเกอร์ (ทดสอบ)',
      message: 'การจองตู้ A-01 จะเริ่มใช้งานในอีก 10 นาที กรุณาเตรียมพร้อมเข้าใช้งาน',
      lockerNumber: 'A-01',
      timestamp: new Date().toISOString(),
      read: false,
    };
    dispatchNotification(testNotif);
  };

  const handleTestExpiring = () => {
    const testNotif = {
      id: 'demo_' + Date.now(),
      type: 'expiring',
      title: 'ใกล้หมดเวลาใช้งานตู้ล็อกเกอร์ (ทดสอบ)',
      message: 'ตู้ล็อกเกอร์ B-02 จะครบกำหนดในอีก 10 นาที กรุณานำสัมภาระออกและกดคืนตู้',
      lockerNumber: 'B-02',
      timestamp: new Date().toISOString(),
      read: false,
    };
    dispatchNotification(testNotif);
  };

  // ฟอร์แมตเวลาแสดงผลแบบง่าย
  const formatTimeAgo = (isoString) => {
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'เมื่อสักครู่';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
      return formatClock(date);
    } catch {
      return '';
    }
  };

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      {/* ===================================================================================
          1. ปุ่มกระดิ่งแจ้งเตือนบน Topbar (Notification Bell Button)
          =================================================================================== */}
      <button
        type="button"
        className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''} ${isOpen ? 'active' : ''}`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen && unreadCount > 0) {
            handleMarkAllAsRead();
          }
        }}
        title="การแจ้งเตือนตู้ล็อกเกอร์"
        aria-label="การแจ้งเตือน"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="notif-bell-icon"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* จุดหรือตัวเลขแสดงการแจ้งเตือนที่ยังไม่ได้อ่าน */}
        {unreadCount > 0 && (
          <span className="notif-badge" aria-label={`มี ${unreadCount} การแจ้งเตือนใหม่`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ===================================================================================
          2. แผงเมนูรวมการแจ้งเตือน (Notification Dropdown Panel)
          =================================================================================== */}
      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <div className="notif-header-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span>การแจ้งเตือน</span>
              {unreadCount > 0 && <span className="notif-count-tag">{unreadCount} ใหม่</span>}
            </div>

            <div className="notif-header-actions">
              {notifications.length > 0 && (
                <>
                  <button
                    type="button"
                    className="notif-link-btn"
                    onClick={handleMarkAllAsRead}
                    title="อ่านทั้งหมด"
                  >
                    อ่านทั้งหมด
                  </button>
                  <span className="notif-divider">·</span>
                  <button
                    type="button"
                    className="notif-link-btn"
                    onClick={handleClearAll}
                    title="ล้างประวัติ"
                  >
                    ล้าง
                  </button>
                </>
              )}
            </div>
          </div>

          {/* แถบขออนุญาตเปิดการแจ้งเตือนผ่านเบราว์เซอร์ (Push Notification Banner) */}
          {browserPermission !== 'granted' && (
            <div className="notif-permission-banner">
              <div className="notif-permission-text">
                🔔 รับการแจ้งเตือนผ่านเบราว์เซอร์ล่วงหน้า 10 นาที
              </div>
              <button
                type="button"
                className="notif-permission-btn"
                onClick={requestBrowserPermission}
              >
                เปิดใช้งาน
              </button>
            </div>
          )}

          {/* รายการแจ้งเตือน */}
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <div className="notif-empty-text">ยังไม่มีการแจ้งเตือนในขณะนี้</div>
                <div className="notif-empty-sub">
                  ระบบจะแจ้งเตือนอัตโนมัติก่อนเริ่มจอง 10 นาที และก่อนหมดเวลาใช้งาน 10 นาที
                </div>

                {/* ปุ่มทดสอบระบบ */}
                <div className="notif-test-buttons">
                  <button type="button" className="notif-test-btn" onClick={handleTestUpcoming}>
                    ทดสอบ: เตือนก่อนเริ่ม 10 น.
                  </button>
                  <button type="button" className="notif-test-btn" onClick={handleTestExpiring}>
                    ทดสอบ: เตือนก่อนหมด 10 น.
                  </button>
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`notif-item ${item.read ? 'read' : 'unread'} notif-type-${item.type}`}
                  onClick={() => {
                    // ทำเครื่องหมายว่าอ่านแล้ว และนำทางไปหน้าตู้ของฉัน
                    const updated = notifications.map((n) => (n.id === item.id ? { ...n, read: true } : n));
                    setNotifications(updated);
                    saveNotificationsToStorage(updated);
                    if (onNavigateMine) onNavigateMine();
                    setIsOpen(false);
                  }}
                >
                  <div className="notif-item-icon">
                    {item.type === 'upcoming' ? (
                      // ไอคอนนาฬิกาเตือนก่อนเริ่มใช้งาน
                      <span className="notif-type-badge upcoming" title="ก่อนเริ่มใช้งาน 10 นาที">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </span>
                    ) : (
                      // ไอคอนเตือนใกล้หมดเวลา
                      <span className="notif-type-badge expiring" title="ก่อนหมดเวลา 10 นาที">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-header">
                      <span className="notif-item-title">{item.title}</span>
                      <span className="notif-item-time">{formatTimeAgo(item.timestamp)}</span>
                    </div>
                    <div className="notif-item-body">{item.message}</div>
                    <div className="notif-item-footer">
                      <span className="notif-action-hint">คลิกเพื่อดูตู้ของฉัน →</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* แถบทดสอบด้านล่าง dropdown สำหรับผู้ทดสอบ */}
          {notifications.length > 0 && (
            <div className="notif-dropdown-footer">
              <span className="notif-test-label">ปุ่มทดสอบระบบ:</span>
              <button type="button" className="notif-mini-test-btn" onClick={handleTestUpcoming}>
                + เตือนก่อนเริ่ม 10 น.
              </button>
              <button type="button" className="notif-mini-test-btn" onClick={handleTestExpiring}>
                + เตือนก่อนหมด 10 น.
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================================
          3. แผงแสดง Toast แจ้งเตือนลอยบนหน้าจอ (In-App Toast Container)
          =================================================================================== */}
      <div className="notif-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`notif-toast-card notif-toast-${toast.type}`}
            role="alert"
          >
            <div className="notif-toast-indicator" />
            <div className="notif-toast-icon">
              {toast.type === 'upcoming' ? (
                <div className="toast-icon-circle upcoming">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 16 14" />
                  </svg>
                </div>
              ) : (
                <div className="toast-icon-circle expiring">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
              )}
            </div>

            <div className="notif-toast-body">
              <div className="notif-toast-badge-row">
                <span className={`notif-toast-badge ${toast.type}`}>
                  {toast.type === 'upcoming' ? '⏰ แจ้งเตือนก่อนเริ่ม 10 นาที' : '⚠️ แจ้งเตือนก่อนหมดเวลา 10 นาที'}
                </span>
                <span className="notif-toast-time">เมื่อสักครู่</span>
              </div>
              <h4 className="notif-toast-title">{toast.title}</h4>
              <p className="notif-toast-msg">{toast.message}</p>
              
              <div className="notif-toast-actions">
                <button
                  type="button"
                  className="notif-toast-action-btn"
                  onClick={() => {
                    handleDismissToast(toast.id);
                    if (onNavigateMine) onNavigateMine();
                  }}
                >
                  ไปที่ตู้ของฉัน →
                </button>
              </div>
            </div>

            <button
              type="button"
              className="notif-toast-close"
              onClick={() => handleDismissToast(toast.id)}
              aria-label="ปิดการแจ้งเตือน"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
