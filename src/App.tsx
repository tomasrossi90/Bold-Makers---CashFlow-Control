/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, loginWithGoogle, logout } from './firebase';
import { Client, Payment, CashflowEntry, Currency, PaymentStatus, PaymentMethod, CashflowType, StaffMember, PayrollPayment } from './types';
import { 
  Users, 
  CreditCard, 
  TrendingDown,
  TrendingUp,
  Star,
  Edit,
  History,
  Check,
  Plus, 
  Trash2, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  isAfter, 
  isBefore, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  subYears,
  addMonths
} from 'date-fns';
import { 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'tertiary' }) => {
  const variants = {
    primary: 'bg-primary text-white hover:opacity-90',
    secondary: 'bg-neutral text-primary border border-gray-200 hover:bg-gray-100',
    tertiary: 'bg-tertiary text-primary hover:opacity-90',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-primary hover:bg-gray-100'
  };
  return (
    <button 
      className={cn('px-5 py-2.5 rounded-[14px] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95', variants[variant], className)} 
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bento-card p-6', className)} {...props}>
    {children}
  </div>
);

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-bold text-primary/60 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative">
      <input 
        className="w-full px-4 py-3 bg-neutral/50 border border-white/50 rounded-[16px] focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all text-primary placeholder:text-primary/30" 
        {...props} 
      />
    </div>
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-bold text-primary/60 uppercase tracking-wider ml-1">{label}</label>}
    <select 
      className="w-full px-4 py-3 bg-neutral/50 border border-white/50 rounded-[16px] focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all text-primary appearance-none" 
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'payments' | 'cashflow' | 'payroll' | 'trash' | 'reports'>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingCashflow, setIsAddingCashflow] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payroll, setPayroll] = useState<PayrollPayment[]>([]);

  const activeClients = useMemo(() => clients.filter(c => !c.deletedAt), [clients]);
  const deletedClients = useMemo(() => clients.filter(c => c.deletedAt), [clients]);
  const activePayments = useMemo(() => payments.filter(p => !p.deletedAt), [payments]);
  const activeStaff = useMemo(() => staff.filter(s => !s.deletedAt), [staff]);

  const notifications = useMemo(() => {
    const now = new Date();
    const alerts: { id: string; type: 'upcoming' | 'overdue'; message: string; date: string; paymentId: string }[] = [];
    
    activePayments.forEach(p => {
      if (p.status === 'paid') return;
      
      const dueDate = parseISO(p.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        alerts.push({
          id: `overdue-${p.id}`,
          type: 'overdue',
          message: `Pago vencido: ${p.clientName} (Cuota #${p.installmentNumber})`,
          date: p.dueDate,
          paymentId: p.id!
        });
      } else if (diffDays <= 7) {
        alerts.push({
          id: `upcoming-${p.id}`,
          type: 'upcoming',
          message: `Próximo vencimiento: ${p.clientName} (Cuota #${p.installmentNumber})`,
          date: p.dueDate,
          paymentId: p.id!
        });
      }
    });
    
    return alerts.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [activePayments]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const qClients = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsubClients = onSnapshot(qClients, (snap) => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });

    const qPayments = query(collection(db, 'payments'), orderBy('dueDate', 'asc'));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    const qCashflow = query(collection(db, 'cashflow'), orderBy('date', 'desc'));
    const unsubCashflow = onSnapshot(qCashflow, (snap) => {
      setCashflow(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashflowEntry)));
    });

    const qStaff = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
    });

    const qPayroll = query(collection(db, 'payroll'), orderBy('date', 'desc'));
    const unsubPayroll = onSnapshot(qPayroll, (snap) => {
      setPayroll(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollPayment)));
    });

    return () => {
      unsubClients();
      unsubPayments();
      unsubCashflow();
      unsubStaff();
      unsubPayroll();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-primary rounded-[24px] flex items-center justify-center shadow-2xl shadow-primary/20 animate-pulse">
            <TrendingUp className="w-10 h-10 text-tertiary" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-primary tracking-tighter">BOLD <span className="text-secondary">MAKERS</span></span>
            <div className="flex gap-1 mt-2">
              <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral p-6">
        <Card className="max-w-md w-full p-12 text-center space-y-10 bento-card border-none shadow-2xl shadow-primary/10">
          <div className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 rotate-6 transition-transform hover:rotate-0 duration-500">
            <TrendingUp className="w-12 h-12 text-tertiary" />
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl font-black text-primary tracking-tighter uppercase italic">
              Bold <span className="text-secondary">Makers</span>
            </h1>
            <p className="text-primary/40 font-bold uppercase tracking-widest text-xs">CashFlow Control • Mentorships</p>
          </div>
          <div className="space-y-4">
            <p className="text-primary/60 text-sm font-medium px-4">
              Gestiona los ingresos y egresos de tu negocio de mentoría de forma profesional y eficiente.
            </p>
            <Button onClick={loginWithGoogle} className="w-full py-4 text-lg shadow-xl shadow-primary/10">
              <LogIn className="w-6 h-6" />
              Ingresar con Google
            </Button>
          </div>
          <div className="pt-4">
            <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">© 2026 Bold Makers Studio</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white flex flex-col border-r border-slate-100 z-20">
        <div className="p-8 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-primary tracking-tighter leading-none">Bold Makers</span>
              <span className="text-[10px] font-bold text-muted tracking-widest uppercase">CASHFLOW CONTROL</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<TrendingUp className="w-5 h-5" />}
            label="Dashboard"
          />
          <NavItem 
            active={activeTab === 'clients'} 
            onClick={() => setActiveTab('clients')}
            icon={<Users className="w-5 h-5" />}
            label="Clientes"
          />
          <NavItem 
            active={activeTab === 'payments'} 
            onClick={() => setActiveTab('payments')}
            icon={<CreditCard className="w-5 h-5" />}
            label="Pagos"
          />
          <NavItem 
            active={activeTab === 'cashflow'} 
            onClick={() => setActiveTab('cashflow')}
            icon={<DollarSign className="w-5 h-5" />}
            label="Transacciones"
          />
          <NavItem 
            active={activeTab === 'payroll'} 
            onClick={() => setActiveTab('payroll')}
            icon={<Users className="w-5 h-5" />}
            label="Payroll"
          />
          <NavItem 
            active={activeTab === 'trash'} 
            onClick={() => setActiveTab('trash')}
            icon={<Trash2 className="w-5 h-5" />}
            label="Papelera"
          />
          <NavItem 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            icon={<Filter className="w-5 h-5" />}
            label="Reportes"
          />
        </nav>

        <div className="p-6 mt-auto">
          <div className="pt-4 border-t border-slate-100 space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors">
              <Filter className="w-4 h-4" />
              Ajustes
            </button>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted hover:text-red-600 transition-colors">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800">
            {activeTab === 'dashboard' && 'Resumen del Negocio'}
            {activeTab === 'clients' && 'Gestión de Clientes'}
            {activeTab === 'payments' && 'Control de Pagos'}
            {activeTab === 'cashflow' && 'Transacciones'}
            {activeTab === 'payroll' && 'Gestión de Payroll'}
            {activeTab === 'trash' && 'Papelera de Reciclaje'}
          </h1>

          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar transacción..." 
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
              />
            </div>

            <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-400 hover:text-primary transition-colors relative"
                >
                  <AlertCircle className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest">Notificaciones</h4>
                      <span className="text-[10px] font-bold text-slate-400">{notifications.length} Alertas</span>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">No hay alertas pendientes.</p>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            className={cn(
                              "p-3 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50",
                              n.type === 'overdue' ? "bg-red-50/50 border-red-100" : "bg-amber-50/50 border-amber-100"
                            )}
                            onClick={() => {
                              setActiveTab('payments');
                              setShowNotifications(false);
                            }}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              n.type === 'overdue' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                            )}>
                              {n.type === 'overdue' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-800 leading-tight">{n.message}</p>
                              <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                                {n.type === 'overdue' ? 'Vencido el' : 'Vence el'} {format(parseISO(n.date), 'dd/MM/yyyy')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                <Filter className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 ml-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-800 leading-none">{user.displayName}</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Socio Director</p>
                </div>
                <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-slate-100" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && <DashboardView clients={activeClients} payments={activePayments} cashflow={cashflow} />}
          {activeTab === 'clients' && <ClientsView clients={activeClients} isAdding={isAddingClient} setIsAdding={setIsAddingClient} payments={payments} cashflow={cashflow} />}
          {activeTab === 'payments' && <PaymentsView clients={activeClients} payments={activePayments} />}
          {activeTab === 'cashflow' && <CashflowView cashflow={cashflow} isAdding={isAddingCashflow} setIsAdding={setIsAddingCashflow} clients={activeClients} payments={activePayments} />}
          {activeTab === 'payroll' && <PayrollView staff={activeStaff} payroll={payroll} isAddingStaff={isAddingStaff} setIsAddingStaff={setIsAddingStaff} />}
          {activeTab === 'trash' && <TrashView clients={deletedClients} payments={payments} />}
          {activeTab === 'reports' && <ReportsView cashflow={cashflow} clients={activeClients} payments={activePayments} />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group",
        active 
          ? "bg-primary text-white shadow-lg shadow-primary/20" 
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      )}
    >
      <div className={cn(
        "transition-transform duration-300",
        active ? "scale-110" : "group-hover:scale-110"
      )}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}

// --- Dashboard View ---

function DashboardView({ clients, payments, cashflow }: { clients: Client[]; payments: Payment[]; cashflow: CashflowEntry[] }) {
  const [segmentation, setSegmentation] = useState<'weekly' | 'monthly' | 'quarterly' | 'semiannually' | 'annually'>('monthly');
  const [chartType, setChartType] = useState<'area' | 'bar'>('bar');
  const [visibleMetrics, setVisibleMetrics] = useState({
    ingresos: true,
    egresos: true,
    utilidad: true
  });

  const currentMonth = startOfMonth(new Date());
  
  const stats = useMemo(() => {
    const monthlyIncome = cashflow
      .filter(e => e.type === 'income' && isAfter(parseISO(e.date), currentMonth))
      .reduce((acc, e) => acc + e.amountUSD, 0);
    
    const monthlyExpenses = cashflow
      .filter(e => e.type === 'expense' && isAfter(parseISO(e.date), currentMonth))
      .reduce((acc, e) => acc + e.amountUSD, 0);

    const totalRevenue = cashflow
      .filter(e => e.type === 'income')
      .reduce((acc, e) => acc + e.amountUSD, 0);

    const pendingPayments = payments
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + p.amountUSD, 0);

    return { monthlyIncome, monthlyExpenses, totalRevenue, pendingPayments, profit: monthlyIncome - monthlyExpenses };
  }, [cashflow, payments, currentMonth]);

  const chartData = useMemo(() => {
    const now = new Date();
    let periods: { start: Date; end: Date; label: string }[] = [];

    switch (segmentation) {
      case 'weekly':
        periods = Array.from({ length: 12 }).map((_, i) => {
          const d = subWeeks(now, 11 - i);
          return { start: startOfWeek(d), end: endOfWeek(d), label: `S${format(d, 'w')}` };
        });
        break;
      case 'monthly':
        periods = Array.from({ length: 6 }).map((_, i) => {
          const d = subMonths(now, 5 - i);
          return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM').toUpperCase() };
        });
        break;
      case 'quarterly':
        periods = Array.from({ length: 4 }).map((_, i) => {
          const d = subQuarters(now, 3 - i);
          return { start: startOfQuarter(d), end: endOfQuarter(d), label: `T${format(d, 'Q')}-${format(d, 'yy')}` };
        });
        break;
      case 'semiannually':
        periods = Array.from({ length: 4 }).map((_, i) => {
          const d = subMonths(now, (3 - i) * 6);
          const isSecondHalf = d.getMonth() >= 6;
          const start = new Date(d.getFullYear(), isSecondHalf ? 6 : 0, 1);
          const end = endOfMonth(new Date(d.getFullYear(), isSecondHalf ? 11 : 5, 1));
          return { start, end, label: `${isSecondHalf ? '2S' : '1S'}-${format(d, 'yy')}` };
        });
        break;
      case 'annually':
        periods = Array.from({ length: 5 }).map((_, i) => {
          const d = subYears(now, 4 - i);
          return { start: startOfYear(d), end: endOfYear(d), label: format(d, 'yyyy') };
        });
        break;
    }

    return periods.map(p => {
      const income = cashflow
        .filter(e => e.type === 'income' && (isAfter(parseISO(e.date), p.start) || e.date === format(p.start, 'yyyy-MM-dd')) && (isBefore(parseISO(e.date), p.end) || e.date === format(p.end, 'yyyy-MM-dd')))
        .reduce((acc, e) => acc + e.amountUSD, 0);

      const expenses = cashflow
        .filter(e => e.type === 'expense' && (isAfter(parseISO(e.date), p.start) || e.date === format(p.start, 'yyyy-MM-dd')) && (isBefore(parseISO(e.date), p.end) || e.date === format(p.end, 'yyyy-MM-dd')))
        .reduce((acc, e) => acc + e.amountUSD, 0);

      return { name: p.label, ingresos: income, egresos: expenses, utilidad: income - expenses };
    });
  }, [cashflow, segmentation]);

  const pieData = useMemo(() => {
    const total = stats.monthlyIncome || 1; // Avoid division by zero
    const expensesPercent = Math.min(100, Math.max(0, (stats.monthlyExpenses / total) * 100));
    const profitPercent = Math.max(0, 100 - expensesPercent);

    return [
      { name: 'Egresos', value: Math.round(expensesPercent), color: '#ef4444', amount: stats.monthlyExpenses },
      { name: 'Utilidad', value: Math.round(profitPercent), color: '#E8E981', amount: stats.profit }
    ];
  }, [stats]);

  const recentTransactions = [...cashflow].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 min-w-[180px] animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-2">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{entry.name}</span>
                </div>
                <span className="text-sm font-black text-primary">
                  ${entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Balance Total" 
          value={`$${stats.totalRevenue.toLocaleString()}`} 
          icon={<CreditCard className="w-5 h-5" />}
          trend="+12.5%"
          color="primary"
        />
        <StatCard 
          label="Ingresos (Mensual)" 
          value={`$${stats.monthlyIncome.toLocaleString()}`} 
          icon={<TrendingUp className="w-5 h-5" />}
          color="secondary"
        />
        <StatCard 
          label="Egresos (Mensual)" 
          value={`$${stats.monthlyExpenses.toLocaleString()}`} 
          icon={<TrendingDown className="w-5 h-5" />}
          color="red"
        />
        <StatCard 
          label="Utilidad Operativa" 
          value={`$${stats.profit.toLocaleString()}`} 
          icon={<Star className="w-6 h-6" />}
          color="tertiary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 bento-card border-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Flujo de Caja</h3>
              <p className="text-xs text-slate-400">Análisis de ingresos, egresos y utilidad</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button 
                  onClick={() => setChartType('area')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    chartType === 'area' ? "bg-white shadow-sm text-primary ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"
                  )}
                  title="Gráfico de Área"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setChartType('bar')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    chartType === 'bar' ? "bg-white shadow-sm text-primary ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"
                  )}
                  title="Gráfico de Barras"
                >
                  <BarChart className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                {[
                  { id: 'weekly', label: 'SEM' },
                  { id: 'monthly', label: 'MEN' },
                  { id: 'quarterly', label: 'TRI' },
                  { id: 'semiannually', label: 'SEME' },
                  { id: 'annually', label: 'ANUAL' }
                ].map((s) => (
                  <button 
                    key={s.id}
                    onClick={() => setSegmentation(s.id as any)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider", 
                      segmentation === s.id 
                        ? "bg-white shadow-sm text-primary ring-1 ring-slate-200" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >{s.label}</button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                {[
                  { id: 'ingresos', label: 'INGRESOS', color: 'bg-primary', border: 'border-primary/20', activeBg: 'bg-primary/5' },
                  { id: 'egresos', label: 'EGRESOS', color: 'bg-red-500', border: 'border-red-500/20', activeBg: 'bg-red-500/5' },
                  { id: 'utilidad', label: 'UTILIDAD', color: 'bg-tertiary', border: 'border-tertiary/20', activeBg: 'bg-tertiary/5' }
                ].map((m) => (
                  <button 
                    key={m.id}
                    onClick={() => setVisibleMetrics(prev => ({ ...prev, [m.id]: !prev[m.id as keyof typeof prev] }))}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black transition-all border uppercase tracking-widest",
                      visibleMetrics[m.id as keyof typeof visibleMetrics]
                        ? `${m.activeBg} ${m.border} text-slate-700` 
                        : "bg-transparent border-slate-100 text-slate-300"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", visibleMetrics[m.id as keyof typeof visibleMetrics] ? m.color : "bg-slate-200")} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#001C35" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#001C35" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8E981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#E8E981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  {visibleMetrics.utilidad && (
                    <Area 
                      type="monotone" 
                      dataKey="utilidad" 
                      stroke="#E8E981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                    />
                  )}
                  {visibleMetrics.ingresos && (
                    <Area 
                      type="monotone" 
                      dataKey="ingresos" 
                      stroke="#001C35" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorIncome)" 
                    />
                  )}
                  {visibleMetrics.egresos && (
                    <Area 
                      type="monotone" 
                      dataKey="egresos" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorExpense)" 
                    />
                  )}
                </AreaChart>
              ) : (
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={<CustomTooltip />}
                  />
                  {visibleMetrics.ingresos && (
                    <Bar 
                      dataKey="ingresos" 
                      fill="#001C35" 
                      radius={[4, 4, 0, 0]} 
                      barSize={16}
                    />
                  )}
                  {visibleMetrics.egresos && (
                    <Bar 
                      dataKey="egresos" 
                      fill="#ef4444" 
                      radius={[4, 4, 0, 0]} 
                      barSize={16}
                    />
                  )}
                  {visibleMetrics.utilidad && (
                    <Line 
                      type="monotone" 
                      dataKey="utilidad" 
                      stroke="#E8E981" 
                      strokeWidth={4}
                      dot={{ r: 4, fill: '#E8E981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 bento-card border-none">
          <h3 className="text-lg font-bold text-slate-800 mb-8">Balance de Operaciones</h3>
          <div className="h-[240px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{data.name}</p>
                          <p className="text-sm font-black text-primary">${data.amount.toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-800">${(stats.monthlyIncome / 1000).toFixed(1)}k</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">INGRESOS</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-medium text-slate-500">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block">{item.value}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${item.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-8 bento-card border-none">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-slate-800">Transacciones Recientes</h3>
          <button className="text-xs font-bold text-primary hover:underline">Ver Historial Completo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-50">
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente / Entidad</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentTransactions.map((entry) => (
                <tr key={entry.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm",
                        entry.type === 'income' ? "bg-primary" : "bg-red-500"
                      )}>
                        {entry.description.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{entry.description}</p>
                        <p className="text-[10px] text-slate-400">ID: #{entry.id.substring(0, 6)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-xs font-medium text-slate-500">{entry.category}</td>
                  <td className="py-4 text-xs font-medium text-slate-500">{format(parseISO(entry.date), 'dd MMM, yyyy')}</td>
                  <td className={cn(
                    "py-4 text-sm font-bold",
                    entry.type === 'income' ? "text-slate-800" : "text-red-500"
                  )}>
                    {entry.type === 'expense' ? '-' : ''}${entry.amountUSD.toLocaleString()}
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      entry.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    )}>
                      {entry.type === 'income' ? 'COMPLETADO' : 'EGRESO'}
                    </span>
                  </td>
                  <td className="py-4">
                    <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                      <Filter className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, trend, color }: { label: string; value: string; icon: React.ReactNode; trend?: string; color: 'secondary' | 'red' | 'tertiary' | 'primary' }) {
  const colors = {
    secondary: 'bg-secondary/10 text-secondary',
    red: 'bg-red-50 text-red-600',
    tertiary: 'bg-tertiary/20 text-primary',
    primary: 'bg-primary/10 text-primary'
  };
  
  return (
    <Card className="p-6 bento-card border-none">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors[color])}>
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">
            {trend}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
      </div>
    </Card>
  );
}

// --- Clients View ---

function ClientsView({ clients, isAdding, setIsAdding, payments, cashflow }: { clients: Client[]; isAdding: boolean; setIsAdding: (v: boolean) => void; payments: Payment[]; cashflow: CashflowEntry[] }) {
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingDetails, setViewingDetails] = useState<Client | null>(null);

  const filteredClients = clients.filter(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const totalUSD = Number(formData.get('totalAmountUSD'));
    const installments = Number(formData.get('installments'));

    const newClient: Omit<Client, 'id'> = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      dni: formData.get('dni') as string,
      cuil: formData.get('cuil') as string,
      email: formData.get('email') as string,
      businessName: formData.get('businessName') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      province: formData.get('province') as string,
      country: formData.get('country') as string,
      installments,
      totalAmountUSD: totalUSD,
      comments: formData.get('comments') as string,
      createdAt: formData.get('createdAt') ? new Date(formData.get('createdAt') as string).toISOString() : new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'clients'), newClient);
      
      // Generate pending payments
      const installmentAmount = totalUSD / installments;
      for (let i = 1; i <= installments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        
        await addDoc(collection(db, 'payments'), {
          clientId: docRef.id,
          clientName: `${newClient.firstName} ${newClient.lastName}`,
          installmentNumber: i,
          amount: installmentAmount,
          currency: 'USD',
          amountUSD: installmentAmount,
          dueDate: dueDate.toISOString(),
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      setIsAdding(false);
    } catch (err) {
      console.error("Error adding client:", err);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient?.id) return;
    const formData = new FormData(e.currentTarget);
    
    const updatedClient: Partial<Client> = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      dni: formData.get('dni') as string,
      cuil: formData.get('cuil') as string,
      email: formData.get('email') as string,
      businessName: formData.get('businessName') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      province: formData.get('province') as string,
      country: formData.get('country') as string,
      comments: formData.get('comments') as string,
      createdAt: formData.get('createdAt') ? new Date(formData.get('createdAt') as string).toISOString() : editingClient.createdAt
    };

    try {
      await updateDoc(doc(db, 'clients', editingClient.id), updatedClient);
      setEditingClient(null);
    } catch (err) {
      console.error("Error updating client:", err);
    }
  };

  const handleSoftDeleteClient = async (id: string) => {
    try {
      const deletedAt = new Date().toISOString();
      await updateDoc(doc(db, 'clients', id), {
        deletedAt
      });
      
      // Also soft delete related payments
      const relatedPayments = payments.filter(p => p.clientId === id);
      for (const payment of relatedPayments) {
        if (payment.id) {
          await updateDoc(doc(db, 'payments', payment.id), {
            deletedAt
          });
        }
      }
      
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Error soft deleting client:", err);
    }
  };

  const clientPayments = viewingDetails ? payments.filter(p => p.clientId === viewingDetails.id) : [];
  const clientTransactions = viewingDetails ? cashflow.filter(c => c.paymentId && clientPayments.some(p => p.id === c.paymentId)) : [];


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <Button variant="tertiary" onClick={() => setIsAdding(true)} className="px-8">
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-[24px] border border-primary/5 shadow-sm">
        <Search className="w-5 h-5 text-secondary" />
        <input 
          type="text" 
          placeholder="Buscar por nombre o email..." 
          className="flex-1 outline-none text-sm font-bold text-primary placeholder:text-primary/30"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Filter className="w-5 h-5 text-primary/40" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredClients.map(client => {
          const clientPayments = payments.filter(p => p.clientId === client.id && !p.deletedAt);
          const paidCount = clientPayments.filter(p => p.status === 'paid').length;
          const totalCount = client.installments;
          const pendingCount = totalCount - paidCount;
          const isFullyPaid = paidCount >= totalCount && totalCount > 0;

          return (
            <Card key={client.id} className="p-8 bento-card space-y-6 group relative overflow-hidden">
              {isFullyPaid && (
                <div className="absolute top-0 right-0">
                  <div className="bg-green-500 text-white text-[8px] font-black px-6 py-1 rotate-45 translate-x-4 translate-y-2 uppercase tracking-widest shadow-sm">
                    Pago Completo
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-secondary/10 rounded-[18px] flex items-center justify-center text-secondary font-black text-xl italic transition-transform duration-300 group-hover:scale-110 shrink-0">
                  {client.firstName[0]}{client.lastName[0]}
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-primary text-lg tracking-tight truncate">{client.firstName} {client.lastName}</h4>
                  <p className="text-xs font-bold text-primary/40 truncate">{client.email || 'Sin email'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 py-6 border-y border-primary/5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/30">Monto Total</p>
                  <p className="text-xl font-black text-primary tracking-tighter italic">${client.totalAmountUSD.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/30">Cuotas</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-black text-primary tracking-tighter italic">{paidCount}/{totalCount}</p>
                    {pendingCount > 0 && (
                      <span className="text-[9px] font-black text-secondary uppercase tracking-widest">
                        {pendingCount} Pend.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {pendingCount > 0 && (() => {
                const nextPayment = clientPayments
                  .filter(p => p.status === 'pending')
                  .sort((a, b) => a.installmentNumber - b.installmentNumber)[0];
                
                if (!nextPayment) return null;

                const dueDate = parseISO(nextPayment.dueDate);
                const now = new Date();
                const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays <= 0;

                return (
                  <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    isOverdue ? "bg-red-50 border-red-100" : "bg-secondary/5 border-secondary/10"
                  )}>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1">Próximo Vencimiento</p>
                      <p className={cn(
                        "text-sm font-black italic tracking-tight",
                        isOverdue ? "text-red-600" : "text-primary"
                      )}>
                        {format(dueDate, 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1">Monto Cuota</p>
                      <p className="text-sm font-black text-secondary italic tracking-tight">
                        ${nextPayment.amountUSD.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })()}

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-3 h-3 text-secondary" />
                  <span>{client.country}, {client.province}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-3 py-1.5 rounded-full">
                  <Clock className="w-3 h-3 text-secondary" />
                  <span>Ingreso: {format(parseISO(client.createdAt), 'dd/MM/yyyy')}</span>
                </div>
              </div>
              {client.comments && (
                <p className="text-xs font-medium text-primary/50 italic bg-neutral p-4 rounded-[16px] border border-primary/5">
                  "{client.comments}"
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-primary/5">
              <button 
                onClick={() => setViewingDetails(client)}
                className="text-primary/40 hover:text-secondary transition-colors p-2 rounded-lg hover:bg-secondary/5"
                title="Ver Historial"
              >
                <History className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setEditingClient(client)}
                className="text-primary/40 hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/5"
                title="Editar"
              >
                <Edit className="w-5 h-5" />
              </button>
              <div className="flex items-center">
                {confirmDeleteId === client.id ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 bg-red-50 p-1 rounded-lg">
                    <button 
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] font-bold text-red-400 hover:text-red-600 px-2 py-1"
                    >
                      No
                    </button>
                    <button 
                      onClick={() => client.id && handleSoftDeleteClient(client.id)}
                      className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-md hover:bg-red-700 transition-colors shadow-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmDeleteId(client.id || null)} 
                    className="text-primary/40 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        )})}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full p-10 bento-card max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary uppercase italic tracking-tight">Nuevo <span className="text-secondary">Cliente</span></h3>
              <button onClick={() => setIsAdding(false)} className="text-primary/40 hover:text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Nombre" name="firstName" required />
                <Input label="Apellido" name="lastName" required />
                <Input label="DNI" name="dni" />
                <Input label="CUIL" name="cuil" />
                <Input label="Email" name="email" type="email" />
                <Input label="Razón Social" name="businessName" />
                <Input label="Domicilio" name="address" />
                <Input label="Localidad" name="city" />
                <Input label="Provincia" name="province" />
                <Input label="País" name="country" />
                <Input label="Fecha de Ingreso" name="createdAt" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
                <Input label="Monto Total (USD)" name="totalAmountUSD" type="number" step="0.01" required />
                <Select 
                  label="Cuotas" 
                  name="installments" 
                  options={[
                    { value: '1', label: '1 Pago' },
                    { value: '2', label: '2 Pagos' },
                    { value: '3', label: '3 Pagos' },
                    { value: '6', label: '6 Pagos' }
                  ]} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-1">Comentarios</label>
                <textarea name="comments" className="w-full px-4 py-3 bg-neutral border border-primary/10 rounded-[16px] focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none h-32 text-sm font-bold text-primary transition-all" />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="secondary" type="button" onClick={() => setIsAdding(false)} className="px-8">Cancelar</Button>
                <Button type="submit" className="px-10">Guardar Cliente</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {editingClient && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full p-10 bento-card max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary uppercase italic tracking-tight">Editar <span className="text-secondary">Cliente</span></h3>
              <button onClick={() => setEditingClient(null)} className="text-primary/40 hover:text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateClient} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Nombre" name="firstName" defaultValue={editingClient.firstName} required />
                <Input label="Apellido" name="lastName" defaultValue={editingClient.lastName} required />
                <Input label="DNI" name="dni" defaultValue={editingClient.dni} />
                <Input label="CUIL" name="cuil" defaultValue={editingClient.cuil} />
                <Input label="Email" name="email" type="email" defaultValue={editingClient.email} />
                <Input label="Razón Social" name="businessName" defaultValue={editingClient.businessName} />
                <Input label="Domicilio" name="address" defaultValue={editingClient.address} />
                <Input label="Localidad" name="city" defaultValue={editingClient.city} />
                <Input label="Provincia" name="province" defaultValue={editingClient.province} />
                <Input label="País" name="country" defaultValue={editingClient.country} />
                <Input label="Fecha de Ingreso" name="createdAt" type="date" defaultValue={format(parseISO(editingClient.createdAt), 'yyyy-MM-dd')} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-1">Comentarios</label>
                <textarea name="comments" defaultValue={editingClient.comments} className="w-full px-4 py-3 bg-neutral border border-primary/10 rounded-[16px] focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none h-32 text-sm font-bold text-primary transition-all" />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="secondary" type="button" onClick={() => setEditingClient(null)} className="px-8">Cancelar</Button>
                <Button type="submit" className="px-10">Actualizar Cliente</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {viewingDetails && (() => {
        const clientPaymentsList = payments.filter(p => p.clientId === viewingDetails.id && !p.deletedAt);
        const paidCount = clientPaymentsList.filter(p => p.status === 'paid').length;
        const totalCount = viewingDetails.installments;
        const isFullyPaid = paidCount >= totalCount && totalCount > 0;

        return (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <Card className="max-w-4xl w-full p-10 bento-card max-h-[90vh] overflow-y-auto relative overflow-hidden">
              {isFullyPaid && (
                <div className="absolute top-0 right-0">
                  <div className="bg-green-500 text-white text-[10px] font-black px-10 py-1 rotate-45 translate-x-8 translate-y-4 uppercase tracking-widest shadow-sm text-center">
                    Pago Completo
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary font-black italic">
                    {viewingDetails.firstName[0]}{viewingDetails.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-primary uppercase italic tracking-tight">Historial de <span className="text-secondary">{viewingDetails.firstName}</span></h3>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">{viewingDetails.email}</p>
                      <span className="text-[10px] font-black text-secondary/60 bg-secondary/5 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Cuotas: {paidCount}/{totalCount}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewingDetails(null)} className="text-primary/40 hover:text-primary transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-10">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30 flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" />
                    Pagos de Mentoría
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {clientPaymentsList.sort((a, b) => a.installmentNumber - b.installmentNumber).map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-5 bg-neutral rounded-2xl border border-primary/5">
                      <div className="flex items-center gap-6">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs font-black text-primary shadow-sm border border-primary/5">
                          #{payment.installmentNumber}
                        </div>
                        <div>
                          <p className="text-sm font-black text-primary tracking-tight">Vencimiento: {format(parseISO(payment.dueDate), 'dd/MM/yyyy')}</p>
                          <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Estado: {payment.status === 'paid' ? 'Cobrado' : 'Pendiente'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-primary italic tracking-tighter">${payment.amountUSD.toLocaleString()}</p>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                          payment.status === 'paid' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {payment.status === 'paid' ? 'Completado' : 'A cobrar'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30 flex items-center gap-2">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Transacciones y Movimientos
                </h4>
                {clientTransactions.length === 0 ? (
                  <p className="text-xs font-bold text-primary/30 italic p-6 bg-slate-50 rounded-2xl text-center">No hay transacciones registradas para este cliente.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {clientTransactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-primary/5 shadow-sm">
                        <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            tx.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          )}>
                            {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-primary tracking-tight">{tx.description}</p>
                            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{format(parseISO(tx.date), 'dd/MM/yyyy')} • {tx.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-lg font-black italic tracking-tighter",
                            tx.type === 'income' ? "text-green-600" : "text-red-600"
                          )}>
                            {tx.type === 'income' ? '+' : '-'}${tx.amountUSD.toLocaleString()}
                          </p>
                          <p className="text-[9px] font-bold text-primary/30 uppercase tracking-widest">{tx.paymentMethod}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </Card>
        </div>
      );
    })()}
    </div>
  );
}

// --- Payments View ---

function PaymentsView({ clients, payments }: { clients: Client[]; payments: Payment[] }) {
  const [isPaying, setIsPaying] = useState<Payment | null>(null);
  const [arsRate, setArsRate] = useState(1200); // Default placeholder rate
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchClient, setSearchClient] = useState('');

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesClient = p.clientName?.toLowerCase().includes(searchClient.toLowerCase());
      return matchesStatus && matchesClient;
    });
  }, [payments, filterStatus, searchClient]);

  const handleProcessPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isPaying) return;

    const formData = new FormData(e.currentTarget);
    const currency = formData.get('currency') as Currency;
    const amount = Number(formData.get('amount'));
    const rate = Number(formData.get('exchangeRate') || 1);
    
    const amountUSD = currency === 'USD' ? amount : amount / rate;

    try {
      const currentPaid = isPaying.paidAmountUSD || 0;
      const newPaid = currentPaid + amountUSD;
      const isFullyPaid = newPaid >= isPaying.amountUSD;

      await updateDoc(doc(db, 'payments', isPaying.id!), {
        status: isFullyPaid ? 'paid' : 'pending',
        paidAmountUSD: newPaid,
        amount,
        currency,
        amountUSD: isPaying.amountUSD, // Keep the original target amount
        exchangeRate: currency === 'ARS' ? rate : null,
        paymentMethod: formData.get('paymentMethod') as PaymentMethod,
        paymentDate: new Date().toISOString()
      });

      // Update next installment's due date if this one is fully paid
      if (isFullyPaid) {
        const nextInstallment = payments.find(p => 
          p.clientId === isPaying.clientId && 
          p.installmentNumber === isPaying.installmentNumber + 1 && 
          !p.deletedAt
        );
        if (nextInstallment) {
          const nextDueDate = addMonths(new Date(), 1).toISOString();
          await updateDoc(doc(db, 'payments', nextInstallment.id!), {
            dueDate: nextDueDate
          });
        }
      }

      // Add to cashflow
      await addDoc(collection(db, 'cashflow'), {
        type: 'income',
        amountUSD,
        category: 'Mentoria',
        date: new Date().toISOString(),
        description: `Pago cuota ${isPaying.installmentNumber} - ${isPaying.clientName}${newPaid < isPaying.amountUSD ? ' (Anticipo)' : ''}`,
        paymentId: isPaying.id,
        clientId: isPaying.clientId,
        createdAt: new Date().toISOString()
      });

      setIsPaying(null);
    } catch (err) {
      console.error("Error processing payment:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 w-full sm:w-64"
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <option value="all">Todos los estados</option>
            <option value="paid">Pagados</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>
      </div>

      <Card className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 border-b border-primary/5">
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 uppercase tracking-widest">Cuota</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 uppercase tracking-widest">Vencimiento</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 uppercase tracking-widest">Monto (USD)</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredPayments.map(payment => {
                const now = new Date();
                const dueDate = parseISO(payment.dueDate);
                const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays <= 0 && payment.status === 'pending';
                const isUpcoming = diffDays <= 7 && diffDays > 0 && payment.status === 'pending';

                return (
                  <tr key={payment.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-8 py-5 font-black text-primary tracking-tight">{payment.clientName}</td>
                    <td className="px-8 py-5 text-sm font-bold text-primary/60 italic">#{payment.installmentNumber}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-sm font-bold",
                          isOverdue ? "text-red-600" : isUpcoming ? "text-amber-600" : "text-primary/60"
                        )}>
                          {format(parseISO(payment.dueDate), 'dd/MM/yyyy')}
                        </span>
                        {isOverdue && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Vencido</span>}
                        {isUpcoming && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Próximo</span>}
                      </div>
                    </td>
                  <td className="px-8 py-5 text-lg font-black text-primary tracking-tighter italic">
                    ${payment.amountUSD.toLocaleString()}
                    {payment.paidAmountUSD && payment.paidAmountUSD < payment.amountUSD && (
                      <p className="text-[10px] text-secondary font-bold not-italic tracking-normal mt-1">
                        Restante: ${(payment.amountUSD - payment.paidAmountUSD).toLocaleString()}
                      </p>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                      payment.status === 'paid' ? "bg-green-100 text-green-700" : 
                      (payment.paidAmountUSD && payment.paidAmountUSD > 0 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")
                    )}>
                      {payment.status === 'paid' ? 'Pagado' : 
                       (payment.paidAmountUSD && payment.paidAmountUSD > 0 ? 'Parcial' : 'Pendiente')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {payment.status === 'pending' ? (
                      <Button variant="secondary" className="py-2 px-4 text-xs" onClick={() => setIsPaying(payment)}>
                        Registrar Pago
                      </Button>
                    ) : (
                      <div className="flex items-center justify-end gap-2 text-xs font-bold text-primary/40">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {payment.paymentMethod}
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {isPaying && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-10 bento-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-black text-primary uppercase italic tracking-tight">Registrar <span className="text-secondary">Pago</span></h3>
              <button onClick={() => setIsPaying(null)} className="text-primary/40 hover:text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-xs font-bold text-primary/40 mb-8 uppercase tracking-widest">
              Cuota #{isPaying.installmentNumber} • {isPaying.clientName}
              {isPaying.paidAmountUSD && isPaying.paidAmountUSD > 0 && (
                <span className="block text-secondary mt-1">
                  Pagado: ${isPaying.paidAmountUSD.toLocaleString()} • Restante: ${(isPaying.amountUSD - isPaying.paidAmountUSD).toLocaleString()}
                </span>
              )}
            </p>
            
            <form onSubmit={handleProcessPayment} className="space-y-6">
              <Select 
                label="Moneda" 
                name="currency" 
                defaultValue="USD"
                options={[{ value: 'USD', label: 'Dólares (USD)' }, { value: 'ARS', label: 'Pesos (ARS)' }]} 
              />
              <Input 
                label="Monto a Pagar" 
                name="amount" 
                type="number" 
                step="0.01" 
                defaultValue={isPaying.amountUSD - (isPaying.paidAmountUSD || 0)} 
                required 
              />
              
              <div className="p-6 bg-secondary/5 rounded-[24px] border border-secondary/10 space-y-4">
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Conversor ARS a USD</p>
                <Input 
                  label="Tipo de Cambio" 
                  name="exchangeRate" 
                  type="number" 
                  value={arsRate} 
                  onChange={(e) => setArsRate(Number(e.target.value))}
                />
                <p className="text-[10px] text-secondary font-bold italic">
                  Si paga en pesos, el cashflow se registrará en USD según el tipo de cambio ingresado.
                </p>
              </div>

              <Select 
                label="Medio de Pago" 
                name="paymentMethod" 
                required
                options={[
                  { value: 'Mercury', label: 'Mercury' },
                  { value: 'Stripe', label: 'Stripe' },
                  { value: 'Santander Argentina', label: 'Santander Argentina' },
                  { value: 'Belo Argentina', label: 'Belo Argentina' }
                ]} 
              />

              <div className="flex justify-end gap-4 pt-4">
                <Button variant="secondary" type="button" onClick={() => setIsPaying(null)} className="px-8">Cancelar</Button>
                <Button type="submit" className="px-10">Confirmar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Trash View ---

function TrashView({ clients, payments }: { clients: Client[]; payments: Payment[] }) {
  const [confirmPermDeleteId, setConfirmPermDeleteId] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    try {
      await updateDoc(doc(db, 'clients', id), {
        deletedAt: null
      });

      // Also restore related payments
      const relatedPayments = payments.filter(p => p.clientId === id && p.deletedAt);
      for (const payment of relatedPayments) {
        if (payment.id) {
          await updateDoc(doc(db, 'payments', payment.id), {
            deletedAt: null
          });
        }
      }
    } catch (err) {
      console.error("Error restoring client:", err);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      // First delete all related payments
      const relatedPayments = payments.filter(p => p.clientId === id);
      for (const payment of relatedPayments) {
        if (payment.id) {
          await deleteDoc(doc(db, 'payments', payment.id));
        }
      }

      // Then delete the client
      await deleteDoc(doc(db, 'clients', id));
      setConfirmPermDeleteId(null);
    } catch (err) {
      console.error("Error permanent deleting client:", err);
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="space-y-8">
      {clients.length === 0 ? (
        <Card className="p-12 bento-card flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
            <Trash2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">La papelera está vacía</h3>
            <p className="text-sm text-slate-400">No hay clientes eliminados recientemente.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {clients.map(client => {
            const daysRemaining = getDaysRemaining(client.deletedAt!);
            return (
              <Card key={client.id} className="p-8 bento-card space-y-6 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-[18px] flex items-center justify-center text-slate-400 font-black text-xl italic">
                      {client.firstName[0]}{client.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-primary text-lg tracking-tight">{client.firstName} {client.lastName}</h4>
                      <p className="text-xs font-bold text-red-500">Eliminado el {format(parseISO(client.deletedAt!), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Días restantes</span>
                    </div>
                    <span className="text-xl font-black text-red-600 italic">{daysRemaining}</span>
                  </div>
                  <div className="w-full bg-red-200 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-red-600 h-full transition-all duration-1000" 
                      style={{ width: `${(daysRemaining / 30) * 100}%` }}
                    />
                  </div>
                </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-primary/10 text-primary hover:bg-primary/5"
                      onClick={() => client.id && handleRestore(client.id)}
                    >
                      Restaurar
                    </Button>
                    {confirmPermDeleteId === client.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 bg-red-50 p-1 rounded-lg">
                        <button 
                          onClick={() => setConfirmPermDeleteId(null)}
                          className="text-[10px] font-bold text-red-400 hover:text-red-600 px-2 py-1"
                        >
                          No
                        </button>
                        <button 
                          onClick={() => client.id && handlePermanentDelete(client.id)}
                          className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-md hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Confirmar
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmPermDeleteId(client.id || null)}
                        className="flex-1 text-xs font-bold text-red-600 hover:underline"
                      >
                        Eliminar Permanente
                      </button>
                    )}
                  </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Reports View ---

function ReportsView({ cashflow, clients, payments }: { cashflow: CashflowEntry[]; clients: Client[]; payments: Payment[] }) {
  const incomeByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    cashflow.filter(e => e.type === 'income').forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amountUSD;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [cashflow]);

  const expenseByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    cashflow.filter(e => e.type === 'expense').forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amountUSD;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [cashflow]);

  const clientPerformance = useMemo(() => {
    return clients.map(client => {
      const clientPayments = payments.filter(p => p.clientId === client.id);
      const totalPaid = clientPayments.reduce((acc, p) => acc + (p.paidAmountUSD || 0), 0);
      const totalPending = clientPayments.reduce((acc, p) => acc + (p.status === 'pending' ? (p.amountUSD - (p.paidAmountUSD || 0)) : 0), 0);
      const progress = (totalPaid / client.totalAmountUSD) * 100;
      
      return {
        name: `${client.firstName} ${client.lastName}`,
        paid: totalPaid,
        pending: totalPending,
        total: client.totalAmountUSD,
        progress
      };
    }).sort((a, b) => b.paid - a.paid);
  }, [clients, payments]);

  const COLORS = ['#001C35', '#5E98D3', '#E8E981', '#F27D26', '#10b981', '#ef4444'];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 bento-card">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Ingresos por Categoría</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {incomeByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 bento-card">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Egresos por Categoría</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-8 bento-card">
        <h3 className="text-lg font-bold text-slate-800 mb-8">Rendimiento por Cliente</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-50">
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progreso de Pago</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cobrado</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendiente</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Contrato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clientPerformance.map((item, i) => (
                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-5">
                    <p className="text-sm font-bold text-slate-800">{item.name}</p>
                  </td>
                  <td className="py-5 pr-8">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-1000" 
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-primary w-8">{item.progress.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-5 text-sm font-bold text-green-600">${item.paid.toLocaleString()}</td>
                  <td className="py-5 text-sm font-bold text-amber-600">${item.pending.toLocaleString()}</td>
                  <td className="py-5 text-sm font-black text-primary italic">${item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// --- Cashflow View ---

function CashflowView({ 
  cashflow, 
  isAdding, 
  setIsAdding, 
  clients, 
  payments 
}: { 
  cashflow: CashflowEntry[]; 
  isAdding: boolean; 
  setIsAdding: (v: boolean) => void;
  clients: Client[];
  payments: Payment[];
}) {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [entryType, setEntryType] = useState<CashflowType>('income');
  
  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'quarter' | 'year'>('all');

  const [editingEntry, setEditingEntry] = useState<CashflowEntry | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  const clientPayments = payments.filter(p => p.clientId === selectedClientId && p.status === 'pending');

  const filteredCashflow = useMemo(() => {
    let filtered = [...cashflow];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(entry => entry.type === filterType);
    }

    // Filter by time
    if (timeFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (timeFilter) {
        case 'week':
          startDate = startOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'quarter':
          startDate = startOfQuarter(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(entry => isAfter(parseISO(entry.date), startDate) || entry.date === format(startDate, 'yyyy-MM-dd'));
    }

    return filtered;
  }, [cashflow, filterType, timeFilter]);

  const totals = useMemo(() => {
    return filteredCashflow.reduce((acc, entry) => {
      if (entry.type === 'income') acc.income += entry.amountUSD;
      else acc.expense += entry.amountUSD;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredCashflow]);

  const balance = totals.income - totals.expense;

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amountUSD = Number(formData.get('amountUSD'));
    const type = formData.get('type') as CashflowType;
    const paymentId = formData.get('paymentId') as string;
    const clientId = formData.get('clientId') as string;
    
    try {
      await addDoc(collection(db, 'cashflow'), {
        type,
        amountUSD,
        category: formData.get('category') as string,
        date: formData.get('date') as string,
        description: formData.get('description') as string,
        paymentMethod: formData.get('paymentMethod') as PaymentMethod,
        paymentId: paymentId || null,
        clientId: clientId || null,
        createdAt: new Date().toISOString()
      });

      // If it's an income linked to a payment, update the payment
      if (type === 'income' && paymentId) {
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
          const currentPaid = payment.paidAmountUSD || 0;
          const newPaid = currentPaid + amountUSD;
          
          // If the total paid reaches or exceeds the amount, mark as paid
          const isFullyPaid = newPaid >= payment.amountUSD;
          
          await updateDoc(doc(db, 'payments', paymentId), {
            paidAmountUSD: newPaid,
            status: isFullyPaid ? 'paid' : 'pending',
            paymentDate: new Date().toISOString(),
            paymentMethod: formData.get('paymentMethod') as PaymentMethod
          });
        }
      }

      setIsAdding(false);
      setSelectedClientId('');
      setSelectedPaymentId('');
    } catch (err) {
      console.error("Error adding cashflow entry:", err);
    }
  };

  const handleUpdateEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEntry) return;
    const formData = new FormData(e.currentTarget);
    const amountUSD = Number(formData.get('amountUSD'));
    const type = formData.get('type') as CashflowType;
    const paymentId = editingEntry.paymentId;
    
    try {
      // If it's an income linked to a payment, update the payment
      if (type === 'income' && paymentId) {
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
          const diff = amountUSD - editingEntry.amountUSD;
          const currentPaid = payment.paidAmountUSD || 0;
          const newPaid = currentPaid + diff;
          
          const isFullyPaid = newPaid >= payment.amountUSD;
          
          await updateDoc(doc(db, 'payments', paymentId), {
            paidAmountUSD: newPaid,
            status: isFullyPaid ? 'paid' : 'pending',
          });
        }
      }

      await updateDoc(doc(db, 'cashflow', editingEntry.id!), {
        type,
        amountUSD,
        category: formData.get('category') as string,
        date: formData.get('date') as string,
        description: formData.get('description') as string,
        paymentMethod: formData.get('paymentMethod') as PaymentMethod,
      });

      setEditingEntry(null);
    } catch (err) {
      console.error("Error updating cashflow entry:", err);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const entry = cashflow.find(e => e.id === id);
    if (!entry) return;

    try {
      // If it's an income linked to a payment, update the payment
      if (entry.type === 'income' && entry.paymentId) {
        const payment = payments.find(p => p.id === entry.paymentId);
        if (payment) {
          const currentPaid = payment.paidAmountUSD || 0;
          const newPaid = Math.max(0, currentPaid - entry.amountUSD);
          
          await updateDoc(doc(db, 'payments', entry.paymentId), {
            paidAmountUSD: newPaid,
            status: 'pending', // Revert to pending if a payment is deleted
          });
        }
      }

      await deleteDoc(doc(db, 'cashflow', id));
      setIsDeletingId(null);
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setFilterType('all')}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                filterType === 'all' ? "bg-primary text-white shadow-md" : "text-primary/40 hover:text-primary"
              )}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterType('income')}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                filterType === 'income' ? "bg-green-600 text-white shadow-md" : "text-primary/40 hover:text-green-600"
              )}
            >
              Ingresos
            </button>
            <button 
              onClick={() => setFilterType('expense')}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                filterType === 'expense' ? "bg-red-600 text-white shadow-md" : "text-primary/40 hover:text-red-600"
              )}
            >
              Egresos
            </button>
          </div>

          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <option value="all">Todo el tiempo</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="quarter">Este trimestre</option>
            <option value="year">Este año</option>
          </select>

          <Button variant="tertiary" onClick={() => setIsAdding(true)} className="px-8">
            <Plus className="w-5 h-5" />
            Nueva Entrada
          </Button>
        </div>
      </div>

      {/* Balance Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 bento-card bg-white border-none shadow-xl shadow-primary/5">
          <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] mb-2">Total Ingresos</p>
          <p className="text-3xl font-black text-green-600 tracking-tighter italic">${totals.income.toLocaleString()}</p>
        </Card>
        <Card className="p-8 bento-card bg-white border-none shadow-xl shadow-primary/5">
          <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] mb-2">Total Egresos</p>
          <p className="text-3xl font-black text-red-600 tracking-tighter italic">${totals.expense.toLocaleString()}</p>
        </Card>
        <Card className={cn(
          "p-8 bento-card border-none shadow-xl shadow-primary/5",
          balance >= 0 ? "bg-primary text-white" : "bg-red-600 text-white"
        )}>
          <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-2">Saldo Neto</p>
          <p className="text-3xl font-black tracking-tighter italic">${balance.toLocaleString()}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCashflow.map(entry => (
          <Card key={entry.id} className="p-6 bento-card flex items-center justify-between gap-6 group">
            <div className="flex items-center gap-6">
              <div className={cn(
                "w-14 h-14 rounded-[18px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                entry.type === 'income' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {entry.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-black text-primary text-lg tracking-tight">{entry.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-bold text-primary/40">{format(parseISO(entry.date), 'dd/MM/yyyy')}</span>
                  <span className="w-1 h-1 bg-primary/10 rounded-full"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 bg-primary/5 px-2 py-0.5 rounded-full">{entry.category}</span>
                  {entry.paymentMethod && (
                    <>
                      <span className="w-1 h-1 bg-primary/10 rounded-full"></span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{entry.paymentMethod}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className={cn(
                "text-2xl font-black tracking-tighter italic",
                entry.type === 'income' ? "text-green-600" : "text-red-600"
              )}>
                {entry.type === 'income' ? '+' : '-'}${entry.amountUSD.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingEntry(entry)} 
                  className="text-primary/20 hover:text-primary transition-colors p-2"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {isDeletingId === entry.id ? (
                  <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg">
                    <button 
                      onClick={() => entry.id && handleDeleteEntry(entry.id)} 
                      className="text-red-600 hover:bg-red-100 p-1 rounded transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsDeletingId(null)} 
                      className="text-primary/40 hover:bg-slate-100 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => entry.id && setIsDeletingId(entry.id)} 
                    className="text-primary/20 hover:text-red-600 transition-colors p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-10 bento-card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary uppercase italic tracking-tight">Nueva <span className="text-secondary">Entrada</span></h3>
              <button onClick={() => setIsAdding(false)} className="text-primary/40 hover:text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="space-y-6">
              <Select 
                label="Tipo" 
                name="type" 
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as CashflowType)}
                options={[{ value: 'income', label: 'Ingreso' }, { value: 'expense', label: 'Egreso' }]} 
              />

              {entryType === 'income' && (
                <>
                  <Select 
                    label="Cliente (Opcional)" 
                    name="clientId" 
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      setSelectedPaymentId('');
                    }}
                    options={[
                      { value: '', label: 'Ninguno' },
                      ...clients.map(c => ({ value: c.id!, label: `${c.firstName} ${c.lastName}` }))
                    ]} 
                  />

                  {selectedClientId && (
                    <Select 
                      label="Cuota Pendiente" 
                      name="paymentId" 
                      value={selectedPaymentId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPaymentId(pid);
                        const p = clientPayments.find(cp => cp.id === pid);
                        if (p) {
                          // Auto-fill description and amount
                          const descInput = document.getElementsByName('description')[0] as HTMLInputElement;
                          const amountInput = document.getElementsByName('amountUSD')[0] as HTMLInputElement;
                          const categoryInput = document.getElementsByName('category')[0] as HTMLInputElement;
                          if (descInput) descInput.value = `Pago cuota ${p.installmentNumber} - ${p.clientName}`;
                          if (amountInput) amountInput.value = (p.amountUSD - (p.paidAmountUSD || 0)).toString();
                          if (categoryInput) categoryInput.value = 'Mentoria';
                        }
                      }}
                      options={[
                        { value: '', label: 'Seleccionar cuota...' },
                        ...clientPayments.map(p => ({ 
                          value: p.id!, 
                          label: `Cuota #${p.installmentNumber} - Restante: $${(p.amountUSD - (p.paidAmountUSD || 0)).toLocaleString()}` 
                        }))
                      ]} 
                    />
                  )}
                </>
              )}

              <Input label="Monto (USD)" name="amountUSD" type="number" step="0.01" required />
              <Input label="Fecha" name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
              <Input label="Categoría" name="category" placeholder="Ej: Marketing, Software, Mentoria" required />
              <Input label="Descripción" name="description" placeholder="Ej: Pago publicidad Facebook" required />
              <Select 
                label="Medio de Pago / Origen" 
                name="paymentMethod" 
                required
                options={[
                  { value: 'Mercury', label: 'Mercury' },
                  { value: 'Stripe', label: 'Stripe' },
                  { value: 'Santander Argentina', label: 'Santander Argentina' },
                  { value: 'Belo Argentina', label: 'Belo Argentina' }
                ]} 
              />
              
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="secondary" type="button" onClick={() => {
                  setIsAdding(false);
                  setSelectedClientId('');
                  setSelectedPaymentId('');
                }} className="px-8">Cancelar</Button>
                <Button type="submit" className="px-10">Guardar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {editingEntry && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-10 bento-card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary uppercase italic tracking-tight">Editar <span className="text-secondary">Entrada</span></h3>
              <button onClick={() => setEditingEntry(null)} className="text-primary/40 hover:text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateEntry} className="space-y-6">
              <Select 
                label="Tipo" 
                name="type" 
                defaultValue={editingEntry.type}
                options={[{ value: 'income', label: 'Ingreso' }, { value: 'expense', label: 'Egreso' }]} 
              />

              <Input label="Monto (USD)" name="amountUSD" type="number" step="0.01" defaultValue={editingEntry.amountUSD} required />
              <Input label="Fecha" name="date" type="date" defaultValue={editingEntry.date} required />
              <Input label="Categoría" name="category" defaultValue={editingEntry.category} required />
              <Input label="Descripción" name="description" defaultValue={editingEntry.description} required />
              <Select 
                label="Medio de Pago / Origen" 
                name="paymentMethod" 
                defaultValue={editingEntry.paymentMethod}
                required
                options={[
                  { value: 'Mercury', label: 'Mercury' },
                  { value: 'Stripe', label: 'Stripe' },
                  { value: 'Santander Argentina', label: 'Santander Argentina' },
                  { value: 'Belo Argentina', label: 'Belo Argentina' }
                ]} 
              />
              
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="secondary" type="button" onClick={() => setEditingEntry(null)} className="px-8">Cancelar</Button>
                <Button type="submit" className="px-10">Actualizar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Payroll View ---

function PayrollView({ 
  staff, 
  payroll, 
  isAddingStaff, 
  setIsAddingStaff 
}: { 
  staff: StaffMember[]; 
  payroll: PayrollPayment[];
  isAddingStaff: boolean;
  setIsAddingStaff: (v: boolean) => void;
}) {
  const [isPayingStaff, setIsPayingStaff] = useState<StaffMember | null>(null);
  const [isDeletingStaffId, setIsDeletingStaffId] = useState<string | null>(null);

  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await addDoc(collection(db, 'staff'), {
        name: formData.get('name') as string,
        role: formData.get('role') as string,
        email: formData.get('email') as string,
        baseSalaryUSD: Number(formData.get('baseSalaryUSD')),
        createdAt: new Date().toISOString()
      });
      setIsAddingStaff(false);
    } catch (err) {
      console.error("Error adding staff member:", err);
    }
  };

  const handleProcessPayroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isPayingStaff) return;
    const formData = new FormData(e.currentTarget);
    const amountUSD = Number(formData.get('amountUSD'));
    const date = formData.get('date') as string;
    const period = formData.get('period') as string;
    const paymentMethod = formData.get('paymentMethod') as PaymentMethod;

    try {
      // 1. Record Payroll Payment
      await addDoc(collection(db, 'payroll'), {
        staffId: isPayingStaff.id,
        staffName: isPayingStaff.name,
        amountUSD,
        date,
        period,
        paymentMethod,
        createdAt: new Date().toISOString()
      });

      // 2. Add to Cashflow as Expense
      await addDoc(collection(db, 'cashflow'), {
        type: 'expense',
        amountUSD,
        category: 'Payroll',
        date,
        description: `Pago Payroll ${period} - ${isPayingStaff.name}`,
        paymentMethod,
        createdAt: new Date().toISOString()
      });

      setIsPayingStaff(null);
    } catch (err) {
      console.error("Error processing payroll:", err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await updateDoc(doc(db, 'staff', id), {
        deletedAt: new Date().toISOString()
      });
      setIsDeletingStaffId(null);
    } catch (err) {
      console.error("Error deleting staff member:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button onClick={() => setIsAddingStaff(true)}>
          <Plus className="w-5 h-5" />
          Agregar Integrante
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Staff List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-black text-primary uppercase italic tracking-tight mb-4">Integrantes de la <span className="text-secondary">Consultora</span></h3>
          {staff.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-12 h-12 text-primary/10 mx-auto mb-4" />
              <p className="text-primary/40 font-medium italic">No hay integrantes registrados.</p>
            </Card>
          ) : (
            staff.map(s => (
              <Card key={s.id} className="p-6 bento-card flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center text-primary font-black">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-primary tracking-tight">{s.name}</p>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest">{s.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Sueldo Base</p>
                    <p className="text-lg font-black text-primary italic">${s.baseSalaryUSD.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="py-2 px-4 text-xs" onClick={() => setIsPayingStaff(s)}>
                      Pagar
                    </Button>
                    {isDeletingStaffId === s.id ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg">
                        <button onClick={() => s.id && handleDeleteStaff(s.id)} className="text-red-600 p-1"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setIsDeletingStaffId(null)} className="text-primary/40 p-1"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => s.id && setIsDeletingStaffId(s.id)} className="text-primary/10 hover:text-red-600 p-2 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Recent Payroll History */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-primary uppercase italic tracking-tight mb-4">Historial de <span className="text-secondary">Pagos</span></h3>
          <div className="space-y-3">
            {payroll.slice(0, 10).map(p => (
              <Card key={p.id} className="p-4 bento-card border-none shadow-sm bg-white/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-primary tracking-tight">{p.staffName}</p>
                    <p className="text-[9px] font-bold text-primary/40 uppercase">{p.period}</p>
                  </div>
                  <p className="text-sm font-black text-red-600 italic">-${p.amountUSD.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[8px] font-black text-secondary uppercase tracking-widest">{p.paymentMethod}</span>
                  <span className="text-[8px] font-bold text-primary/30">{format(parseISO(p.date), 'dd/MM/yyyy')}</span>
                </div>
              </Card>
            ))}
            {payroll.length === 0 && (
              <p className="text-xs text-primary/30 italic text-center py-8">No hay pagos registrados.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddingStaff && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-10 bento-card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary uppercase italic tracking-tight">Nuevo <span className="text-secondary">Integrante</span></h3>
              <button onClick={() => setIsAddingStaff(false)} className="text-primary/40 hover:text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-6">
              <Input label="Nombre Completo" name="name" placeholder="Ej: Juan Perez" required />
              <Input label="Rol / Puesto" name="role" placeholder="Ej: Consultor Senior" required />
              <Input label="Email" name="email" type="email" placeholder="juan@consultora.com" />
              <Input label="Sueldo Base (USD)" name="baseSalaryUSD" type="number" step="0.01" required />
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="secondary" type="button" onClick={() => setIsAddingStaff(false)} className="px-8">Cancelar</Button>
                <Button type="submit" className="px-10">Guardar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {isPayingStaff && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-10 bento-card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary uppercase italic tracking-tight">Registrar <span className="text-secondary">Pago</span></h3>
              <button onClick={() => setIsPayingStaff(null)} className="text-primary/40 hover:text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-6 p-4 bg-primary/5 rounded-xl">
              <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Integrante</p>
              <p className="text-lg font-black text-primary">{isPayingStaff.name}</p>
            </div>
            <form onSubmit={handleProcessPayroll} className="space-y-6">
              <Input label="Monto a Pagar (USD)" name="amountUSD" type="number" step="0.01" defaultValue={isPayingStaff.baseSalaryUSD} required />
              <Input label="Fecha de Pago" name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
              <Input label="Periodo" name="period" placeholder="Ej: Marzo 2026" required />
              <Select 
                label="Medio de Pago" 
                name="paymentMethod" 
                required
                options={[
                  { value: 'Mercury', label: 'Mercury' },
                  { value: 'Stripe', label: 'Stripe' },
                  { value: 'Santander Argentina', label: 'Santander Argentina' },
                  { value: 'Belo Argentina', label: 'Belo Argentina' }
                ]} 
              />
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="secondary" type="button" onClick={() => setIsPayingStaff(null)} className="px-8">Cancelar</Button>
                <Button type="submit" className="px-10">Confirmar Pago</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
