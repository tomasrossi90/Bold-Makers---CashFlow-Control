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
import { Client, Payment, CashflowEntry, Currency, PaymentStatus, PaymentMethod, CashflowType } from './types';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
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
  AlertCircle
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { 
  BarChart, 
  Bar, 
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
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100'
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50', variants[variant], className)} 
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)} {...props}>
    {children}
  </div>
);

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input 
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
      {...props} 
    />
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select 
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'payments' | 'cashflow'>('dashboard');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([]);

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

    return () => {
      unsubClients();
      unsubPayments();
      unsubCashflow();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Bold Makers</h1>
            <p className="text-gray-500">CashFlow Control - Gestión de mentorías.</p>
          </div>
          <Button onClick={loginWithGoogle} className="w-full py-3">
            <LogIn className="w-5 h-5" />
            Ingresar con Google
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Bold Makers</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
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
            label="Pagos / Cuotas"
          />
          <NavItem 
            active={activeTab === 'cashflow'} 
            onClick={() => setActiveTab('cashflow')}
            icon={<DollarSign className="w-5 h-5" />}
            label="Cashflow"
          />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView clients={clients} payments={payments} cashflow={cashflow} />}
        {activeTab === 'clients' && <ClientsView clients={clients} />}
        {activeTab === 'payments' && <PaymentsView clients={clients} payments={payments} />}
        {activeTab === 'cashflow' && <CashflowView cashflow={cashflow} />}
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-indigo-50 text-indigo-700" 
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Dashboard View ---

function DashboardView({ clients, payments, cashflow }: { clients: Client[]; payments: Payment[]; cashflow: CashflowEntry[] }) {
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
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(currentMonth, 5 - i);
      const monthStr = format(date, 'MMM');
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const income = cashflow
        .filter(e => e.type === 'income' && isAfter(parseISO(e.date), monthStart) && isBefore(parseISO(e.date), monthEnd))
        .reduce((acc, e) => acc + e.amountUSD, 0);

      const expenses = cashflow
        .filter(e => e.type === 'expense' && isAfter(parseISO(e.date), monthStart) && isBefore(parseISO(e.date), monthEnd))
        .reduce((acc, e) => acc + e.amountUSD, 0);

      return { name: monthStr, ingresos: income, egresos: expenses, utilidad: income - expenses };
    });
    return last6Months;
  }, [cashflow, currentMonth]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resumen del Negocio</h2>
          <p className="text-gray-500">Control de ingresos, egresos y utilidad mensual.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600">
          <Calendar className="w-4 h-4" />
          {format(new Date(), 'MMMM yyyy')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Ingresos (Mes)" 
          value={`$${stats.monthlyIncome.toLocaleString()}`} 
          icon={<ArrowUpRight className="text-green-600" />}
          trend="+12%"
          color="green"
        />
        <StatCard 
          label="Egresos (Mes)" 
          value={`$${stats.monthlyExpenses.toLocaleString()}`} 
          icon={<ArrowDownRight className="text-red-600" />}
          trend="-5%"
          color="red"
        />
        <StatCard 
          label="Utilidad (Mes)" 
          value={`$${stats.profit.toLocaleString()}`} 
          icon={<TrendingUp className="text-indigo-600" />}
          trend="+8%"
          color="indigo"
        />
        <StatCard 
          label="Pendiente Cobro" 
          value={`$${stats.pendingPayments.toLocaleString()}`} 
          icon={<Clock className="text-amber-600" />}
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Flujo de Caja (Últimos 6 meses)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="ingresos" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Ingresos" />
                <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Egresos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución de Utilidad</h3>
          <div className="h-80 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Utilidad', value: stats.profit > 0 ? stats.profit : 0 },
                    { name: 'Egresos', value: stats.monthlyExpenses }
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#4f46e5" />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <p className="text-3xl font-bold text-gray-900">
                {stats.monthlyIncome > 0 ? Math.round((stats.profit / stats.monthlyIncome) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500">Margen de Profit</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, color }: { label: string; value: string; icon: React.ReactNode; trend?: string; color: 'green' | 'red' | 'indigo' | 'amber' }) {
  const colors = {
    green: 'bg-green-50',
    red: 'bg-red-50',
    indigo: 'bg-indigo-50',
    amber: 'bg-amber-50'
  };
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg", colors[color])}>
          {icon}
        </div>
        {trend && (
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full", trend.startsWith('+') ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </Card>
  );
}

// --- Clients View ---

function ClientsView({ clients }: { clients: Client[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');

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
      createdAt: new Date().toISOString()
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

  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente? Se eliminarán también sus pagos.')) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
      // In a real app, we'd also delete associated payments (cloud function or batch)
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-gray-500">Listado y gestión de alumnos de mentoría.</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar por nombre o email..." 
          className="flex-1 outline-none text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Filter className="w-5 h-5 text-gray-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <Card key={client.id} className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">
                  {client.firstName[0]}{client.lastName[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{client.firstName} {client.lastName}</h4>
                  <p className="text-xs text-gray-500">{client.email || 'Sin email'}</p>
                </div>
              </div>
              <button onClick={() => client.id && handleDeleteClient(client.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Monto Total</p>
                <p className="text-lg font-bold text-gray-900">${client.totalAmountUSD.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Cuotas</p>
                <p className="text-lg font-bold text-gray-900">{client.installments}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <AlertCircle className="w-3 h-3" />
                <span>{client.country}, {client.province}</span>
              </div>
              {client.comments && (
                <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                  "{client.comments}"
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Agregar Nuevo Cliente</h3>
            <form onSubmit={handleAddClient} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Comentarios</label>
                <textarea name="comments" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button type="submit">Guardar Cliente</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Payments View ---

function PaymentsView({ clients, payments }: { clients: Client[]; payments: Payment[] }) {
  const [isPaying, setIsPaying] = useState<Payment | null>(null);
  const [arsRate, setArsRate] = useState(1200); // Default placeholder rate

  const handleProcessPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isPaying) return;

    const formData = new FormData(e.currentTarget);
    const currency = formData.get('currency') as Currency;
    const amount = Number(formData.get('amount'));
    const rate = Number(formData.get('exchangeRate') || 1);
    
    const amountUSD = currency === 'USD' ? amount : amount / rate;

    try {
      await updateDoc(doc(db, 'payments', isPaying.id!), {
        status: 'paid',
        amount,
        currency,
        amountUSD,
        exchangeRate: currency === 'ARS' ? rate : null,
        paymentMethod: formData.get('paymentMethod') as PaymentMethod,
        paymentDate: new Date().toISOString()
      });

      // Add to cashflow
      await addDoc(collection(db, 'cashflow'), {
        type: 'income',
        amountUSD,
        category: 'Mentoria',
        date: new Date().toISOString(),
        description: `Pago cuota ${isPaying.installmentNumber} - ${isPaying.clientName}`,
        paymentId: isPaying.id,
        createdAt: new Date().toISOString()
      });

      setIsPaying(null);
    } catch (err) {
      console.error("Error processing payment:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Control de Pagos</h2>
          <p className="text-gray-500">Seguimiento de cuotas y vencimientos.</p>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cuota</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vencimiento</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Monto (USD)</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map(payment => (
              <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{payment.clientName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">#{payment.installmentNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{format(parseISO(payment.dueDate), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">${payment.amountUSD.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    payment.status === 'paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {payment.status === 'paid' ? 'Pagado' : 'Pendiente'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {payment.status === 'pending' ? (
                    <Button variant="secondary" className="py-1 text-xs" onClick={() => setIsPaying(payment)}>
                      Registrar Pago
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {payment.paymentMethod}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {isPaying && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Registrar Pago</h3>
            <p className="text-sm text-gray-500 mb-6">Cuota #{isPaying.installmentNumber} de {isPaying.clientName}</p>
            
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <Select 
                label="Moneda" 
                name="currency" 
                defaultValue="USD"
                options={[{ value: 'USD', label: 'Dólares (USD)' }, { value: 'ARS', label: 'Pesos (ARS)' }]} 
              />
              <Input label="Monto" name="amount" type="number" step="0.01" defaultValue={isPaying.amountUSD} required />
              
              <div className="p-4 bg-indigo-50 rounded-lg space-y-3">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Conversor ARS a USD</p>
                <Input 
                  label="Tipo de Cambio (Dólar Blue/MEP)" 
                  name="exchangeRate" 
                  type="number" 
                  value={arsRate} 
                  onChange={(e) => setArsRate(Number(e.target.value))}
                />
                <p className="text-xs text-indigo-600 italic">
                  Si paga en pesos, el cashflow se registrará como ${(isPaying.amountUSD).toLocaleString()} USD.
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

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setIsPaying(null)}>Cancelar</Button>
                <Button type="submit">Confirmar Pago</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Cashflow View ---

function CashflowView({ cashflow }: { cashflow: CashflowEntry[] }) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await addDoc(collection(db, 'cashflow'), {
        type: formData.get('type') as CashflowType,
        amountUSD: Number(formData.get('amountUSD')),
        category: formData.get('category') as string,
        date: formData.get('date') as string,
        description: formData.get('description') as string,
        paymentMethod: formData.get('paymentMethod') as PaymentMethod,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding cashflow entry:", err);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada de caja?')) return;
    try {
      await deleteDoc(doc(db, 'cashflow', id));
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cashflow</h2>
          <p className="text-gray-500">Registro histórico de ingresos y egresos.</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="w-5 h-5" />
          Nueva Entrada
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cashflow.map(entry => (
          <Card key={entry.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                entry.type === 'income' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {entry.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-gray-900">{entry.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{format(parseISO(entry.date), 'dd/MM/yyyy')}</span>
                  <span>•</span>
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">{entry.category}</span>
                  {entry.paymentMethod && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-600 font-medium">{entry.paymentMethod}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <p className={cn(
                "text-lg font-bold",
                entry.type === 'income' ? "text-green-600" : "text-red-600"
              )}>
                {entry.type === 'income' ? '+' : '-'}${entry.amountUSD.toLocaleString()}
              </p>
              <button onClick={() => entry.id && handleDeleteEntry(entry.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Nueva Entrada de Caja</h3>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <Select 
                label="Tipo" 
                name="type" 
                options={[{ value: 'income', label: 'Ingreso' }, { value: 'expense', label: 'Egreso' }]} 
              />
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
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button type="submit">Guardar Entrada</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
