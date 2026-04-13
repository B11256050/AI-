import React, { useState, useEffect } from 'react';
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
// 1. Firebase 初始化配置
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
  
  // 浮動視窗 (Modal) 與 自訂提示 狀態
  const [activeModal, setActiveModal] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [searchPhone, setSearchPhone] = useState('');
  
  const [toastMessage, setToastMessage] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // 自訂提示框函式
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const showConfirm = (message, onConfirmCallback) => {
    setConfirmDialog({
      message,
      onConfirm: onConfirmCallback
    });
  };

  // 初始化資料與監聽 Firestore
  useEffect(() => {
    const localAuth = localStorage.getItem('adminAuth');
    if (localAuth === 'true') setIsAdminAuth(true);

    const initSystem = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'admin');
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
          await setDoc(settingsRef, { password: '1234' });
          setAdminConfig({ password: '1234' });
        } else {
          setAdminConfig(settingsSnap.data());
        }

        const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
          const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRooms(roomData);
        });

        const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
          const orderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          orderData.sort((a, b) => b.createdAt - a.createdAt);
          setOrders(orderData);
          setLoading(false);
        });

        return () => {
          unsubRooms();
          unsubOrders();
        };
      } catch (error) {
        console.error("系統初始化錯誤：", error);
        showToast("無法連線至資料庫，請確認 Firebase 規則設定");
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
      showToast("登入成功！");
    } else {
      showToast("密碼錯誤！請重試。");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuth(false);
    localStorage.removeItem('adminAuth');
    setViewMode('customer');
    showToast("已成功登出");
  };

  // 檢查日期重疊
  const checkOverlap = (roomId, checkIn, checkOut, excludeOrderId = null) => {
    const newIn = new Date(checkIn).getTime();
    const newOut = new Date(checkOut).getTime();
    
    const roomOrders = orders.filter(o => o.roomId === roomId && o.status !== 'cancelled' && o.id !== excludeOrderId);
    
    return roomOrders.some(o => {
      const existIn = new Date(o.checkInDate).getTime();
      const existOut = new Date(o.checkOutDate).getTime();
      return (newIn < existOut && newOut > existIn);
    });
  };

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
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-2xl font-bold text-slate-700 tracking-widest animate-pulse">系統載入中...</h2>
        <p className="text-slate-500 mt-2">請稍候，正在同步雲端資料</p>
      </div>
    );
  }

  // ==========================================
  // UI 區塊：主渲染
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      
      {/* 自訂通知 Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl z-[100] animate-bounce flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 自訂確認視窗 Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">確認操作</h3>
            <p className="text-slate-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog(null)} 
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 導覽列 */}
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Home className="text-blue-600 w-6 h-6" />
              <span className="font-bold text-xl tracking-wide text-slate-800">雲端悠遊民宿</span>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <button 
                onClick={() => setViewMode('customer')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'customer' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                顧客首頁
              </button>
              <button 
                onClick={() => setViewMode('admin')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'admin' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <SettingsIcon className="w-4 h-4" /> <span>後台管理</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 內容區塊 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ==================== 顧客視圖 ==================== */}
        {viewMode === 'customer' && (
          <div>
            {/* 顧客標籤切換 */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                <button 
                  onClick={() => setCustomerTab('book')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${customerTab === 'book' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  探索房型
                </button>
                <button 
                  onClick={() => setCustomerTab('my-orders')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${customerTab === 'my-orders' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  查詢訂單
                </button>
              </div>
            </div>

            {/* 探索房型列表 */}
            {customerTab === 'book' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
                    目前暫無開放房型，請稍後再試。
                  </div>
                ) : (
                  rooms.map(room => (
                    <div key={room.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col">
                      <div className="h-48 bg-slate-200 relative">
                        {room.imageUrl ? (
                          <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400"><Home className="w-12 h-12 opacity-50" /></div>
                        )}
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-blue-600 shadow-sm">
                          ${room.price} / 晚
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{room.name}</h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{room.description || '無描述'}</p>
                        <div className="flex items-center text-sm text-slate-500 mb-5 gap-4">
                          <span className="flex items-center gap-1"><User className="w-4 h-4"/> {room.capacity} 人</span>
                        </div>
                        <button 
                          onClick={() => { setCurrentData({ room }); setActiveModal('book-room'); }}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
              <div className="max-w-3xl mx-auto">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Phone className="w-5 h-5"/> 輸入手機號碼查詢</h3>
                  <div className="flex gap-2">
                    <input 
                      type="tel" 
                      placeholder="例如: 0912345678" 
                      className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {searchPhone.length >= 8 && orders.filter(o => o.phone.includes(searchPhone)).length === 0 && (
                    <div className="text-center py-8 text-slate-500">找不到符合的訂單記錄。</div>
                  )}
                  {searchPhone.length >= 8 && orders.filter(o => o.phone.includes(searchPhone)).map(order => (
                    <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            order.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status === 'confirmed' ? '已確認' : order.status === 'cancelled' ? '已取消' : '處理中'}
                          </span>
                          <h4 className="font-bold text-lg">{order.roomName}</h4>
                        </div>
                        <p className="text-sm text-slate-500">入住: {order.checkInDate} | 退房: {order.checkOutDate}</p>
                        <p className="text-xs text-slate-400 mt-1">訂單建立於: {formatDate(order.createdAt)}</p>
                      </div>
                      {order.status !== 'cancelled' && (
                        <button 
                          onClick={() => {
                            showConfirm('確定要取消這筆訂單嗎？操作後將不可回復。', async () => {
                              await updateDoc(doc(db, 'orders', order.id), { status: 'cancelled' });
                              showToast('訂單已成功取消');
                            });
                          }}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors border border-red-200"
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
              <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl shadow-md border border-slate-200 p-8">
                <div className="text-center mb-6">
                  <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-slate-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">後台登入</h2>
                  <p className="text-sm text-slate-500 mt-2">請輸入管理員密碼以進入系統</p>
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <input 
                      type="password" 
                      placeholder="請輸入密碼 (預設1234)" 
                      required
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-800 focus:outline-none"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-bold transition-colors">
                    登入
                  </button>
                </form>
              </div>
            ) : (
              // 後台主儀表板
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* 側邊欄 */}
                <div className="w-full md:w-64 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 shrink-0">
                  <div className="flex items-center justify-between mb-6 px-2">
                    <span className="font-bold text-slate-700">管理選單</span>
                    <button onClick={handleAdminLogout} className="text-slate-400 hover:text-red-500" title="登出">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <button onClick={() => setAdminTab('rooms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${adminTab === 'rooms' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <Home className="w-5 h-5" /> 房型管理
                    </button>
                    <button onClick={() => setAdminTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${adminTab === 'orders' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <Calendar className="w-5 h-5" /> 訂單管理
                    </button>
                    <button onClick={() => setAdminTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${adminTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <SettingsIcon className="w-5 h-5" /> 系統設定
                    </button>
                  </div>
                </div>

                {/* 後台內容區 */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full overflow-x-auto">
                  
                  {/* 房型管理 */}
                  {adminTab === 'rooms' && (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">房型列表</h2>
                        <button 
                          onClick={() => { setCurrentData(null); setActiveModal('admin-room-form'); }}
                          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          <Plus className="w-4 h-4"/> 新增房型
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                              <th className="p-4 font-medium rounded-tl-lg">圖片/名稱</th>
                              <th className="p-4 font-medium">價格</th>
                              <th className="p-4 font-medium">容納人數</th>
                              <th className="p-4 font-medium rounded-tr-lg">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rooms.map(room => (
                              <tr key={room.id} className="hover:bg-slate-50">
                                <td className="p-4 flex items-center gap-3">
                                  <div className="w-12 h-12 bg-slate-200 rounded object-cover flex-shrink-0 overflow-hidden">
                                    {room.imageUrl ? <img src={room.imageUrl} className="w-full h-full object-cover" alt="room"/> : <Home className="w-6 h-6 m-3 text-slate-400" />}
                                  </div>
                                  <span className="font-medium">{room.name}</span>
                                </td>
                                <td className="p-4 text-slate-600">${room.price}</td>
                                <td className="p-4 text-slate-600">{room.capacity} 人</td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <button onClick={() => { setCurrentData(room); setActiveModal('admin-room-form'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="編輯">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => {
                                      showConfirm('確定刪除此房型？此操作無法復原。', async () => {
                                        await deleteDoc(doc(db, 'rooms', room.id));
                                        showToast('房型已刪除');
                                      });
                                    }} className="p-2 text-red-600 hover:bg-red-50 rounded" title="刪除">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {rooms.length === 0 && <tr><td colSpan="4" className="text-center p-8 text-slate-500">暫無房型資料</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 訂單管理 */}
                  {adminTab === 'orders' && (
                    <div>
                      <h2 className="text-xl font-bold mb-6">所有訂單 (依日期降序)</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                              <th className="p-4 font-medium rounded-tl-lg">顧客資訊</th>
                              <th className="p-4 font-medium">預訂房型</th>
                              <th className="p-4 font-medium">入住期間</th>
                              <th className="p-4 font-medium">狀態</th>
                              <th className="p-4 font-medium">建立時間</th>
                              <th className="p-4 font-medium rounded-tr-lg">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {orders.map(order => (
                              <tr key={order.id} className="hover:bg-slate-50">
                                <td className="p-4">
                                  <div className="font-medium text-slate-800">{order.customerName}</div>
                                  <div className="text-xs text-slate-500">{order.phone}</div>
                                </td>
                                <td className="p-4 text-slate-600">{order.roomName}</td>
                                <td className="p-4 text-sm text-slate-600">
                                  {order.checkInDate} <br/>至 {order.checkOutDate}
                                </td>
                                <td className="p-4">
                                  <select 
                                    className={`text-sm border-0 bg-transparent font-medium cursor-pointer focus:ring-0 outline-none ${
                                      order.status === 'confirmed' ? 'text-green-600' : 
                                      order.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                                    }`}
                                    value={order.status}
                                    onChange={async (e) => {
                                      await updateDoc(doc(db, 'orders', order.id), { status: e.target.value });
                                      showToast('訂單狀態已更新');
                                    }}
                                  >
                                    <option value="pending">處理中</option>
                                    <option value="confirmed">已確認</option>
                                    <option value="cancelled">已取消</option>
                                  </select>
                                </td>
                                <td className="p-4 text-xs text-slate-500">{formatDate(order.createdAt)}</td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <button onClick={() => { setCurrentData(order); setActiveModal('admin-order-edit'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="編輯">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => {
                                      showConfirm('確定刪除此訂單記錄？刪除後無法復原。', async () => {
                                        await deleteDoc(doc(db, 'orders', order.id));
                                        showToast('訂單記錄已刪除');
                                      });
                                    }} className="p-2 text-red-600 hover:bg-red-50 rounded" title="刪除">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {orders.length === 0 && <tr><td colSpan="6" className="text-center p-8 text-slate-500">暫無訂單記錄</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 系統設定 */}
                  {adminTab === 'settings' && (
                    <div className="max-w-md">
                      <h2 className="text-xl font-bold mb-6">系統安全設定</h2>
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h3 className="font-medium mb-4 flex items-center gap-2"><Lock className="w-4 h-4"/> 變更後台登入密碼</h3>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const newPwd = e.target.newPwd.value;
                          await updateDoc(doc(db, 'settings', 'admin'), { password: newPwd });
                          setAdminConfig({ password: newPwd });
                          showToast('後台密碼已成功更新！');
                          e.target.reset();
                        }}>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm text-slate-600 mb-1">新密碼</label>
                              <input type="text" name="newPwd" required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 transition-colors">
                              儲存設定
                            </button>
                          </div>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-auto relative animate-in zoom-in duration-200">
            
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 transition-colors">
              <XCircle className="w-6 h-6" />
            </button>

            {/* Modal: 顧客預訂房間 */}
            {activeModal === 'book-room' && currentData?.room && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">預訂 {currentData.room.name}</h2>
                <p className="text-sm text-slate-500 mb-6 border-b pb-4">請填寫您的聯絡資訊與入住時間</p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData.entries());
                  
                  if (new Date(data.checkInDate) >= new Date(data.checkOutDate)) {
                    return showToast('退房日期必須晚於入住日期！');
                  }
                  
                  if (checkOverlap(currentData.room.id, data.checkInDate, data.checkOutDate)) {
                    return showToast('很抱歉，該區間已有其他人預訂，請選擇其他日期。');
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
                    showToast('預訂成功！請記住您的手機號碼以利查詢。');
                    setActiveModal(null);
                    setCustomerTab('my-orders');
                    setSearchPhone(data.phone);
                  } catch (err) {
                    showToast('預訂失敗，請檢查網路連線或重試。');
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">姓名</label>
                      <input type="text" name="customerName" required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">手機號碼</label>
                      <input type="tel" name="phone" required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">入住日期</label>
                      <input type="date" name="checkInDate" required min={new Date().toISOString().split('T')[0]} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">退房日期</label>
                      <input type="date" name="checkOutDate" required min={new Date().toISOString().split('T')[0]} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                    </div>
                  </div>
                  <div className="pt-4">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
                      確認送出訂單
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal: 後台管理房型 (新增/編輯) */}
            {activeModal === 'admin-room-form' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">{currentData ? '編輯房型' : '新增房型'}</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData.entries());
                  
                  if (currentData?.id) {
                    await updateDoc(doc(db, 'rooms', currentData.id), data);
                    showToast('房型已成功更新');
                  } else {
                    await addDoc(collection(db, 'rooms'), data);
                    showToast('已成功新增房型');
                  }
                  setActiveModal(null);
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">房型名稱</label>
                    <input type="text" name="name" defaultValue={currentData?.name || ''} required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">每晚價格</label>
                      <input type="number" name="price" defaultValue={currentData?.price || ''} required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">容納人數</label>
                      <input type="number" name="capacity" defaultValue={currentData?.capacity || ''} required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">圖片網址 (URL)</label>
                    <input type="url" name="imageUrl" defaultValue={currentData?.imageUrl || ''} placeholder="https://..." className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">房型描述</label>
                    <textarea name="description" defaultValue={currentData?.description || ''} rows="3" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                  </div>
                  <div className="pt-4">
                    <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-colors">
                      儲存房型
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal: 後台編輯訂單日期 */}
            {activeModal === 'admin-order-edit' && currentData && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">編輯訂單資訊</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData.entries());
                  
                  if (new Date(data.checkInDate) >= new Date(data.checkOutDate)) {
                    return showToast('退房日期必須晚於入住日期！');
                  }

                  if (checkOverlap(currentData.roomId, data.checkInDate, data.checkOutDate, currentData.id)) {
                    return showToast('修改後的日期與該房型其他訂單衝突！');
                  }

                  await updateDoc(doc(db, 'orders', currentData.id), {
                    checkInDate: data.checkInDate,
                    checkOutDate: data.checkOutDate,
                    customerName: data.customerName,
                    phone: data.phone
                  });
                  showToast('訂單資料已更新成功');
                  setActiveModal(null);
                }} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">顧客姓名</label>
                      <input type="text" name="customerName" defaultValue={currentData.customerName} required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">聯絡電話</label>
                      <input type="tel" name="phone" defaultValue={currentData.phone} required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">入住日期</label>
                      <input type="date" name="checkInDate" defaultValue={currentData.checkInDate} required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">退房日期</label>
                      <input type="date" name="checkOutDate" defaultValue={currentData.checkOutDate} required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div className="pt-4">
                    <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-colors">
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
