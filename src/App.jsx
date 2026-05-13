import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Plus, Edit2, Trash2, DollarSign, ArrowUpCircle, ArrowDownCircle, Settings, LogOut, LayoutDashboard, Loader2, Save } from 'lucide-react';

// ==========================================
// 1. Firebase 初始化配置
// ==========================================
const fallbackConfig = {
  apiKey: "AIzaSyC3d5TBwtsWSurQVxPKIbmmzMtEkfzYqz8",
  authDomain: "ai-b2655.firebaseapp.com",
  projectId: "ai-b2655",
  storageBucket: "ai-b2655.firebasestorage.app",
  messagingSenderId: "55490465041",
  appId: "1:55490465041:web:d11ef24e7fbc34f83c90b0",
  measurementId: "G-CV1SE624RB"
};

// 兼容平台環境變數或使用用戶提供的配置
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : fallbackConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'bnb-system-default';

// ==========================================
// 2. 主應用程式組件
// ==========================================
export default function App() {
  // 系統狀態
  const [initialLoading, setInitialLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [systemPassword, setSystemPassword] = useState('1234');
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'settings'
  const [errorMsg, setErrorMsg] = useState('');

  // 資料狀態
  const [transactions, setTransactions] = useState([]);
  
  // 表單狀態
  const initialFormState = { date: new Date().toISOString().split('T')[0], type: 'income', category: '', amount: '', note: '' };
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 登入表單狀態
  const [inputPassword, setInputPassword] = useState('');

  // ==========================================
  // 3. 初始化與資料綁定
  // ==========================================
  useEffect(() => {
    let unsubscribeSnapshot = () => {};

    const initSystem = async () => {
      try {
        // A. 處理 Firebase 匿名登入 (確保後續可讀寫)
        if (!auth.currentUser) {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        }
        setFirebaseUser(auth.currentUser);

        // B. 讀取或初始化系統密碼設定
        const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          setSystemPassword(snap.data().password);
        } else {
          await setDoc(settingsRef, { password: '1234' });
        }

        // C. 檢查 LocalStorage 的登入狀態
        const localAuth = localStorage.getItem('bnb_system_auth');
        if (localAuth === 'true') {
          setIsLoggedIn(true);
        }

        // D. 綁定交易紀錄 (即時更新)
        const transRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
        unsubscribeSnapshot = onSnapshot(transRef, (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          // 在記憶體中進行降序排列 (避免複雜查詢引發的索引錯誤)
          data.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTransactions(data);
          setInitialLoading(false);
        }, (error) => {
          console.error("資料讀取失敗:", error);
          setErrorMsg("資料庫讀取失敗，請稍後再試。");
          setInitialLoading(false);
        });

      } catch (err) {
        console.error("系統初始化失敗:", err);
        setErrorMsg("系統連線異常");
        setInitialLoading(false);
      }
    };

    initSystem();

    return () => {
      unsubscribeSnapshot();
    };
  }, []);

  // ==========================================
  // 4. 統計計算
  // ==========================================
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += Number(t.amount);
      if (t.type === 'expense') totalExpense += Number(t.amount);
    });
    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [transactions]);

  // ==========================================
  // 5. 處理邏輯
  // ==========================================
  const handleLogin = (e) => {
    e.preventDefault();
    if (inputPassword === systemPassword) {
      setIsLoggedIn(true);
      localStorage.setItem('bnb_system_auth', 'true');
      setInputPassword('');
      setErrorMsg('');
    } else {
      setErrorMsg('密碼錯誤，請重新輸入');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('bnb_system_auth');
    setCurrentTab('dashboard');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.category || !formData.amount) return;
    
    setIsSubmitting(true);
    try {
      const transRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
      const payload = {
        date: formData.date,
        type: formData.type,
        category: formData.category,
        amount: Number(formData.amount),
        note: formData.note,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(transRef, editingId), payload);
      } else {
        await addDoc(transRef, payload);
      }
      
      setFormData(initialFormState);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("儲存失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      date: item.date,
      type: item.type,
      category: item.category,
      amount: item.amount,
      note: item.note || ''
    });
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if(confirm('確定要刪除這筆紀錄嗎？')) {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id));
        } catch(err) {
            setErrorMsg("刪除失敗");
        }
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const newPassword = e.target.newPassword.value;
    if (!newPassword) return;
    
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
      await updateDoc(settingsRef, { password: newPassword });
      setSystemPassword(newPassword);
      setErrorMsg('密碼已成功更新！');
      e.target.reset();
      setTimeout(() => setErrorMsg(''), 3000);
    } catch (err) {
      setErrorMsg("密碼更新失敗");
    }
  };

  // ==========================================
  // 6. 渲染 UI
  // ==========================================
  
  // A. 全螢幕載入中遮罩
  if (initialLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 tracking-wider">系統載入中...</h2>
        <p className="text-slate-400 mt-2 text-sm">正在同步最新資料</p>
      </div>
    );
  }

  // B. 登入畫面
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 transform transition-all">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <DollarSign className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">民宿帳務系統</h1>
            <p className="text-slate-500 mt-2">請輸入密碼以繼續</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="預設密碼為 1234"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-lg tracking-widest"
              />
            </div>
            {errorMsg && <p className="text-red-500 text-sm text-center font-medium">{errorMsg}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md hover:shadow-lg"
            >
              進入系統
            </button>
          </form>
        </div>
      </div>
    );
  }

  // C. 主系統介面
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* 導覽列 */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg hidden sm:block">民宿帳務管理</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-4">
              <button 
                onClick={() => setCurrentTab('dashboard')}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1 transition-colors ${currentTab === 'dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">看板</span>
              </button>
              <button 
                onClick={() => setCurrentTab('settings')}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1 transition-colors ${currentTab === 'settings' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">設定</span>
              </button>
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              <button 
                onClick={handleLogout}
                className="px-3 py-2 rounded-lg flex items-center space-x-1 text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容區 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* 全局錯誤提示 */}
        {errorMsg && currentTab === 'dashboard' && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 統計卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-green-50 opacity-50"><ArrowUpCircle className="w-32 h-32" /></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-slate-500 mb-1">總收入</p>
                  <h3 className="text-3xl font-bold text-green-600">NT$ {stats.income.toLocaleString()}</h3>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-red-50 opacity-50"><ArrowDownCircle className="w-32 h-32" /></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-slate-500 mb-1">總支出</p>
                  <h3 className="text-3xl font-bold text-red-500">NT$ {stats.expense.toLocaleString()}</h3>
                </div>
              </div>
              
              <div className="bg-blue-600 rounded-2xl p-6 shadow-md text-white relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-blue-500 opacity-30"><DollarSign className="w-32 h-32" /></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-blue-100 mb-1">目前結餘</p>
                  <h3 className="text-3xl font-bold">NT$ {stats.balance.toLocaleString()}</h3>
                </div>
              </div>
            </div>

            {/* 新增/編輯表單 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 p-4">
                <h3 className="font-semibold flex items-center text-slate-700">
                  {editingId ? <Edit2 className="w-4 h-4 mr-2 text-blue-500"/> : <Plus className="w-4 h-4 mr-2 text-blue-500"/>}
                  {editingId ? '編輯紀錄' : '新增帳務'}
                </h3>
              </div>
              <form onSubmit={handleFormSubmit} className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">日期</label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">類型</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all">
                      <option value="income">收入</option>
                      <option value="expense">支出</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">分類 (如: 住宿費、水電)</label>
                    <input type="text" required placeholder="請輸入分類" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">金額</label>
                    <input type="number" required min="0" placeholder="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">備註</label>
                    <input type="text" placeholder="選填" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
                  </div>
                </div>
                
                <div className="mt-5 flex items-center justify-end space-x-3">
                  {editingId && (
                    <button type="button" onClick={() => {setEditingId(null); setFormData(initialFormState);}} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      取消編輯
                    </button>
                  )}
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center shadow-sm transition-colors disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                    {editingId ? '更新紀錄' : '儲存紀錄'}
                  </button>
                </div>
              </form>
            </div>

            {/* 列表呈現 (卡片式) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 px-1">近期帳務紀錄</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 font-medium">目前尚無任何紀錄</p>
                  <p className="text-sm text-slate-400 mt-1">請使用上方表單新增第一筆資料</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {transactions.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {item.type === 'income' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">{item.category}</span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{item.date}</span>
                          </div>
                          {item.note && <p className="text-sm text-slate-500">{item.note}</p>}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                        <span className={`text-lg font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {item.type === 'income' ? '+' : '-'} NT$ {Number(item.amount).toLocaleString()}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 設定分頁 */}
        {currentTab === 'settings' && (
          <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center mb-6 border-b border-slate-100 pb-4">
                <Settings className="w-6 h-6 text-slate-400 mr-3" />
                <h2 className="text-xl font-bold text-slate-800">系統設定</h2>
              </div>
              
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">修改登入密碼</label>
                  <input
                    type="text"
                    name="newPassword"
                    placeholder="請輸入新密碼"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">修改後，下次登入將需要使用新密碼。這不會登出您目前的裝置。</p>
                </div>
                
                {errorMsg && currentTab === 'settings' && (
                  <p className={`text-sm font-medium ${errorMsg.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm"
                >
                  更新密碼
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
