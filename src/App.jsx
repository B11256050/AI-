import React, { useState, useEffect } from 'react';
import './App.css'; // 引入分離出來的 CSS 樣式檔
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, getDoc, setDoc, 
  onSnapshot, addDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  Calendar, User, Phone, Home, Settings as SettingsIcon, 
  LogOut, CheckCircle, XCircle, Trash2, Edit, Plus, Info, Lock
} from 'lucide-react';

// ==========================================
// 1. Firebase 初始化配置 (使用您提供的設定)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyA3gqtrCyH4VLTDqmoWTXOn0ITCny3CNT0",
  authDomain: "b11256050.firebaseapp.com",
  projectId: "b11256050",
  storageBucket: "b11256050.firebasestorage.app",
  messagingSenderId: "822316205818",
  appId: "1:822316205818:web:a7b0c099d2a69dee65ab43",
  measurementId: "G-6JSBFLE98K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. 主應用程式組件
// ==========================================
export default function App() {
  // 系統狀態
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('customer'); // 'customer' | 'admin'
  const [adminTab, setAdminTab] = useState('rooms'); // 'rooms' | 'orders' | 'settings'
  const [customerTab, setCustomerTab] = useState('book'); // 'book' | 'my-orders'
  
  // 資料狀態
  const [rooms, setRooms] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminConfig, setAdminConfig] = useState(null);
  
  // 權限與表單狀態
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  
  // 浮動視窗 (Modal) 狀態
  const [activeModal, setActiveModal] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [searchPhone, setSearchPhone] = useState('');

  // 初始化資料與監聽 Firestore
  useEffect(() => {
    // 檢查 LocalStorage 的登入紀錄
    const localAuth = localStorage.getItem('adminAuth');
    if (localAuth === 'true') setIsAdminAuth(true);

    const initSystem = async () => {
      try {
        // 1. 確認並初始化管理員密碼設定
        const settingsRef = doc(db, 'settings', 'admin');
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
          await setDoc(settingsRef, { password: '1234' });
          setAdminConfig({ password: '1234' });
        } else {
          setAdminConfig(settingsSnap.data());
        }

        // 2. 訂閱房型資料
        const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
          const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRooms(roomData);
        });

        // 3. 訂閱訂單資料
        const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
          const orderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // JavaScript 記憶體中降序排列 (依建立時間)
          orderData.sort((a, b) => b.createdAt - a.createdAt);
          setOrders(orderData);
          setLoading(false); // 資料抓取完畢，解除載入畫面
        });

        return () => {
          unsubRooms();
          unsubOrders();
        };
      } catch (error) {
        console.error("系統初始化錯誤：", error);
        alert("無法連線至資料庫，請確認 Firebase 規則已設定為公開測試。");
        setLoading(false);
      }
    };

    initSystem();
  }, []);

  // ==========================================
  // 通用函式庫
  // ==========================================
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (loginPassword === adminConfig?.password) {
      setIsAdminAuth(true);
      localStorage.setItem('adminAuth', 'true');
      setLoginPassword('');
    } else {
      alert("密碼錯誤！");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuth(false);
    localStorage.removeItem('adminAuth');
    setViewMode('customer');
  };

  // 檢查日期重疊 (防重複訂房機制)
  const checkOverlap = (roomId, checkIn, checkOut, excludeOrderId = null) => {
    const newIn = new Date(checkIn).getTime();
    const newOut = new Date(checkOut).getTime();
    
    // 過濾出同一間房、且非「取消」狀態的訂單
    const roomOrders = orders.filter(o => o.roomId === roomId && o.status !== 'cancelled' && o.id !== excludeOrderId);
    
    return roomOrders.some(o => {
      const existIn = new Date(o.checkInDate).getTime();
      const existOut = new Date(o.checkOutDate).getTime();
      // 重疊條件：新入住時間小於舊退房時間 且 新退房時間大於舊入住時間
      return (newIn < existOut && newOut > existIn);
    });
  };

  // 格式化日期顯示
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // ==========================================
  // UI 區塊：載入畫面
  // ==========================================
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <h2 className="loading-title">系統載入中...</h2>
        <p className="loading-subtitle">請稍候，正在同步雲端資料</p>
      </div>
    );
  }

  // ==========================================
  // UI 區塊：主渲染
  // ==========================================
  return (
    <div className="app-container">
      {/* 導覽列 */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-content">
            <div className="nav-brand">
              <Home />
              <span>雲端悠遊民宿</span>
            </div>
            <div className="nav-actions">
              <button 
                onClick={() => setViewMode('customer')}
                className={`nav-btn ${viewMode === 'customer' ? 'active' : ''}`}
              >
                顧客首頁
              </button>
              <button 
                onClick={() => setViewMode('admin')}
                className={`nav-btn nav-btn-admin ${viewMode === 'admin' ? 'active' : ''}`}
              >
                <SettingsIcon /> <span>後台管理</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 內容區塊 */}
      <main className="main-content">
        
        {/* ==================== 顧客視圖 ==================== */}
        {viewMode === 'customer' && (
          <div>
            {/* 顧客標籤切換 */}
            <div className="customer-tabs-container">
              <div className="customer-tabs-wrapper">
                <button 
                  onClick={() => setCustomerTab('book')}
                  className={`tab-btn ${customerTab === 'book' ? 'active' : ''}`}
                >
                  探索房型
                </button>
                <button 
                  onClick={() => setCustomerTab('my-orders')}
                  className={`tab-btn ${customerTab === 'my-orders' ? 'active' : ''}`}
                >
                  查詢訂單
                </button>
              </div>
            </div>

            {/* 探索房型列表 */}
            {customerTab === 'book' && (
              <div className="room-grid">
                {rooms.length === 0 ? (
                  <div className="empty-message">
                    目前暫無開放房型，請稍後再試。
                  </div>
                ) : (
                  rooms.map(room => (
                    <div key={room.id} className="room-card">
                      <div className="room-image-wrapper">
                        {room.imageUrl ? (
                          <img src={room.imageUrl} alt={room.name} className="room-image" onError={(e) => e.target.style.display='none'} />
                        ) : (
                          <div className="room-placeholder"><Home /></div>
                        )}
                        <div className="room-price-tag">
                          ${room.price} / 晚
                        </div>
                      </div>
                      <div className="room-content">
                        <h3 className="room-title">{room.name}</h3>
                        <p className="room-desc">{room.description || '無描述'}</p>
                        <div className="room-meta">
                          <span className="room-meta-item"><User /> {room.capacity} 人</span>
                        </div>
                        <button 
                          onClick={() => { setCurrentData({ room }); setActiveModal('book-room'); }}
                          className="btn-primary"
                        >
                          立即預訂
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 顧客訂單查詢 */}
            {customerTab === 'my-orders' && (
              <div className="search-section">
                <div className="search-box">
                  <h3 className="search-header"><Phone /> 輸入手機號碼查詢</h3>
                  <div className="search-input-group">
                    <input 
                      type="tel" 
                      placeholder="例如: 0912345678" 
                      className="form-input"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="order-list">
                  {searchPhone.length >= 8 && orders.filter(o => o.phone.includes(searchPhone)).length === 0 && (
                    <div className="order-empty">找不到符合的訂單記錄。</div>
                  )}
                  {searchPhone.length >= 8 && orders.filter(o => o.phone.includes(searchPhone)).map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-info-group">
                        <div className="order-title-row">
                          <span className={`order-status status-${order.status}`}>
                            {order.status === 'confirmed' ? '已確認' : order.status === 'cancelled' ? '已取消' : '處理中'}
                          </span>
                          <h4 className="order-room-title">{order.roomName}</h4>
                        </div>
                        <p className="order-dates">入住: {order.checkInDate} | 退房: {order.checkOutDate}</p>
                        <p className="order-time">訂單建立於: {formatDate(order.createdAt)}</p>
                      </div>
                      {order.status !== 'cancelled' && (
                        <button 
                          onClick={async () => {
                            if(window.confirm('確定要取消這筆訂單嗎？')) {
                              await updateDoc(doc(db, 'orders', order.id), { status: 'cancelled' });
                              alert('訂單已取消');
                            }
                          }}
                          className="btn-danger"
                        >
                          取消訂單
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 後台管理視圖 ==================== */}
        {viewMode === 'admin' && (
          <div>
            {!isAdminAuth ? (
              // 後台登入區塊
              <div className="admin-login-wrapper">
                <div className="admin-login-header">
                  <div className="admin-login-icon-box">
                    <Lock />
                  </div>
                  <h2 className="admin-login-title">後台登入</h2>
                  <p className="admin-login-subtitle">請輸入管理員密碼以進入系統</p>
                </div>
                <form onSubmit={handleAdminLogin} className="admin-login-form">
                  <div>
                    <input 
                      type="password" 
                      placeholder="請輸入密碼 (預設1234)" 
                      required
                      className="form-input"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-dark">
                    登入
                  </button>
                </form>
              </div>
            ) : (
              // 後台主儀表板
              <div className="admin-dashboard">
                {/* 側邊欄 */}
                <div className="admin-sidebar">
                  <div className="sidebar-header">
                    <span className="sidebar-title">管理選單</span>
                    <button onClick={handleAdminLogout} className="btn-logout" title="登出">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="sidebar-menu">
                    <button onClick={() => setAdminTab('rooms')} className={`sidebar-btn ${adminTab === 'rooms' ? 'active' : ''}`}>
                      <Home className="w-5 h-5" /> 房型管理
                    </button>
                    <button onClick={() => setAdminTab('orders')} className={`sidebar-btn ${adminTab === 'orders' ? 'active' : ''}`}>
                      <Calendar className="w-5 h-5" /> 訂單管理
                    </button>
                    <button onClick={() => setAdminTab('settings')} className={`sidebar-btn ${adminTab === 'settings' ? 'active' : ''}`}>
                      <SettingsIcon className="w-5 h-5" /> 系統設定
                    </button>
                  </div>
                </div>

                {/* 後台內容區 */}
                <div className="admin-main-content">
                  
                  {/* 房型管理 */}
                  {adminTab === 'rooms' && (
                    <div>
                      <div className="admin-section-header">
                        <h2 className="admin-section-title">房型列表</h2>
                        <button 
                          onClick={() => { setCurrentData(null); setActiveModal('admin-room-form'); }}
                          className="btn-add"
                        >
                          <Plus className="w-4 h-4"/> 新增房型
                        </button>
                      </div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>圖片/名稱</th>
                              <th>價格</th>
                              <th>容納人數</th>
                              <th>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rooms.map(room => (
                              <tr key={room.id}>
                                <td className="table-cell-img-title">
                                  <div className="table-img-wrapper">
                                    {room.imageUrl ? <img src={room.imageUrl} className="table-img"/> : <Home className="table-placeholder" />}
                                  </div>
                                  <span className="table-title">{room.name}</span>
                                </td>
                                <td>${room.price}</td>
                                <td>{room.capacity} 人</td>
                                <td>
                                  <div className="table-actions">
                                    <button onClick={() => { setCurrentData(room); setActiveModal('admin-room-form'); }} className="btn-icon btn-icon-edit" title="編輯">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={async () => {
                                      if(window.confirm('確定刪除此房型？')) await deleteDoc(doc(db, 'rooms', room.id));
                                    }} className="btn-icon btn-icon-delete" title="刪除">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {rooms.length === 0 && <tr><td colSpan="4" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-slate-500)'}}>暫無房型資料</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 訂單管理 */}
                  {adminTab === 'orders' && (
                    <div>
                      <h2 className="admin-section-title" style={{marginBottom: '1.5rem'}}>所有訂單 (依日期降序)</h2>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>顧客資訊</th>
                              <th>預訂房型</th>
                              <th>入住期間</th>
                              <th>狀態</th>
                              <th>建立時間</th>
                              <th>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(order => (
                              <tr key={order.id}>
                                <td>
                                  <div className="table-title">{order.customerName}</div>
                                  <div className="order-time">{order.phone}</div>
                                </td>
                                <td>{order.roomName}</td>
                                <td style={{fontSize: '0.875rem'}}>
                                  {order.checkInDate} <br/>至 {order.checkOutDate}
                                </td>
                                <td>
                                  <select 
                                    className={`status-select status-text-${order.status}`}
                                    value={order.status}
                                    onChange={async (e) => {
                                      await updateDoc(doc(db, 'orders', order.id), { status: e.target.value });
                                    }}
                                  >
                                    <option value="pending">處理中</option>
                                    <option value="confirmed">已確認</option>
                                    <option value="cancelled">已取消</option>
                                  </select>
                                </td>
                                <td style={{fontSize: '0.75rem', color: 'var(--text-slate-500)'}}>{formatDate(order.createdAt)}</td>
                                <td>
                                  <div className="table-actions">
                                    <button onClick={() => { setCurrentData(order); setActiveModal('admin-order-edit'); }} className="btn-icon btn-icon-edit" title="編輯">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={async () => {
                                      if(window.confirm('確定刪除此訂單記錄？刪除後無法復原。')) await deleteDoc(doc(db, 'orders', order.id));
                                    }} className="btn-icon btn-icon-delete" title="刪除">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {orders.length === 0 && <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-slate-500)'}}>暫無訂單記錄</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 系統設定 */}
                  {adminTab === 'settings' && (
                    <div style={{ maxWidth: '28rem' }}>
                      <h2 className="admin-section-title" style={{marginBottom: '1.5rem'}}>系統安全設定</h2>
                      <div className="settings-card">
                        <h3 className="settings-header"><Lock className="w-4 h-4"/> 變更後台登入密碼</h3>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const newPwd = e.target.newPwd.value;
                          await updateDoc(doc(db, 'settings', 'admin'), { password: newPwd });
                          setAdminConfig({ password: newPwd });
                          alert('密碼已成功更新！');
                          e.target.reset();
                        }} className="modal-form">
                          <div className="form-group">
                            <label className="form-label">新密碼</label>
                            <input type="text" name="newPwd" required className="form-input" />
                          </div>
                          <button type="submit" className="btn-dark">
                            儲存設定
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==================== 浮動視窗 (Modals) ==================== */}
      {activeModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            
            <button onClick={() => setActiveModal(null)} className="btn-close-modal">
              <XCircle className="w-6 h-6" />
            </button>

            {/* Modal: 顧客預訂房間 */}
            {activeModal === 'book-room' && currentData?.room && (
              <div className="modal-body">
                <h2 className="modal-title">預訂 {currentData.room.name}</h2>
                <p className="modal-subtitle">請填寫您的聯絡資訊與入住時間</p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData.entries());
                  
                  if (new Date(data.checkInDate) >= new Date(data.checkOutDate)) {
                    return alert('退房日期必須晚於入住日期！');
                  }
                  
                  if (checkOverlap(currentData.room.id, data.checkInDate, data.checkOutDate)) {
                    return alert('很抱歉，該區間已有其他人預訂，請選擇其他日期。');
                  }

                  const orderData = {
                    ...data,
                    roomId: currentData.room.id,
                    roomName: currentData.room.name,
                    status: 'pending',
                    createdAt: new Date().getTime()
                  };

                  try {
                    await addDoc(collection(db, 'orders'), orderData);
                    alert('預訂成功！請記住您的手機號碼以利查詢。');
                    setActiveModal(null);
                    setCustomerTab('my-orders');
                    setSearchPhone(data.phone);
                  } catch (err) {
                    alert('預訂失敗，請重試。');
                  }
                }} className="modal-form">
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">姓名</label>
                      <input type="text" name="customerName" required className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">手機號碼</label>
                      <input type="tel" name="phone" required className="form-input" />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">入住日期</label>
                      <input type="date" name="checkInDate" required min={new Date().toISOString().split('T')[0]} className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">退房日期</label>
                      <input type="date" name="checkOutDate" required min={new Date().toISOString().split('T')[0]} className="form-input" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      確認送出訂單
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal: 後台管理房型 (新增/編輯) */}
            {activeModal === 'admin-room-form' && (
              <div className="modal-body">
                <h2 className="modal-title">{currentData ? '編輯房型' : '新增房型'}</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData.entries());
                  
                  if (currentData?.id) {
                    await updateDoc(doc(db, 'rooms', currentData.id), data);
                  } else {
                    await addDoc(collection(db, 'rooms'), data);
                  }
                  setActiveModal(null);
                }} className="modal-form">
                  <div className="form-group">
                    <label className="form-label">房型名稱</label>
                    <input type="text" name="name" defaultValue={currentData?.name || ''} required className="form-input" />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">每晚價格</label>
                      <input type="number" name="price" defaultValue={currentData?.price || ''} required className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">容納人數</label>
                      <input type="number" name="capacity" defaultValue={currentData?.capacity || ''} required className="form-input" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">圖片網址 (URL)</label>
                    <input type="url" name="imageUrl" defaultValue={currentData?.imageUrl || ''} placeholder="https://..." className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">房型描述</label>
                    <textarea name="description" defaultValue={currentData?.description || ''} rows="3" className="form-textarea"></textarea>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-dark">
                      儲存房型
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal: 後台編輯訂單日期 */}
            {activeModal === 'admin-order-edit' && currentData && (
              <div className="modal-body">
                <h2 className="modal-title">編輯訂單資訊</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData.entries());
                  
                  if (new Date(data.checkInDate) >= new Date(data.checkOutDate)) {
                    return alert('退房日期必須晚於入住日期！');
                  }

                  if (checkOverlap(currentData.roomId, data.checkInDate, data.checkOutDate, currentData.id)) {
                    return alert('修改後的日期與該房型其他訂單衝突！');
                  }

                  await updateDoc(doc(db, 'orders', currentData.id), {
                    checkInDate: data.checkInDate,
                    checkOutDate: data.checkOutDate,
                    customerName: data.customerName,
                    phone: data.phone
                  });
                  alert('訂單更新成功');
                  setActiveModal(null);
                }} className="modal-form">
                   <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">顧客姓名</label>
                      <input type="text" name="customerName" defaultValue={currentData.customerName} required className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">聯絡電話</label>
                      <input type="tel" name="phone" defaultValue={currentData.phone} required className="form-input" />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">入住日期</label>
                      <input type="date" name="checkInDate" defaultValue={currentData.checkInDate} required className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">退房日期</label>
                      <input type="date" name="checkOutDate" defaultValue={currentData.checkOutDate} required className="form-input" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-dark">
                      更新訂單
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
