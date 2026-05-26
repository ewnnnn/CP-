import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  LayoutDashboard, CalendarDays, BedDouble, Users, Settings, LogOut, Menu, X, 
  Plus, Edit, Trash2, Search, Filter, Moon, Sun, Home, CheckCircle2, AlertCircle, 
  Clock, XCircle, Download, Printer, Save, Smartphone, Info
} from 'lucide-react';

// === Native Date Utilities (Fixed Timezone Shifts) ===
const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d); // Local time parsing
};
const formatDate = (date) => {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};
const getToday = () => formatDate(new Date());
const getThisMonth = () => getToday().substring(0, 7);
const addDays = (dateStr, days) => {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};
const diffDays = (dateStr1, dateStr2) => {
  const d1 = parseDate(dateStr1);
  const d2 = parseDate(dateStr2);
  return Math.max(0, Math.round((d2 - d1) / 86400000));
};
const isBetweenDates = (target, start, end) => target >= start && target < end;

// === Firebase Initialization ===
const fallbackConfig = {
  apiKey: "AIzaSyC3d5TBwtsWSurQVxPKIbmmzMtEkfzYqz8",
  authDomain: "ai-b2655.firebaseapp.com",
  projectId: "ai-b2655",
  storageBucket: "ai-b2655.firebasestorage.app",
  messagingSenderId: "55490465041",
  appId: "1:55490465041:web:d11ef24e7fbc34f83c90b0",
  measurementId: "G-CV1SE624RB"
};
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : fallbackConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-bnb-app';

// Firebase Paths
const getColRef = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

// === Constants ===
const THEME = {
  light: 'bg-slate-50 text-slate-800',
  dark: 'bg-slate-900 text-slate-100',
  glass: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-xl',
  input: 'w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white',
  buttonPrimary: 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonSecondary: 'px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50',
  buttonDanger: 'px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2'
};

const STATUS_COLORS = {
  '已確認': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  '待付款': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '已入住': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '已退房': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  '已取消': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

// === Utility Components ===
const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl ${THEME.glass} p-6 ${className}`}>
    {children}
  </div>
);

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (start === end) { setDisplay(end); return; }
    let duration = 1000;
    let incrementTime = (duration / end) * 2;
    let timer = setInterval(() => {
      start += Math.ceil(end / 20) || 1;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, incrementTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full ${maxWidth} bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button className={THEME.buttonSecondary} onClick={onClose}>取消</button>
        <button className={THEME.buttonDanger} onClick={() => { onConfirm(); onClose(); }}>確認刪除</button>
      </div>
    </Modal>
  );
};

// === Main Application ===
export default function App() {
  // Global States
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Data States
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({ 
    systemName: '民宿訂房管理系統', 
    password: '1234', 
    logo: '' 
  });

  const showToast = useCallback((msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // Tailwind CDN Fallback & Preflight Injector
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      script.onload = () => { window.tailwind.config = { darkMode: 'class' }; };
      document.head.appendChild(script);
    }
  }, []);

  // Initialization & Auth
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const savedLogin = localStorage.getItem('bnb_auth');
    if (savedLogin === 'true') setIsAuthenticated(true);

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error", error);
        showToast("資料庫連線或驗證失敗", "error");
      } finally {
        // Always set ready so UI doesn't hang infinitely if rules reject anon auth
        setIsFirebaseReady(true);
      }
    };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsFirebaseReady(true);
    });
    return () => unsubAuth();
  }, [showToast]);

  // Data Fetching
  useEffect(() => {
    if (!user || !isFirebaseReady) return;

    const errHandler = (err) => console.error("Firestore Error:", err);

    const unsubBookings = onSnapshot(getColRef('bookings'), (snap) => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.checkIn.localeCompare(a.checkIn)));
    }, errHandler);

    const unsubRooms = onSnapshot(getColRef('rooms'), (snap) => {
      setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => a.price - b.price));
    }, errHandler);

    const unsubCustomers = onSnapshot(getColRef('customers'), (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, errHandler);

    const unsubSettings = onSnapshot(getDocRef('system', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ ...prev, ...docSnap.data() }));
      } else {
        setDoc(getDocRef('system', 'settings'), settings);
      }
    }, errHandler);

    return () => { unsubBookings(); unsubRooms(); unsubCustomers(); unsubSettings(); };
  }, [user, isFirebaseReady]);

  // Theme Toggle
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Login Handler
  const handleLogin = (e) => {
    e.preventDefault();
    const pwd = e.target.password.value;
    if (pwd === settings.password) {
      setIsAuthenticated(true);
      localStorage.setItem('bnb_auth', 'true');
      showToast("登入成功");
    } else {
      showToast("密碼錯誤", "error");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('bnb_auth');
    showToast("已登出");
  };

  if (!isFirebaseReady) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${THEME.light} dark:bg-slate-900 transition-colors duration-500`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300 animate-pulse">系統載入中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950 transition-colors duration-500`}>
        {toastMsg && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${toastMsg.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
            {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
            <span className="font-medium">{toastMsg.msg}</span>
          </div>
        )}
        <Card className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200 dark:shadow-none">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{settings.systemName}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">請輸入管理員密碼以繼續</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input type="password" name="password" placeholder="預設密碼：1234" className={THEME.input} required autoFocus />
            </div>
            <button type="submit" className={`${THEME.buttonPrimary} w-full py-3 text-lg`}>登入系統</button>
          </form>
        </Card>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '營運總覽' },
    { id: 'bookings', icon: CalendarDays, label: '訂房管理' },
    { id: 'rooms', icon: BedDouble, label: '房型管理' },
    { id: 'customers', icon: Users, label: '客戶資料' },
    { id: 'calendar', icon: CalendarDays, label: '行事曆' },
    { id: 'settings', icon: Settings, label: '系統設定' },
  ];

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'} transition-colors duration-300 font-sans`}>
      {/* Base CSS Fallback injected inline to fix broken local environments */}
      <style>{`
        *, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: #e5e7eb; }
        html { line-height: 1.5; font-family: ui-sans-serif, system-ui, sans-serif; }
        body { margin: 0; line-height: inherit; }
        button, input, optgroup, select, textarea { font-family: inherit; font-size: 100%; font-weight: inherit; line-height: inherit; color: inherit; margin: 0; padding: 0; }
        button, select { text-transform: none; }
        button, [type='button'], [type='reset'], [type='submit'] { -webkit-appearance: button; background-color: transparent; background-image: none; }
      `}</style>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-[999] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${toastMsg.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
          {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
          <span className="font-medium">{toastMsg.msg}</span>
        </div>
      )}
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 ${THEME.glass} border-r border-slate-200/50 dark:border-slate-700/50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="p-6 flex items-center gap-3">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover" onError={(e) => e.target.style.display='none'} />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <Home className="w-5 h-5 text-white" />
            </div>
          )}
          <h1 className="text-lg font-bold text-slate-800 dark:text-white truncate">{settings.systemName}</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-white' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-medium">登出系統</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Top Header */}
        <header className={`${THEME.glass} border-b border-slate-200/50 dark:border-slate-700/50 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shrink-0`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                A
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Admin</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          {activeTab === 'dashboard' && <DashboardView bookings={bookings} rooms={rooms} />}
          {activeTab === 'bookings' && <BookingsView bookings={bookings} rooms={rooms} showToast={showToast} />}
          {activeTab === 'rooms' && <RoomsView rooms={rooms} showToast={showToast} />}
          {activeTab === 'customers' && <CustomersView customers={customers} bookings={bookings} />}
          {activeTab === 'calendar' && <CalendarView bookings={bookings} rooms={rooms} />}
          {activeTab === 'settings' && <SettingsView settings={settings} showToast={showToast} />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// Views Components
// ==========================================

function DashboardView({ bookings, rooms }) {
  const today = getToday();
  const thisMonth = getThisMonth();

  const stats = useMemo(() => {
    let todayCheckIns = 0;
    let todayCheckOuts = 0;
    let todayRev = 0;
    let monthRev = 0;
    let pending = 0;
    let cancelled = 0;
    let occupiedRoomsToday = new Set();

    const monthlyRevMap = {};
    const roomPopularityMap = {};

    bookings.forEach(b => {
      if (b.checkIn === today && b.status !== '已取消') todayCheckIns++;
      if (b.checkOut === today && b.status !== '已取消') todayCheckOuts++;
      if (b.status === '待付款') pending++;
      if (b.status === '已取消') cancelled++;
      
      if (['已確認', '已入住', '已退房'].includes(b.status)) {
        if (b.checkIn === today) todayRev += Number(b.totalPrice);
        if (b.checkIn.startsWith(thisMonth)) monthRev += Number(b.totalPrice);

        // Safe Date parsing for monthly chart
        const m = String(parseDate(b.checkIn).getMonth() + 1).padStart(2, '0') + '月';
        monthlyRevMap[m] = (monthlyRevMap[m] || 0) + Number(b.totalPrice);
        
        const r = rooms.find(r => r.id === b.roomId)?.name || '未知房型';
        roomPopularityMap[r] = (roomPopularityMap[r] || 0) + 1;
      }

      if (isBetweenDates(today, b.checkIn, b.checkOut) && b.status !== '已取消') {
        occupiedRoomsToday.add(b.roomId);
      }
    });

    const totalRooms = rooms.length || 1;
    const occupancyRate = Math.round((occupiedRoomsToday.size / totalRooms) * 100);

    const chartDataRev = Object.keys(monthlyRevMap).sort().map(k => ({ name: k, 營收: monthlyRevMap[k] })).slice(-6);
    const chartDataRooms = Object.keys(roomPopularityMap).map(k => ({ name: k, 次數: roomPopularityMap[k] })).sort((a,b)=>b.次數-a.次數).slice(0,5);

    return { 
      todayCheckIns, todayCheckOuts, todayRev, monthRev, 
      totalOrders: bookings.length, pending, cancelled, occupancyRate,
      chartDataRev, chartDataRooms
    };
  }, [bookings, rooms, today, thisMonth]);

  const maxRev = stats.chartDataRev.length > 0 ? Math.max(...stats.chartDataRev.map(d => d.營收)) : 1;
  const maxPop = stats.chartDataRooms.length > 0 ? Math.max(...stats.chartDataRooms.map(d => d.次數)) : 1;

  const StatCard = ({ title, value, icon: Icon, color, prefix = '', suffix = '' }) => (
    <Card className="group hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-baseline gap-1">
            {prefix}<AnimatedNumber value={value} />{suffix}
          </h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 shrink-0 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="今日入住" value={stats.todayCheckIns} icon={LogOut} color="bg-indigo-500 shadow-indigo-200" suffix=" 間" />
        <StatCard title="今日退房" value={stats.todayCheckOuts} icon={CheckCircle2} color="bg-emerald-500 shadow-emerald-200" suffix=" 間" />
        <StatCard title="今日營收" value={stats.todayRev} icon={BedDouble} color="bg-amber-500 shadow-amber-200" prefix="$" />
        <StatCard title="本月營收" value={stats.monthRev} icon={CalendarDays} color="bg-purple-500 shadow-purple-200" prefix="$" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="總訂單數" value={stats.totalOrders} icon={LayoutDashboard} color="bg-blue-500 shadow-blue-200" />
        <StatCard title="待付款訂單" value={stats.pending} icon={Clock} color="bg-orange-500 shadow-orange-200" />
        <StatCard title="已取消訂單" value={stats.cancelled} icon={XCircle} color="bg-rose-500 shadow-rose-200" />
        <StatCard title="今日住房率" value={stats.occupancyRate} icon={Users} color="bg-teal-500 shadow-teal-200" suffix="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">近六個月營收趨勢</h3>
          {stats.chartDataRev.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">尚無營收資料</div>
          ) : (
            <div className="h-72 flex items-end gap-2 sm:gap-4 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              {stats.chartDataRev.map((d, i) => {
                const heightPct = Math.max((d.營收 / maxRev) * 100, 5); // min 5% height for visibility
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
                    <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 rounded-t-lg relative flex-1 flex items-end justify-center">
                      <div className="w-full bg-indigo-500 rounded-t-lg transition-all duration-500 group-hover:bg-indigo-400" style={{ height: `${heightPct}%` }}></div>
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        ${d.營收.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{d.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">熱門房型排行</h3>
          {stats.chartDataRooms.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">尚無房型資料</div>
          ) : (
            <div className="h-72 flex flex-col justify-center gap-4">
              {stats.chartDataRooms.map((d, i) => {
                const widthPct = Math.max((d.次數 / maxPop) * 100, 5);
                return (
                  <div key={i} className="flex items-center gap-3 sm:gap-4 group">
                    <span className="w-24 text-right text-sm text-slate-600 dark:text-slate-300 truncate" title={d.name}>{d.name}</span>
                    <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 h-6 rounded-full overflow-hidden relative">
                      <div className="h-full bg-emerald-500 transition-all duration-500 group-hover:bg-emerald-400" style={{ width: `${widthPct}%` }}></div>
                    </div>
                    <span className="w-8 text-sm font-medium text-slate-700 dark:text-slate-200">{d.次數}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function BookingsView({ bookings, rooms, showToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [formData, setFormData] = useState({
    checkIn: '', checkOut: '', roomId: '', customerName: '', phone: '', email: '', 
    guests: 1, totalPrice: 0, status: '待付款', notes: ''
  });

  useEffect(() => {
    if (formData.checkIn && formData.checkOut && formData.roomId) {
      if (formData.checkOut > formData.checkIn) {
        const days = diffDays(formData.checkIn, formData.checkOut);
        const room = rooms.find(r => r.id === formData.roomId);
        if (room) setFormData(prev => ({ ...prev, totalPrice: days * room.price }));
      }
    }
  }, [formData.checkIn, formData.checkOut, formData.roomId, rooms]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchSearch = (b.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (b.phone || '').includes(searchTerm);
      const matchStatus = filterStatus === 'ALL' || b.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [bookings, searchTerm, filterStatus]);

  const openModal = (booking = null) => {
    if (rooms.length === 0 && !booking) {
      return showToast('請先前往「房型管理」新增至少一種房型，才能開始訂房！', 'error');
    }
    
    if (booking) {
      setFormData(booking);
      setEditingId(booking.id);
    } else {
      setFormData({
        checkIn: getToday(), checkOut: addDays(getToday(), 1), 
        roomId: rooms[0]?.id || '', customerName: '', phone: '', email: '', 
        guests: 1, totalPrice: 0, status: '待付款', notes: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const checkOverlap = (checkIn, checkOut, roomId, excludeId) => {
    return bookings.some(b => {
      if (b.id === excludeId || b.roomId !== roomId || b.status === '已取消') return false;
      return checkIn < b.checkOut && checkOut > b.checkIn;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.checkOut <= formData.checkIn) return showToast('退房日期必須晚於入住日期', 'error');
    if (formData.totalPrice < 0) return showToast('金額不能為負數', 'error');
    if (!formData.roomId) return showToast('請選擇房型', 'error');
    if (checkOverlap(formData.checkIn, formData.checkOut, formData.roomId, editingId)) {
      return showToast('該房型在所選日期已有訂房，請選擇其他日期或房型', 'error');
    }

    const dataToSave = {
      ...formData, 
      customerName: (formData.customerName || '').trim(), 
      phone: (formData.phone || '').trim(), 
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(getDocRef('bookings', editingId), dataToSave);
        showToast('訂房已更新');
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(getColRef('bookings'), dataToSave);
        addDoc(getColRef('customers'), {
          name: dataToSave.customerName, phone: dataToSave.phone, email: dataToSave.email || '', 
          idNumber: '', notes: '', lastVisit: dataToSave.checkIn
        }).catch(e=>console.log("Ignore dup", e));
        showToast('訂房新增成功');
      }
      setIsModalOpen(false);
    } catch (error) {
      showToast('儲存失敗：' + error.message, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(getDocRef('bookings', deleteConfirm.id));
      showToast('訂房已刪除');
    } catch (error) {
      showToast('刪除失敗', 'error');
    }
  };

  const exportCSV = () => {
    const headers = ['入住日期', '退房日期', '客戶姓名', '電話', '房型', '金額', '狀態', '備註'];
    const csvContent = [headers.join(','), ...filteredBookings.map(b => [
        b.checkIn, b.checkOut, `"${b.customerName || ''}"`, `"${b.phone || ''}"`, 
        `"${rooms.find(r=>r.id===b.roomId)?.name||''}"`, b.totalPrice, b.status, `"${(b.notes || '').replace(/"/g, '""')}"`
      ].join(','))].join('\n');
    
    const blob = new Blob(["\ufeff"+csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `訂房紀錄_${getToday().replace(/-/g, '')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="搜尋姓名或電話..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className={`${THEME.input} pl-10`} />
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className={THEME.input}>
            <option value="ALL">所有狀態</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={exportCSV} className={THEME.buttonSecondary}><Download className="w-4 h-4"/> <span className="hidden sm:inline">匯出</span></button>
          <button onClick={() => window.print()} className={THEME.buttonSecondary}><Printer className="w-4 h-4"/> <span className="hidden sm:inline">列印</span></button>
          <button onClick={() => openModal()} className={THEME.buttonPrimary}><Plus className="w-4 h-4"/> 新增訂房</button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <th className="p-4 font-medium">客戶資訊</th>
                <th className="p-4 font-medium">房型</th>
                <th className="p-4 font-medium">入住/退房</th>
                <th className="p-4 font-medium text-right">金額</th>
                <th className="p-4 font-medium">狀態</th>
                <th className="p-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredBookings.length === 0 ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-500 bg-slate-50/50 dark:bg-slate-800/20">目前沒有符合的訂單</td></tr>
              ) : filteredBookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4"><div className="font-medium text-slate-800 dark:text-slate-200">{b.customerName}</div><div className="text-sm text-slate-500">{b.phone}</div></td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">{rooms.find(r => r.id === b.roomId)?.name || <span className="text-rose-500">未知房型</span>}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap"><div>{b.checkIn}</div><div className="text-slate-400">至 {b.checkOut}</div></td>
                  <td className="p-4 text-right font-medium text-slate-800 dark:text-slate-200">${Number(b.totalPrice).toLocaleString()}</td>
                  <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-800'}`}>{b.status}</span></td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openModal(b)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm({ isOpen: true, id: b.id, name: `${b.customerName} (${b.checkIn})` })} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? '編輯訂房' : '新增訂房'}>
        {rooms.length === 0 ? (
          <div className="py-8 text-center text-rose-500 flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12" />
            <p className="font-bold text-lg">尚未建立房型資料</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">請先前往「房型管理」建立房型，才能進行訂房操作。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">入住日期 *</label><input type="date" required value={formData.checkIn} onChange={e=>setFormData({...formData, checkIn: e.target.value})} className={THEME.input} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">退房日期 *</label><input type="date" required value={formData.checkOut} onChange={e=>setFormData({...formData, checkOut: e.target.value})} className={THEME.input} min={addDays(formData.checkIn, 1)} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">房型 *</label><select required value={formData.roomId} onChange={e=>setFormData({...formData, roomId: e.target.value})} className={THEME.input}><option value="" disabled>請選擇房型</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name} (${r.price}/晚)</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">入住人數 *</label><input type="number" min="1" required value={formData.guests} onChange={e=>setFormData({...formData, guests: e.target.value})} className={THEME.input} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">客戶姓名 *</label><input type="text" required value={formData.customerName} onChange={e=>setFormData({...formData, customerName: e.target.value})} className={THEME.input} placeholder="王小明" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">聯絡電話 *</label><input type="tel" required value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className={THEME.input} placeholder="0912345678" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label><input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className={THEME.input} placeholder="example@email.com" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">狀態</label><select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} className={THEME.input}>{Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">總金額 *</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span><input type="number" min="0" required value={formData.totalPrice} onChange={e=>setFormData({...formData, totalPrice: e.target.value})} className={`${THEME.input} pl-8 font-bold text-indigo-600 dark:text-indigo-400`} /></div></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">備註</label><textarea rows="3" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className={THEME.input} placeholder="特殊需求..." /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className={THEME.buttonSecondary}>取消</button>
              <button type="submit" className={THEME.buttonPrimary}><Save className="w-4 h-4"/> 儲存訂房</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })} onConfirm={handleDelete} title="確認刪除訂房" message={`確定要刪除「${deleteConfirm.name}」的訂房紀錄嗎？此操作無法復原。`} />
    </div>
  );
}

function RoomsView({ rooms, showToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [formData, setFormData] = useState({ name: '', price: 0, capacity: 2, description: '', photoUrl: '' });

  const openModal = (room = null) => {
    if (room) { setFormData(room); setEditingId(room.id); } 
    else { setFormData({ name: '', price: 0, capacity: 2, description: '', photoUrl: '' }); setEditingId(null); }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.price < 0) return showToast('價格不能為負數', 'error');
    const dataToSave = { ...formData, name: (formData.name || '').trim() };
    
    try {
      if (editingId) { await updateDoc(getDocRef('rooms', editingId), dataToSave); showToast('房型已更新'); } 
      else { await addDoc(getColRef('rooms'), dataToSave); showToast('房型新增成功'); }
      setIsModalOpen(false);
    } catch (error) { showToast('儲存失敗：' + error.message, 'error'); }
  };

  const handleDelete = async () => {
    try { await deleteDoc(getDocRef('rooms', deleteConfirm.id)); showToast('房型已刪除'); } 
    catch (error) { showToast('刪除失敗', 'error'); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">房型管理</h2>
        <button onClick={() => openModal()} className={THEME.buttonPrimary}><Plus className="w-4 h-4"/> 新增房型</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 flex flex-col items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <BedDouble className="w-12 h-12 opacity-50" />
            <p className="text-lg">尚無房型資料，請點擊上方按鈕新增</p>
          </div>
        ) : rooms.map(room => (
          <Card key={room.id} className="p-0 overflow-hidden group flex flex-col">
            <div className="h-48 bg-slate-200 dark:bg-slate-700 relative overflow-hidden shrink-0">
              {room.photoUrl ? (
                <img src={room.photoUrl} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e)=>e.target.style.display='none'} />
              ) : <div className="w-full h-full flex items-center justify-center text-slate-400"><BedDouble className="w-12 h-12" /></div>}
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full font-bold shadow-lg">${room.price} / 晚</div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 truncate">{room.name}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4"><Users className="w-4 h-4" /> <span>可住 {room.capacity} 人</span></div>
              <p className="text-slate-600 dark:text-slate-400 text-sm flex-1 line-clamp-3 mb-4">{room.description}</p>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button onClick={() => openModal(room)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                <button onClick={() => setDeleteConfirm({ isOpen: true, id: room.id, name: room.name })} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? '編輯房型' : '新增房型'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">房型名稱 *</label><input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className={THEME.input} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">價格 (每晚) *</label><input type="number" min="0" required value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className={THEME.input} /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">可入住人數 *</label><input type="number" min="1" required value={formData.capacity} onChange={e=>setFormData({...formData, capacity: e.target.value})} className={THEME.input} /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">照片 URL</label><input type="url" value={formData.photoUrl} onChange={e=>setFormData({...formData, photoUrl: e.target.value})} className={THEME.input} placeholder="https://..." /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">房型介紹</label><textarea rows="4" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className={THEME.input} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6"><button type="button" onClick={() => setIsModalOpen(false)} className={THEME.buttonSecondary}>取消</button><button type="submit" className={THEME.buttonPrimary}><Save className="w-4 h-4"/> 儲存</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })} onConfirm={handleDelete} title="確認刪除房型" message={`確定要刪除「${deleteConfirm.name}」嗎？若該房型已有歷史訂單，建議改為隱藏而非刪除以保留紀錄。`} />
    </div>
  );
}

function CustomersView({ customers, bookings }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredCustomers = useMemo(() => customers.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').includes(searchTerm) || (c.idNumber && c.idNumber.includes(searchTerm))), [customers, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex gap-2 max-w-sm"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="搜尋客戶姓名、電話或身分證..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className={`${THEME.input} pl-10`} /></div></div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <th className="p-4 font-medium">姓名</th><th className="p-4 font-medium">聯絡方式</th><th className="p-4 font-medium">身分證/護照</th><th className="p-4 font-medium">歷史訂單數</th><th className="p-4 font-medium">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredCustomers.length === 0 ? <tr><td colSpan="5" className="p-12 text-center text-slate-500 bg-slate-50/50 dark:bg-slate-800/20">無客戶資料</td></tr> : filteredCustomers.map(c => {
                const historyCount = bookings.filter(b => b.phone === c.phone).length;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{c.name}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap"><div>{c.phone}</div><div>{c.email}</div></td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{c.idNumber || '-'}</td>
                    <td className="p-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{historyCount} 筆</td>
                    <td className="p-4 text-sm text-slate-500 truncate max-w-xs">{c.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CalendarView({ bookings, rooms }) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);

  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentMonthDate.getDay();
  
  const generateCalendar = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(formatDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i)));
    }
    return days;
  };

  const getBookingsForDay = (dateStr) => bookings.filter(b => b.status !== '已取消' && isBetweenDates(dateStr, b.checkIn, b.checkOut));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col lg:flex-row gap-6">
      <Card className="flex-1 overflow-x-auto">
        <div className="flex justify-between items-center mb-6 min-w-[300px]">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{currentMonthDate.getFullYear()}年 {String(currentMonthDate.getMonth() + 1).padStart(2, '0')}月</h2>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className={THEME.buttonSecondary}>上月</button>
            <button onClick={() => { const d = new Date(); setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1)); }} className={THEME.buttonSecondary}>本月</button>
            <button onClick={() => setCurrentMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className={THEME.buttonSecondary}>下月</button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-sm mb-2 min-w-[300px]">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="font-bold text-slate-500 py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[300px]">
          {generateCalendar().map((dateStr, idx) => {
            if (!dateStr) return <div key={`empty-${idx}`} className="p-2" />;
            const dayBookings = getBookingsForDay(dateStr);
            const isToday = dateStr === getToday();
            const isFull = dayBookings.length >= (rooms.length || 1);
            const isSelected = selectedDay === dateStr;

            return (
              <div 
                key={dateStr} onClick={() => setSelectedDay(dateStr)}
                className={`min-h-[80px] p-1 sm:p-2 border rounded-xl cursor-pointer transition-all ${
                  isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 
                  isToday ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-inner' : 
                  'border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`text-xs sm:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-amber-500 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {parseInt(dateStr.split('-')[2], 10)}
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {dayBookings.length > 0 && (
                    <div className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded text-white truncate w-full text-center ${isFull ? 'bg-rose-500' : 'bg-indigo-500'}`}>
                      {dayBookings.length} 間
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="w-full lg:w-80 shrink-0">
        <Card className="h-full">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
            {selectedDay || '請選擇日期'}
          </h3>
          {selectedDay ? (
            <div className="space-y-3">
              {getBookingsForDay(selectedDay).length === 0 ? <p className="text-sm text-slate-500 text-center py-8">本日尚無入住名單</p> : (
                getBookingsForDay(selectedDay).map(b => (
                  <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 text-sm transition-all hover:shadow-md">
                    <div className="font-bold text-slate-800 dark:text-white flex justify-between items-center mb-1">
                      {rooms.find(r=>r.id===b.roomId)?.name || '未知房型'}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">{b.customerName} ({b.phone})</div>
                    <div className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 退房: {b.checkOut}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
               <Info className="w-8 h-8 opacity-50" />
               <p className="text-sm">點擊左側日曆查看當日入住名單</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SettingsView({ settings, showToast }) {
  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setFormData(settings); }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((formData.password || '').trim() === '') return showToast('密碼不能為空', 'error');
    setIsSaving(true);
    try {
      await setDoc(getDocRef('system', 'settings'), formData);
      showToast('設定已儲存');
      if (formData.password !== settings.password) showToast('密碼已更新，下次登入請使用新密碼');
    } catch (error) { showToast('儲存失敗', 'error'); }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <Card>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500"/> 系統設定</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">系統名稱</label><input type="text" value={formData.systemName} onChange={e=>setFormData({...formData, systemName: e.target.value})} className={THEME.input} required /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">民宿 Logo URL</label><input type="url" value={formData.logo} onChange={e=>setFormData({...formData, logo: e.target.value})} className={THEME.input} placeholder="https://..." /></div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-md font-bold text-slate-800 dark:text-white mb-4">安全設定</h3>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">登入密碼</label>
            <input type="text" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} className={THEME.input} required minLength="4" />
            <p className="text-xs text-slate-500 mt-1">此密碼用於登入管理系統，請妥善保管。</p>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-md font-bold text-slate-800 dark:text-white mb-4">開發者設定</h3>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200"><p className="font-bold mb-1">Firebase 連線狀態：正常</p><p>目前系統執行於隔離環境，Firebase 設定由系統自動注入以確保功能運作正常。若需在本機運行，請替換程式碼開頭的 `firebaseConfig`。</p></div>
            </div>
          </div>
          <div className="flex justify-end pt-6"><button type="submit" disabled={isSaving} className={THEME.buttonPrimary}>{isSaving ? '儲存中...' : <><Save className="w-4 h-4"/> 儲存設定</>}</button></div>
        </form>
      </Card>
      <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl">
        <div className="flex items-center gap-4"><div className="p-3 bg-white/20 rounded-xl shrink-0"><Smartphone className="w-6 h-6" /></div><div><h3 className="font-bold text-lg">安裝為桌面應用程式 (PWA)</h3><p className="text-indigo-100 text-sm mt-1">您可以將此系統加入手機主畫面或電腦桌面，獲得更佳的全螢幕體驗。</p></div></div>
      </Card>
    </div>
  );
}
