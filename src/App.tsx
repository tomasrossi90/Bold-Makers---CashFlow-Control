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
  where,
  getDoc,
  serverTimestamp,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, loginWithGoogle, logout } from './firebase';
import { Client, Payment, CashflowEntry, Currency, PaymentStatus, PaymentMethod, CashflowType, StaffMember, PayrollPayment, AppSettings, Commission, StaffType, InvoiceStatus, InvoiceType } from './types';
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
  RefreshCw,
  Trash2, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Download,
  X,
  Settings,
  Moon,
  Sun,
  Menu,
  ShieldCheck,
  Zap,
  BarChart3,
  LayoutDashboard,
  Target,
  ArrowRight,
  Globe,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  addMonths,
  setDate
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Toaster, toast } from 'sonner';
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

function ContextualSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-primary/5 dark:border-slate-700 shadow-sm mb-8">
      <Search className="w-5 h-5 text-secondary" />
      <input 
        type="text" 
        placeholder={placeholder || "Buscar..."} 
        className="flex-1 outline-none text-sm font-bold text-primary dark:text-white bg-transparent placeholder:text-primary/30 dark:placeholder:text-slate-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Filter className="w-5 h-5 text-primary/40" />
    </div>
  );
}

const formatUSD = (val: number) => Math.round(val || 0).toLocaleString();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Context ---
export const SettingsContext = React.createContext<AppSettings | null>(null);

const useCurrency = () => {
  const settings = React.useContext(SettingsContext);
  if (!settings) return (val: number) => `$${(val || 0).toLocaleString()}`;
  
  return (val: number) => {
    const symbols = { 'USD': '$', 'ARS': '$', 'EUR': '€' };
    const symbol = symbols[settings.currency] || '$';
    const formatted = (val || 0).toLocaleString(undefined, {
      minimumFractionDigits: settings.decimals,
      maximumFractionDigits: settings.decimals
    });
    return `${symbol}${formatted}`;
  };
};

// --- Components ---

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'tertiary' }) => {
  const variants = {
    primary: 'bg-primary text-white hover:opacity-90 dark:bg-secondary dark:text-primary',
    secondary: 'bg-neutral text-primary border border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:text-white dark:border-slate-700',
    tertiary: 'bg-tertiary text-primary hover:opacity-90',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-primary hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800'
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
    {label && <label className="text-xs font-bold text-primary/60 dark:text-secondary/60 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative">
      <input 
        className="w-full px-4 py-3 bg-neutral/50 dark:bg-slate-800/50 border border-white/50 dark:border-slate-700 rounded-[16px] focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all text-primary dark:text-white placeholder:text-primary/30 dark:placeholder:text-slate-500" 
        {...props} 
      />
    </div>
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-bold text-primary/60 dark:text-secondary/60 uppercase tracking-wider ml-1">{label}</label>}
    <select 
      className="w-full px-4 py-3 bg-neutral/50 dark:bg-slate-800/50 border border-white/50 dark:border-slate-700 rounded-[16px] focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all text-primary dark:text-white appearance-none" 
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value} className="dark:bg-slate-800">{opt.label}</option>)}
    </select>
  </div>
);

function CompanySetup({ user, onComplete }: { user: User; onComplete: (profile: any) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const companyRef = await addDoc(collection(db, 'companies'), {
        name,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });

      const profileData = {
        uid: user.uid,
        email: user.email,
        companyId: companyRef.id,
        role: 'admin',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), profileData);
      
      // Initialize settings for the company
      await setDoc(doc(db, 'settings', companyRef.id), {
        companyId: companyRef.id,
        currency: 'USD',
        decimals: 0,
        theme: 'light',
        paymentMethods: ['Mercury', 'Stripe', 'Santander Argentina', 'Belo Argentina'],
        updatedAt: new Date().toISOString(),
        payrollDay: 5,
        defaultSetterCommissionPct: 5,
        defaultCloserCommissionPct: 10
      });

      onComplete(profileData);
    } catch (err) {
      console.error("Error setting up company:", err);
      toast.error("Error al configurar la empresa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary dark:text-white">Bienvenido a CashFlow Pro</h1>
          <p className="text-primary/60 dark:text-slate-400">Para comenzar, configura los datos de tu empresa o mentoría.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre de la Empresa / Mentoría" 
            placeholder="Ej: Mentorship Academy" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit" className="w-full py-4" disabled={loading}>
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Crear Empresa"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function TeamManagement({ userProfile }: { userProfile: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('companyId', '==', userProfile.companyId));
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [userProfile.companyId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setLoading(true);

    try {
      // In a real app, we would send an invite. 
      // For this demo, we'll just pre-create the user profile.
      // Note: This requires the user to log in with this exact email later.
      
      // We need a way to find the UID if they already exist, or just wait for them to join.
      // For simplicity in this environment, we'll assume we can't easily invite by email without a backend.
      // But the user asked to "invite new users".
      
      toast.info("Funcionalidad de invitación: En un entorno real, esto enviaría un correo. Por ahora, el usuario debe registrarse con este email para unirse.");
      
      // We'll just show a message for now as we can't create Auth users from client side.
      setIsAdding(false);
      setNewEmail('');
    } catch (err) {
      console.error("Error adding user:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary dark:text-white">Gestión de Equipo</h2>
          <p className="text-primary/60 dark:text-slate-400">Administra los roles y accesos de tu empresa.</p>
        </div>
        {userProfile.role === 'admin' && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="w-5 h-5" />
            Invitar Usuario
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {users.map((u) => (
          <Card key={u.uid} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-primary dark:text-white">{u.email}</p>
                <p className="text-xs text-primary/40 dark:text-slate-500 uppercase tracking-wider">{u.role}</p>
              </div>
            </div>
            {userProfile.role === 'admin' && u.uid !== userProfile.uid && (
              <Button variant="ghost" className="text-red-500 hover:bg-red-50" onClick={async () => {
                if (confirm('¿Estás seguro de eliminar a este usuario?')) {
                  await deleteDoc(doc(db, 'users', u.uid));
                }
              }}>
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </Card>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary dark:text-white">Invitar Usuario</h3>
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <Input 
                label="Email del Usuario" 
                type="email" 
                placeholder="usuario@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <Select 
                label="Rol"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                options={[
                  { value: 'admin', label: 'Administrador' },
                  { value: 'editor', label: 'Editor' },
                  { value: 'viewer', label: 'Visualizador' }
                ]}
              />
              <Button type="submit" className="w-full py-4" disabled={loading}>
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Enviar Invitación"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ uid: string; email: string; companyId: string; role: 'admin' | 'editor' | 'viewer' } | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string; ownerId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'payments' | 'cashflow' | 'payroll' | 'trash' | 'reports' | 'settings' | 'team'>('dashboard');
  
  useEffect(() => {
    (window as any).setActiveTab = setActiveTab;
  }, []);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingCashflow, setIsAddingCashflow] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [settings, setSettings] = useState<AppSettings>({
    currency: 'USD',
    decimals: 0,
    theme: 'light',
    paymentMethods: ['Mercury', 'Stripe', 'Santander Argentina', 'Belo Argentina'],
    updatedAt: new Date().toISOString(),
    payrollDay: 5,
    defaultSetterCommissionPct: 5,
    defaultCloserCommissionPct: 10
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payroll, setPayroll] = useState<PayrollPayment[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  const generateCommissions = async (amountUSD: number, clientId: string, paymentId: string, date: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    if (client.setterId) {
      const setter = staff.find(s => s.id === client.setterId);
      if (setter) {
        const commissionAmount = (amountUSD * (client.setterCommissionPct || 0)) / 100;
        if (commissionAmount > 0) {
          await addDoc(collection(db, 'commissions'), {
            companyId: userProfile.companyId,
            staffId: setter.id,
            staffName: setter.name,
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            paymentId: paymentId,
            amountUSD: commissionAmount,
            percentage: client.setterCommissionPct || 0,
            staffRole: 'setter',
            status: 'pending',
            date: date,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    if (client.closerId) {
      const closer = staff.find(s => s.id === client.closerId);
      if (closer) {
        const commissionAmount = (amountUSD * (client.closerCommissionPct || 0)) / 100;
        if (commissionAmount > 0) {
          await addDoc(collection(db, 'commissions'), {
            companyId: userProfile.companyId,
            staffId: closer.id,
            staffName: closer.name,
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            paymentId: paymentId,
            amountUSD: commissionAmount,
            percentage: client.closerCommissionPct || 0,
            staffRole: 'closer',
            status: 'pending',
            date: date,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  };

  const formatCurrency = (val: number) => {
    const symbols = {
      'USD': '$',
      'ARS': '$',
      'EUR': '€'
    };
    const symbol = symbols[settings.currency] || '$';
    const formatted = (val || 0).toLocaleString(undefined, {
      minimumFractionDigits: settings.decimals,
      maximumFractionDigits: settings.decimals
    });
    return `${symbol}${formatted}`;
  };

  const activeClients = useMemo(() => clients.filter(c => !c.deletedAt), [clients]);
  const deletedClients = useMemo(() => clients.filter(c => c.deletedAt), [clients]);
  const activePayments = useMemo(() => payments.filter(p => !p.deletedAt), [payments]);
  const activeStaff = useMemo(() => staff.filter(s => !s.deletedAt), [staff]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return activeClients;
    const s = searchTerm.toLowerCase();
    return activeClients.filter(c => 
      c.firstName.toLowerCase().includes(s) || 
      c.lastName.toLowerCase().includes(s) || 
      (c.businessName && c.businessName.toLowerCase().includes(s)) ||
      (c.dni && c.dni.includes(s)) ||
      (c.cuil && c.cuil.includes(s))
    );
  }, [activeClients, searchTerm]);

  const filteredStaff = useMemo(() => {
    if (!searchTerm) return activeStaff;
    const st = searchTerm.toLowerCase();
    return activeStaff.filter(s => 
      s.name.toLowerCase().includes(st) || 
      s.role.toLowerCase().includes(st) || 
      (s.email && s.email.toLowerCase().includes(st))
    );
  }, [activeStaff, searchTerm]);

  const filteredCashflow = useMemo(() => {
    if (!searchTerm) return cashflow;
    const s = searchTerm.toLowerCase();
    return cashflow.filter(c => 
      c.description.toLowerCase().includes(s) || 
      c.category.toLowerCase().includes(s) ||
      c.amountUSD.toString().includes(s)
    );
  }, [cashflow, searchTerm]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return activePayments;
    const s = searchTerm.toLowerCase();
    return activePayments.filter(p => 
      p.clientName?.toLowerCase().includes(s) || 
      p.installmentNumber.toString().includes(s) ||
      p.amountUSD.toString().includes(s)
    );
  }, [activePayments, searchTerm]);

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
    if (!user) {
      setUserProfile(null);
      setCompany(null);
      setProfileLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as any;
          setUserProfile(profileData);
          
          const companyDoc = await getDoc(doc(db, 'companies', profileData.companyId));
          if (companyDoc.exists()) {
            setCompany({ id: companyDoc.id, ...companyDoc.data() } as any);
          }
        } else {
          setUserProfile(null);
          setCompany(null);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user || !userProfile) return;

    const qClients = query(
      collection(db, 'clients'), 
      where('companyId', '==', userProfile.companyId),
      orderBy('createdAt', 'desc')
    );
    const unsubClients = onSnapshot(qClients, (snap) => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'clients'));

    const qPayments = query(
      collection(db, 'payments'), 
      where('companyId', '==', userProfile.companyId),
      orderBy('dueDate', 'asc')
    );
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'payments'));

    const qCashflow = query(
      collection(db, 'cashflow'), 
      where('companyId', '==', userProfile.companyId),
      orderBy('date', 'desc')
    );
    const unsubCashflow = onSnapshot(qCashflow, (snap) => {
      setCashflow(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashflowEntry)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'cashflow'));

    const qStaff = query(
      collection(db, 'staff'), 
      where('companyId', '==', userProfile.companyId),
      orderBy('createdAt', 'desc')
    );
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'staff'));

    const qPayroll = query(
      collection(db, 'payroll'), 
      where('companyId', '==', userProfile.companyId),
      orderBy('date', 'desc')
    );
    const unsubPayroll = onSnapshot(qPayroll, (snap) => {
      setPayroll(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollPayment)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'payroll'));

    const qCommissions = query(
      collection(db, 'commissions'), 
      where('companyId', '==', userProfile.companyId),
      orderBy('date', 'desc')
    );
    const unsubCommissions = onSnapshot(qCommissions, (snap) => {
      setCommissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commission)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'commissions'));

    const unsubSettings = onSnapshot(doc(db, 'settings', userProfile.companyId), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as AppSettings);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `settings/${userProfile.companyId}`));

    return () => {
      unsubClients();
      unsubPayments();
      unsubCashflow();
      unsubStaff();
      unsubPayroll();
      unsubCommissions();
      unsubSettings();
    };
  }, [user, userProfile]);

  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      if (settings.theme === 'dark') {
        isDark = true;
      } else if (settings.theme === 'auto') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        document.body.classList.remove('dark');
      }
    };

    applyTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (settings.theme === 'auto') {
        if (e.matches) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [settings.theme]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success('Sesión iniciada correctamente');
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error('Error al iniciar sesión');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-dark">
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
    return <LandingPage onLogin={handleLogin} />;
  }

  if (!userProfile) {
    return <CompanySetup user={user} onComplete={(profile) => setUserProfile(profile)} />;
  }

  return (
    <SettingsContext.Provider value={settings}>
      <Toaster position="top-right" richColors />
      <div className="h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black text-primary tracking-tighter leading-none">Bold Makers</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-primary transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-white dark:bg-slate-900 flex flex-col border-r border-slate-100 dark:border-slate-800 z-50 transition-all duration-300 relative shrink-0",
        "fixed inset-y-0 left-0 md:static md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
        isSidebarCollapsed ? "md:w-20" : "md:w-72"
      )}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-primary shadow-sm z-30 hidden md:flex"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        <div className={cn("p-8 flex flex-col gap-1", isSidebarCollapsed && "items-center px-4")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <span className="text-xl font-black text-primary tracking-tighter leading-none">Bold Makers</span>
                <span className="text-[10px] font-bold text-muted tracking-widest uppercase">CASHFLOW CONTROL</span>
              </div>
            )}
          </div>
        </div>
        
        <nav className={cn("flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar", isSidebarCollapsed && "px-4")}>
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            icon={<TrendingUp className="w-5 h-5" />}
            label="Dashboard"
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'clients'} 
            onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }}
            icon={<Users className="w-5 h-5" />}
            label="Clientes"
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'payments'} 
            onClick={() => { setActiveTab('payments'); setIsMobileMenuOpen(false); }}
            icon={<CreditCard className="w-5 h-5" />}
            label="Pagos"
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'invoices'} 
            onClick={() => { setActiveTab('invoices'); setIsMobileMenuOpen(false); }}
            icon={<FileText className="w-5 h-5" />}
            label="Facturas"
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'cashflow'} 
            onClick={() => { setActiveTab('cashflow'); setIsMobileMenuOpen(false); }}
            icon={<DollarSign className="w-5 h-5" />}
            label="Transacciones"
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'payroll'} 
            onClick={() => { setActiveTab('payroll'); setIsMobileMenuOpen(false); }}
            icon={<Users className="w-5 h-5" />}
            label="Payroll"
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'trash'} 
            onClick={() => { setActiveTab('trash'); setIsMobileMenuOpen(false); }}
            icon={<Trash2 className="w-5 h-5" />}
            label="Papelera"
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={activeTab === 'reports'} 
            onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
            icon={<Filter className="w-5 h-5" />}
            label="Reportes"
            collapsed={isSidebarCollapsed}
          />
        </nav>

        <div className={cn("p-6 mt-auto", isSidebarCollapsed && "px-4")}>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <button 
              onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors", 
                activeTab === 'settings' ? "text-primary bg-slate-50 dark:bg-slate-800/50 rounded-lg" : "text-muted hover:text-primary",
                isSidebarCollapsed && "justify-center px-0"
              )}
            >
              <Settings className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Ajustes</span>}
            </button>
            <button onClick={handleLogout} className={cn("w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted hover:text-red-600 transition-colors", isSidebarCollapsed && "justify-center px-0")}>
              <LogOut className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
            </button>
            <div className={cn("pt-4 text-center", isSidebarCollapsed ? "px-0" : "px-4")}>
              <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">
                v1.1.0 {import.meta.env.MODE === 'production' ? 'PROD' : 'DEV'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <header className="py-6 bg-slate-50 dark:bg-slate-950 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 md:static">
          <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">
            {activeTab === 'dashboard' && 'Resumen del Negocio'}
            {activeTab === 'clients' && 'Gestión de Clientes'}
            {activeTab === 'payments' && 'Control de Pagos'}
            {activeTab === 'invoices' && 'Control de Facturación'}
            {activeTab === 'cashflow' && 'Transacciones'}
            {activeTab === 'payroll' && 'Gestión de Payroll'}
            {activeTab === 'trash' && 'Papelera de Reciclaje'}
            {activeTab === 'team' && 'Gestión de Equipo'}
          </h1>

          <div className="flex items-center gap-6">
            <div className="flex-1 flex items-center justify-center">
              {/* Contextual search removed from header as per user request */}
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
                  <div className="absolute right-0 mt-4 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black text-primary dark:text-secondary uppercase tracking-widest">Notificaciones</h4>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{notifications.length} Alertas</span>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">No hay alertas pendientes.</p>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            className={cn(
                              "p-3 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50",
                              n.type === 'overdue' 
                                ? "bg-red-50/50 border-red-100 dark:bg-red-900/20 dark:border-red-800" 
                                : "bg-amber-50/50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800"
                            )}
                            onClick={() => {
                              setActiveTab('payments');
                              setShowNotifications(false);
                            }}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              n.type === 'overdue' ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400" : "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400"
                            )}>
                              {n.type === 'overdue' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">{n.message}</p>
                              <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
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
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{user.displayName}</p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 uppercase">{company?.name || 'Socio Director'}</p>
                </div>
                <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-slate-100 dark:border-slate-800" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 bg-slate-50 dark:bg-slate-950">
          {activeTab === 'dashboard' && <DashboardView clients={filteredClients} payments={filteredPayments} cashflow={filteredCashflow} onNavigate={setActiveTab} />}
          {activeTab === 'clients' && <ClientsView clients={filteredClients} isAdding={isAddingClient} setIsAdding={setIsAddingClient} payments={payments} cashflow={cashflow} staff={activeStaff} settings={settings} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onNavigate={setActiveTab} userProfile={userProfile} />}
          {activeTab === 'payments' && <PaymentsView clients={filteredClients} payments={filteredPayments} searchTerm={searchTerm} setSearchTerm={setSearchTerm} generateCommissions={generateCommissions} onNavigate={setActiveTab} userProfile={userProfile} />}
          {activeTab === 'invoices' && <InvoicesView payments={filteredPayments} clients={filteredClients} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
          {activeTab === 'cashflow' && <CashflowView cashflow={filteredCashflow} isAdding={isAddingCashflow} setIsAdding={setIsAddingCashflow} clients={activeClients} payments={activePayments} staff={activeStaff} searchTerm={searchTerm} setSearchTerm={setSearchTerm} generateCommissions={generateCommissions} userProfile={userProfile} />}
          {activeTab === 'payroll' && <PayrollView staff={filteredStaff} payroll={payroll} commissions={commissions} isAddingStaff={isAddingStaff} setIsAddingStaff={setIsAddingStaff} setSettings={setSettings} userProfile={userProfile} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
          {activeTab === 'trash' && <TrashView clients={deletedClients} payments={payments} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
          {activeTab === 'reports' && <ReportsView cashflow={filteredCashflow} clients={filteredClients} payments={filteredPayments} commissions={commissions} staff={filteredStaff} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
          {activeTab === 'settings' && <SettingsView settings={settings} setSettings={setSettings} userProfile={userProfile} company={company} setCompany={setCompany} />}
        </div>
      </main>
    </div>
    </SettingsContext.Provider>
  );
}

function NavItem({ active, onClick, icon, label, collapsed }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; collapsed?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative",
        active 
          ? "bg-primary text-white shadow-lg shadow-primary/20" 
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      <div className={cn(
        "transition-transform duration-300 shrink-0",
        active ? "scale-110" : "group-hover:scale-110"
      )}>
        {icon}
      </div>
      {!collapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">{label}</span>}
    </button>
  );
}

// --- Landing Page ---

function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <TrendingUp className="w-5 h-5 text-tertiary" />
            </div>
            <span className="text-xl font-black text-primary tracking-tighter uppercase italic">
              Bold <span className="text-secondary">Makers</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors">Funciones</a>
            <a href="#mentorship" className="text-xs font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors">Para Mentores</a>
            <Button onClick={onLogin} className="px-6 py-2.5 text-xs">
              <LogIn className="w-4 h-4" />
              Ingresar
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-8 border border-primary/10"
          >
            <span className="w-2 h-2 bg-secondary rounded-full animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Especializado en Mentorías High-Ticket</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-primary tracking-tighter leading-[0.9] mb-8 uppercase italic"
          >
            Domina el <span className="text-secondary">Cashflow</span> <br />
            de tu <span className="text-tertiary bg-primary px-4">Mentoría</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-primary/60 font-medium mb-12 leading-relaxed"
          >
            La plataforma definitiva para mentores que buscan profesionalizar su gestión financiera. Controla pagos, comisiones de equipo y rentabilidad en un solo lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button onClick={onLogin} className="w-full sm:w-auto px-12 py-6 text-lg shadow-2xl shadow-primary/20">
              Empezar Ahora
              <ArrowRight className="w-6 h-6" />
            </Button>
            <a href="#features" className="w-full sm:w-auto px-12 py-6 text-lg font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-all">
              Ver Funciones
            </a>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <p className="text-5xl font-black italic tracking-tighter mb-2">+100</p>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">Mentores Activos</p>
          </div>
          <div>
            <p className="text-5xl font-black italic tracking-tighter mb-2">$2M+</p>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">Procesados en Pagos</p>
          </div>
          <div>
            <p className="text-5xl font-black italic tracking-tighter mb-2">100%</p>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">Control Financiero</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-primary tracking-tighter uppercase italic mb-4">
              Diseñado para la <span className="text-secondary">Escalabilidad</span>
            </h2>
            <p className="text-primary/40 font-bold uppercase tracking-widest text-xs">Todo lo que necesitas para gestionar tu negocio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="w-8 h-8" />,
                title: "Control de Pagos",
                desc: "Seguimiento automático de cuotas, vencimientos y estados de pago de tus alumnos."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Gestión de Equipo",
                desc: "Asigna Setters y Closers. Calcula comisiones automáticamente por cada venta cerrada."
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Cashflow Real",
                desc: "Visualiza ingresos y egresos en tiempo real. Entiende la rentabilidad neta de tu mentoría."
              },
              {
                icon: <ShieldCheck className="w-8 h-8" />,
                title: "Multi-Tenencia",
                desc: "Datos aislados y seguros. Invita a tu equipo con roles específicos de administrador o staff."
              },
              {
                icon: <LayoutDashboard className="w-8 h-8" />,
                title: "Reportes Avanzados",
                desc: "Métricas clave: LTV, Churn, ROI de equipo y proyecciones de facturación."
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Automatización",
                desc: "Generación automática de facturas y recordatorios de pago para tus clientes."
              }
            ].map((feature, i) => (
              <Card key={i} className="p-10 bento-card border-none shadow-xl shadow-primary/5 hover:shadow-primary/10 transition-all group">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black text-primary uppercase italic mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-primary/60 font-medium leading-relaxed">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mentorship Specific Section */}
      <section id="mentorship" className="py-32 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20">
              <Award className="w-4 h-4 text-secondary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Exclusivo para Mentores</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-primary tracking-tighter uppercase italic leading-[0.9]">
              Deja de usar <span className="text-secondary">Excels</span> <br />
              que no escalan
            </h2>
            <p className="text-lg text-primary/60 font-medium leading-relaxed">
              Sabemos que un negocio de mentoría tiene necesidades únicas: pagos recurrentes, comisiones variables para setters y closers, y una gestión de alumnos dinámica. Bold Makers fue construido por mentores, para mentores.
            </p>
            <ul className="space-y-4">
              {[
                "Cálculo automático de comisiones para tu equipo de ventas.",
                "Seguimiento de cuotas pendientes y vencidas.",
                "Gestión de múltiples medios de pago (Stripe, PayPal, Crypto, etc).",
                "Dashboard de rentabilidad neta post-operativa."
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold text-primary/80">
                  <CheckCircle className="w-5 h-5 text-secondary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button onClick={onLogin} className="px-10 py-5 shadow-xl shadow-primary/10">
              Empezar mi Mentoría
            </Button>
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-primary/10 rounded-[40px] blur-3xl -rotate-6"></div>
            <Card className="relative p-8 bento-card border-none shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Ingresos del Mes</p>
                    <p className="text-xl font-black text-primary italic">$42,500</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Rentabilidad</p>
                  <p className="text-xl font-black text-green-600 italic">78%</p>
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary">Alumno Inscrito #{i}</p>
                        <p className="text-[10px] font-medium text-primary/40 italic">Mentoría High-Ticket</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-primary">$1,500</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-primary rounded-[48px] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-primary/40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-tertiary/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
          
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-8 relative z-10">
            ¿Listo para <span className="text-secondary">Escalar</span>?
          </h2>
          <p className="text-white/60 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto relative z-10">
            Únete a los mentores que ya están profesionalizando sus finanzas. Toma el control total de tu negocio hoy mismo.
          </p>
          <Button onClick={onLogin} className="bg-white text-primary hover:bg-slate-100 px-16 py-8 text-xl shadow-2xl shadow-white/10 relative z-10">
            Comenzar Gratis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 dark:border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-tertiary" />
            </div>
            <span className="text-sm font-black text-primary tracking-tighter uppercase italic">
              Bold <span className="text-secondary">Makers</span>
            </span>
          </div>
          <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">© 2026 Bold Makers Studio • Built for Mentors</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] font-black text-primary/40 hover:text-primary uppercase tracking-widest">Privacidad</a>
            <a href="#" className="text-[10px] font-black text-primary/40 hover:text-primary uppercase tracking-widest">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DashboardView({ 
  clients, 
  payments, 
  cashflow, 
  onNavigate
}: { 
  clients: Client[]; 
  payments: Payment[]; 
  cashflow: CashflowEntry[]; 
  onNavigate: (tab: any) => void;
}) {
  const formatCurrency = useCurrency();
  const [segmentation, setSegmentation] = useState<'weekly' | 'monthly' | 'quarterly' | 'semiannually' | 'annually'>('monthly');
  const [chartType, setChartType] = useState<'area' | 'bar'>('bar');
  const [visibleMetrics, setVisibleMetrics] = useState({
    ingresos: true,
    egresos: true,
    profit: true
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

    const pendingInvoices = payments.filter(p => p.status === 'paid' && p.invoiceStatus === 'pending').length;

    return { monthlyIncome, monthlyExpenses, totalRevenue, pendingPayments, profit: monthlyIncome - monthlyExpenses, pendingInvoices };
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

      const acquiredClients = clients.filter(c => {
        const createdDate = parseISO(c.createdAt);
        return (isAfter(createdDate, p.start) || c.createdAt.startsWith(format(p.start, 'yyyy-MM-dd'))) && 
               (isBefore(createdDate, p.end) || c.createdAt.startsWith(format(p.end, 'yyyy-MM-dd')));
      }).length;

      return { name: p.label, ingresos: income, egresos: expenses, profit: income - expenses, clientes: acquiredClients };
    });
  }, [cashflow, clients, segmentation]);

  const pieData = useMemo(() => {
    const total = stats.monthlyIncome || 1; // Avoid division by zero
    const expensesPercent = Math.min(100, Math.max(0, (stats.monthlyExpenses / total) * 100));
    const profitPercent = Math.max(0, 100 - expensesPercent);

    return [
      { name: 'Egresos', value: Math.round(expensesPercent), color: '#ef4444', amount: stats.monthlyExpenses },
      { name: 'Profit', value: Math.round(profitPercent), color: '#E3E35F', amount: stats.profit }
    ];
  }, [stats]);

  const recentTransactions = [...cashflow].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 min-w-[180px] animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-50 dark:border-slate-700 pb-2">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{entry.name}</span>
                </div>
                <span className="text-sm font-black text-primary dark:text-secondary">
                  {entry.name === 'Clientes' ? entry.value : formatCurrency(entry.value)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard 
          label="Balance Total" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={<CreditCard className="w-5 h-5" />}
          trend="+12.5%"
          color="primary"
        />
        <StatCard 
          label="Ingresos (Mensual)" 
          value={formatCurrency(stats.monthlyIncome)} 
          icon={<TrendingUp className="w-5 h-5" />}
          color="secondary"
        />
        <StatCard 
          label="Egresos (Mensual)" 
          value={formatCurrency(stats.monthlyExpenses)} 
          icon={<TrendingDown className="w-5 h-5" />}
          color="red"
        />
        <StatCard 
          label="Profit" 
          value={formatCurrency(stats.profit)} 
          icon={<Star className="w-6 h-6" />}
          color="tertiary"
        />
        <StatCard 
          label="Facturas Pendientes" 
          value={stats.pendingInvoices.toString()} 
          icon={<FileText className="w-5 h-5" />}
          trend={stats.pendingInvoices > 0 ? "Atención" : "Al día"}
          color={stats.pendingInvoices > 0 ? "secondary" : "primary"}
          onClick={() => onNavigate('invoices')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Flujo de Caja</h3>
              <p className="text-xs text-slate-400">Análisis de ingresos, egresos y profit</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                <button 
                  onClick={() => setChartType('area')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    chartType === 'area' 
                      ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-secondary ring-1 ring-slate-200 dark:ring-slate-600" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                  title="Gráfico de Área"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setChartType('bar')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    chartType === 'bar' 
                      ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-secondary ring-1 ring-slate-200 dark:ring-slate-600" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                  title="Gráfico de Barras"
                >
                  <BarChart className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
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
                        ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-secondary ring-1 ring-slate-200 dark:ring-slate-600" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    )}
                  >{s.label}</button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                {[
                  { id: 'ingresos', label: 'INGRESOS', color: 'bg-primary', border: 'border-primary/20', activeBg: 'bg-primary/5' },
                  { id: 'egresos', label: 'EGRESOS', color: 'bg-red-500', border: 'border-red-500/20', activeBg: 'bg-red-500/5' },
                  { id: 'profit', label: 'PROFIT', color: 'bg-tertiary', border: 'border-tertiary/20', activeBg: 'bg-tertiary/5' }
                ].map((m) => (
                  <button 
                    key={m.id}
                    onClick={() => setVisibleMetrics(prev => ({ ...prev, [m.id]: !prev[m.id as keyof typeof prev] }))}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black transition-all border uppercase tracking-widest",
                      visibleMetrics[m.id as keyof typeof visibleMetrics]
                        ? `${m.activeBg} ${m.border} text-slate-700 dark:text-slate-200` 
                        : "bg-transparent border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", visibleMetrics[m.id as keyof typeof visibleMetrics] ? m.color : "bg-slate-200 dark:bg-slate-700")} />
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
                      <stop offset="5%" stopColor="#E3E35F" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#E3E35F" stopOpacity={0}/>
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
                  {visibleMetrics.profit && (
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#E3E35F" 
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
                  {visibleMetrics.profit && (
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#E3E35F" 
                      strokeWidth={4}
                      dot={{ r: 4, fill: '#E3E35F', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 border-none">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-8">Balance de Operaciones</h3>
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
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-50 dark:border-slate-700">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{data.name}</p>
                          <p className="text-sm font-black text-primary dark:text-secondary">{formatCurrency(data.amount)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">${(stats.monthlyIncome / 1000).toFixed(0)}k</span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">INGRESOS</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.value}%</span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{formatCurrency(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Clientes Adquiridos</h3>
              <p className="text-xs text-slate-400">Nuevos clientes por periodo seleccionado</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
              <Users className="w-4 h-4 text-primary dark:text-secondary ml-1" />
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 pr-2 uppercase tracking-widest">
                Total: {chartData.reduce((acc, curr) => acc + (curr.clientes || 0), 0)}
              </span>
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar 
                  dataKey="clientes" 
                  name="Clientes" 
                  fill="#001C35" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.clientes > 0 ? '#001C35' : '#e2e8f0'} 
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 border-none flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-primary/5 dark:bg-secondary/5 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary dark:text-secondary" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
            {chartData.reduce((acc, curr) => acc + (curr.clientes || 0), 0)}
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Nuevos Clientes</p>
          <div className="w-full h-1 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary dark:bg-secondary transition-all duration-1000" 
              style={{ width: `${Math.min(100, (chartData.reduce((acc, curr) => acc + (curr.clientes || 0), 0) / 10) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-4 italic">Meta mensual: 10 clientes</p>
        </Card>
      </div>

      <Card className="p-8 bento-card border-none">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Transacciones Recientes</h3>
          <button 
            onClick={() => onNavigate('cashflow')}
            className="text-xs font-bold text-primary dark:text-secondary hover:underline"
          >
            Ver Historial Completo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-50 dark:border-slate-800">
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cliente / Entidad</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Categoría</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monto</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {recentTransactions.map((entry) => (
                <tr key={entry.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm",
                        entry.type === 'income' ? "bg-primary dark:bg-secondary dark:text-primary" : "bg-red-500"
                      )}>
                        {entry.description.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{entry.description}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">ID: #{entry.id.substring(0, 6)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{entry.category}</td>
                  <td className="py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{format(parseISO(entry.date), 'dd MMM, yyyy')}</td>
                  <td className={cn(
                    "py-4 text-sm font-bold",
                    entry.type === 'income' ? "text-slate-800 dark:text-slate-100" : "text-red-500"
                  )}>
                    {entry.type === 'expense' ? '-' : ''}{formatCurrency(entry.amountUSD)}
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      entry.type === 'income' ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    )}>
                      {entry.type === 'income' ? 'COMPLETADO' : 'EGRESO'}
                    </span>
                  </td>
                  <td className="py-4">
                    <button className="p-2 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
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

function StatCard({ label, value, icon, trend, color, onClick }: { label: string; value: string; icon: React.ReactNode; trend?: string; color: 'secondary' | 'red' | 'tertiary' | 'primary'; onClick?: () => void }) {
  const colors = {
    secondary: 'bg-secondary/10 text-secondary',
    red: 'bg-red-50 text-red-600',
    tertiary: 'bg-tertiary text-slate-900 shadow-lg shadow-tertiary/20',
    primary: 'bg-primary/10 text-primary'
  };
  
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "p-6 border-none transition-all duration-300",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        color === 'tertiary' ? "bg-tertiary shadow-xl shadow-tertiary/20" : ""
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center", 
          color === 'tertiary' ? "bg-white/20 text-slate-900" : colors[color]
        )}>
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-1 rounded-lg",
            color === 'tertiary' ? "text-slate-900 bg-white/20" : "text-green-500 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className={cn(
          "text-xs font-medium",
          color === 'tertiary' ? "text-slate-900/60" : "text-slate-400 dark:text-slate-500"
        )}>{label}</p>
        <h3 className={cn(
          "text-2xl font-bold tracking-tight",
          color === 'tertiary' ? "text-slate-900" : "text-slate-800 dark:text-slate-100"
        )}>{value}</h3>
      </div>
    </Card>
  );
}

// --- Clients View ---

function ClientsView({ 
  clients, 
  isAdding, 
  setIsAdding, 
  payments, 
  cashflow, 
  staff, 
  settings,
  searchTerm,
  setSearchTerm,
  onNavigate,
  userProfile
}: { 
  clients: Client[]; 
  isAdding: boolean; 
  setIsAdding: (v: boolean) => void; 
  payments: Payment[]; 
  cashflow: CashflowEntry[]; 
  staff: StaffMember[]; 
  settings: AppSettings;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onNavigate: (tab: string) => void;
  userProfile: any;
}) {
  const formatCurrency = useCurrency();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingDetails, setViewingDetails] = useState<Client | null>(null);

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const totalUSD = Number(formData.get('totalAmountUSD'));
    const installments = Number(formData.get('installments')) || 1;

    if (isNaN(totalUSD) || totalUSD <= 0) {
      toast.error("El monto total debe ser mayor a 0");
      return;
    }

    const clientData: any = {
      firstName: (formData.get('firstName') as string) || '',
      lastName: (formData.get('lastName') as string) || '',
      dni: (formData.get('dni') as string) || '',
      cuil: (formData.get('cuil') as string) || '',
      cuit: (formData.get('cuit') as string) || '',
      phone: (formData.get('phone') as string) || '',
      email: (formData.get('email') as string) || '',
      businessName: (formData.get('businessName') as string) || '',
      address: (formData.get('address') as string) || '',
      city: (formData.get('city') as string) || '',
      province: (formData.get('province') as string) || '',
      country: (formData.get('country') as string) || '',
      installments,
      totalAmountUSD: totalUSD,
      comments: (formData.get('comments') as string) || '',
      createdAt: formData.get('createdAt') ? new Date(formData.get('createdAt') as string).toISOString() : new Date().toISOString(),
    };

    // Add optional staff fields only if they have values
    const setterId = formData.get('setterId') as string;
    if (setterId) clientData.setterId = setterId;
    
    const closerId = formData.get('closerId') as string;
    if (closerId) clientData.closerId = closerId;

    const setterComm = formData.get('setterCommissionPct');
    const sComm = setterComm ? Number(setterComm) : NaN;
    clientData.setterCommissionPct = isNaN(sComm) ? settings.defaultSetterCommissionPct : sComm;

    const closerComm = formData.get('closerCommissionPct');
    const cComm = closerComm ? Number(closerComm) : NaN;
    clientData.closerCommissionPct = isNaN(cComm) ? settings.defaultCloserCommissionPct : cComm;

    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...clientData,
        companyId: userProfile.companyId
      });
      
      // Generate pending payments
      const installmentAmount = totalUSD / installments;
      const roundedInstallmentAmount = Math.round(installmentAmount);
      
      for (let i = 1; i <= installments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        
        // Adjust the last installment to match totalUSD exactly if rounding caused a difference
        const currentAmount = i === installments 
          ? totalUSD - (roundedInstallmentAmount * (installments - 1))
          : roundedInstallmentAmount;
        
        await addDoc(collection(db, 'payments'), {
          companyId: userProfile.companyId,
          clientId: docRef.id,
          clientName: `${clientData.firstName} ${clientData.lastName}`,
          installmentNumber: i,
          amount: currentAmount,
          currency: 'USD',
          amountUSD: currentAmount,
          dueDate: dueDate.toISOString(),
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      setIsAdding(false);
      toast.success('Cliente agregado correctamente', {
        action: {
          label: 'Confirmar Pago',
          onClick: () => {
            setSearchTerm(`${clientData.firstName} ${clientData.lastName}`);
            onNavigate('payments');
          }
        }
      });
    } catch (err) {
      console.error("Error adding client:", err);
      handleFirestoreError(err, OperationType.CREATE, 'clients');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient?.id) return;
    const formData = new FormData(e.currentTarget);
    
    const updatedData: any = {
      firstName: (formData.get('firstName') as string) || '',
      lastName: (formData.get('lastName') as string) || '',
      dni: (formData.get('dni') as string) || '',
      cuil: (formData.get('cuil') as string) || '',
      cuit: (formData.get('cuit') as string) || '',
      phone: (formData.get('phone') as string) || '',
      email: (formData.get('email') as string) || '',
      businessName: (formData.get('businessName') as string) || '',
      address: (formData.get('address') as string) || '',
      city: (formData.get('city') as string) || '',
      province: (formData.get('province') as string) || '',
      country: (formData.get('country') as string) || '',
      comments: (formData.get('comments') as string) || '',
      createdAt: formData.get('createdAt') ? new Date(formData.get('createdAt') as string).toISOString() : editingClient.createdAt,
    };

    const setterId = formData.get('setterId') as string;
    updatedData.setterId = setterId || null; // Use null to clear if empty
    
    const closerId = formData.get('closerId') as string;
    updatedData.closerId = closerId || null;

    const setterComm = formData.get('setterCommissionPct');
    if (setterComm !== null && setterComm !== '') {
      const sComm = Number(setterComm);
      updatedData.setterCommissionPct = isNaN(sComm) ? settings.defaultSetterCommissionPct : sComm;
    }

    const closerComm = formData.get('closerCommissionPct');
    if (closerComm !== null && closerComm !== '') {
      const cComm = Number(closerComm);
      updatedData.closerCommissionPct = isNaN(cComm) ? settings.defaultCloserCommissionPct : cComm;
    }

    try {
      await updateDoc(doc(db, 'clients', editingClient.id), updatedData);
      setEditingClient(null);
      toast.success('Cliente actualizado correctamente');
    } catch (err) {
      console.error("Error updating client:", err);
      handleFirestoreError(err, OperationType.UPDATE, `clients/${editingClient.id}`);
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
      toast.success('Cliente eliminado correctamente');
    } catch (err) {
      console.error("Error soft deleting client:", err);
      toast.error('Error al eliminar el cliente');
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

      <ContextualSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nombre, email, empresa o DNI/CUIL..." />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {clients.map(client => {
          const clientPayments = payments.filter(p => p.clientId === client.id && !p.deletedAt);
          const paidCount = clientPayments.filter(p => p.status === 'paid').length;
          const totalCount = client.installments;
          const pendingCount = totalCount - paidCount;
          const isFullyPaid = paidCount >= totalCount && totalCount > 0;

          return (
            <Card key={client.id} className="p-8 space-y-6 group relative overflow-hidden">
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
                  <p className="text-xl font-black text-primary tracking-tighter italic">{formatCurrency(client.totalAmountUSD)}</p>
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
                    isOverdue 
                      ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30" 
                      : "bg-secondary/5 border-secondary/10 dark:bg-secondary/10 dark:border-secondary/20"
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
                        {formatCurrency(nextPayment.amountUSD)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {pendingCount > 0 && (
                <Button 
                  variant="secondary" 
                  className="w-full py-3 text-xs font-black uppercase tracking-widest shadow-lg shadow-secondary/10"
                  onClick={() => {
                    setSearchTerm(`${client.firstName} ${client.lastName}`);
                    onNavigate('payments');
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  Confirmar Pago
                </Button>
              )}

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
              {(client.setterId || client.closerId) && (
                <div className="flex flex-wrap gap-2">
                  {client.setterId && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 bg-secondary/5 px-3 py-1.5 rounded-full border border-secondary/10">
                      <span className="text-secondary/70">Setter:</span>
                      <span className="text-primary/80">{staff.find(s => s.id === client.setterId)?.name || 'Desconocido'}</span>
                    </div>
                  )}
                  {client.closerId && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                      <span className="text-primary/70">Closer:</span>
                      <span className="text-primary/80">{staff.find(s => s.id === client.closerId)?.name || 'Desconocido'}</span>
                    </div>
                  )}
                </div>
              )}
              {client.comments && (
                <p className="text-xs font-medium text-primary/50 dark:text-slate-400 italic bg-neutral dark:bg-slate-800/50 p-4 rounded-[16px] border border-primary/5 dark:border-slate-700">
                  "{client.comments}"
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-primary/5 dark:border-slate-800">
              <button 
                onClick={() => setViewingDetails(client)}
                className="text-primary/40 hover:text-secondary transition-colors p-2 rounded-lg hover:bg-secondary/5 dark:hover:bg-secondary/10"
                title="Ver Historial"
              >
                <History className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setEditingClient(client)}
                className="text-primary/40 hover:text-primary dark:hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-primary/5 dark:hover:bg-slate-800"
                title="Editar"
              >
                <Edit className="w-5 h-5" />
              </button>
              <div className="flex items-center">
                {confirmDeleteId === client.id ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 bg-red-50 dark:bg-red-900/20 p-1 rounded-lg">
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
                    className="text-primary/40 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
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
                <Input label="CUIT" name="cuit" />
                <Input label="Teléfono" name="phone" />
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
                  defaultValue="1"
                  options={[
                    { value: '1', label: '1 Pago' },
                    { value: '2', label: '2 Pagos' },
                    { value: '3', label: '3 Pagos' },
                    { value: '6', label: '6 Pagos' }
                  ]} 
                />
                <Select 
                  label="Setter" 
                  name="setterId" 
                  options={[
                    { value: '', label: 'Ninguno' },
                    ...staff.filter(s => s.type === 'setter').map(s => ({ value: s.id!, label: s.name }))
                  ]} 
                />
                <Input label="% Comisión Setter" name="setterCommissionPct" type="number" step="0.1" defaultValue={settings.defaultSetterCommissionPct} />
                <Select 
                  label="Closer" 
                  name="closerId" 
                  options={[
                    { value: '', label: 'Ninguno' },
                    ...staff.filter(s => s.type === 'closer').map(s => ({ value: s.id!, label: s.name }))
                  ]} 
                />
                <Input label="% Comisión Closer" name="closerCommissionPct" type="number" step="0.1" defaultValue={settings.defaultCloserCommissionPct} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest ml-1">Comentarios</label>
                <textarea name="comments" className="w-full px-4 py-3 bg-neutral dark:bg-slate-800 border border-primary/10 dark:border-slate-700 rounded-[16px] focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none h-32 text-sm font-bold text-primary dark:text-slate-200 transition-all" />
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
                <Input label="CUIT" name="cuit" defaultValue={editingClient.cuit} />
                <Input label="Teléfono" name="phone" defaultValue={editingClient.phone} />
                <Input label="Email" name="email" type="email" defaultValue={editingClient.email} />
                <Input label="Razón Social" name="businessName" defaultValue={editingClient.businessName} />
                <Input label="Domicilio" name="address" defaultValue={editingClient.address} />
                <Input label="Localidad" name="city" defaultValue={editingClient.city} />
                <Input label="Provincia" name="province" defaultValue={editingClient.province} />
                <Input label="País" name="country" defaultValue={editingClient.country} />
                <Input label="Fecha de Ingreso" name="createdAt" type="date" defaultValue={format(parseISO(editingClient.createdAt), 'yyyy-MM-dd')} required />
                <Select 
                  label="Setter" 
                  name="setterId" 
                  defaultValue={editingClient.setterId || ''}
                  options={[
                    { value: '', label: 'Ninguno' },
                    ...staff.filter(s => s.type === 'setter').map(s => ({ value: s.id!, label: s.name }))
                  ]} 
                />
                <Input label="% Comisión Setter" name="setterCommissionPct" type="number" step="0.1" defaultValue={editingClient.setterCommissionPct ?? settings.defaultSetterCommissionPct} />
                <Select 
                  label="Closer" 
                  name="closerId" 
                  defaultValue={editingClient.closerId || ''}
                  options={[
                    { value: '', label: 'Ninguno' },
                    ...staff.filter(s => s.type === 'closer').map(s => ({ value: s.id!, label: s.name }))
                  ]} 
                />
                <Input label="% Comisión Closer" name="closerCommissionPct" type="number" step="0.1" defaultValue={editingClient.closerCommissionPct ?? settings.defaultCloserCommissionPct} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest ml-1">Comentarios</label>
                <textarea name="comments" defaultValue={editingClient.comments} className="w-full px-4 py-3 bg-neutral dark:bg-slate-800 border border-primary/10 dark:border-slate-700 rounded-[16px] focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none h-32 text-sm font-bold text-primary dark:text-slate-200 transition-all" />
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
                    {(viewingDetails.setterId || viewingDetails.closerId) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {viewingDetails.setterId && (
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 bg-secondary/5 px-2 py-1 rounded-full border border-secondary/10">
                            <span className="text-secondary/70">Setter:</span>
                            <span className="text-primary/80">{staff.find(s => s.id === viewingDetails.setterId)?.name || 'Desconocido'}</span>
                          </div>
                        )}
                        {viewingDetails.closerId && (
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-1 rounded-full border border-primary/10">
                            <span className="text-primary/70">Closer:</span>
                            <span className="text-primary/80">{staff.find(s => s.id === viewingDetails.closerId)?.name || 'Desconocido'}</span>
                          </div>
                        )}
                      </div>
                    )}
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
                    <div key={payment.id} className="flex items-center justify-between p-5 bg-neutral dark:bg-slate-800/50 rounded-2xl border border-primary/5 dark:border-slate-700">
                      <div className="flex items-center gap-6">
                        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-xs font-black text-primary dark:text-slate-200 shadow-sm border border-primary/5 dark:border-slate-700">
                          #{payment.installmentNumber}
                        </div>
                        <div>
                          <p className="text-sm font-black text-primary dark:text-slate-200 tracking-tight">Vencimiento: {format(parseISO(payment.dueDate), 'dd/MM/yyyy')}</p>
                          <p className="text-[10px] font-bold text-primary/40 dark:text-slate-500 uppercase tracking-widest">Estado: {payment.status === 'paid' ? 'Cobrado' : 'Pendiente'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-primary dark:text-slate-100 italic tracking-tighter">{formatCurrency(payment.amountUSD)}</p>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                          payment.status === 'paid' 
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
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
                    <p className="text-xs font-bold text-primary/30 dark:text-slate-600 italic p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">No hay transacciones registradas para este cliente.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {clientTransactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-2xl border border-primary/5 dark:border-slate-700 shadow-sm">
                          <div className="flex items-center gap-6">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              tx.type === 'income' 
                                ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" 
                                : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                            )}>
                              {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-primary dark:text-slate-200 tracking-tight">{tx.description}</p>
                              <p className="text-[10px] font-bold text-primary/40 dark:text-slate-500 uppercase tracking-widest">{format(parseISO(tx.date), 'dd/MM/yyyy')} • {tx.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-lg font-black italic tracking-tighter",
                              tx.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amountUSD)}
                            </p>
                            <p className="text-[9px] font-bold text-primary/30 dark:text-slate-500 uppercase tracking-widest">{tx.paymentMethod}</p>
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

function PaymentsView({ 
  clients, 
  payments,
  searchTerm,
  setSearchTerm,
  generateCommissions,
  onNavigate,
  userProfile
}: { 
  clients: Client[]; 
  payments: Payment[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  generateCommissions: (amountUSD: number, clientId: string, paymentId: string, date: string) => Promise<void>;
  onNavigate: (tab: string) => void;
  userProfile: any;
}) {
  const settings = React.useContext(SettingsContext);
  const formatCurrency = useCurrency();
  const [isPaying, setIsPaying] = useState<Payment | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('USD');
  const [arsRate, setArsRate] = useState(1200); // Default placeholder rate
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  useEffect(() => {
    if (isPaying) {
      setPaymentCurrency('USD');
    }
  }, [isPaying]);

  useEffect(() => {
    const fetchRate = async () => {
      setIsLoadingRate(true);
      try {
        const response = await fetch('https://dolarapi.com/v1/dolares/oficial');
        const data = await response.json();
        if (data && data.venta) {
          setArsRate(data.venta);
        }
      } catch (err) {
        console.error("Error fetching exchange rate:", err);
      } finally {
        setIsLoadingRate(false);
      }
    };
    fetchRate();
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesStatus;
    });
  }, [payments, filterStatus]);

  const handleProcessPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isPaying) return;

    const formData = new FormData(e.currentTarget);
    const currency = formData.get('currency') as Currency;
    const amount = Number(formData.get('amount'));
    const rate = Number(formData.get('exchangeRate') || 1);
    
    const amountUSD = currency === 'USD' ? Math.round(amount) : amount / rate;
    const paymentMethod = formData.get('paymentMethod') as PaymentMethod;
    const isAutomaticReceipt = ['Mercury', 'Stripe'].includes(paymentMethod);

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
        paymentMethod,
        paymentDate: new Date().toISOString(),
        invoiceStatus: isFullyPaid ? (isAutomaticReceipt ? 'completed' : 'pending') : 'not_required',
        invoiceType: isAutomaticReceipt ? 'receipt' : 'arca'
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
        companyId: userProfile.companyId,
        type: 'income',
        amountUSD,
        category: 'Mentoria',
        date: new Date().toISOString(),
        description: `Pago cuota ${isPaying.installmentNumber} - ${isPaying.clientName}${newPaid < isPaying.amountUSD ? ' (Anticipo)' : ''}`,
        paymentId: isPaying.id,
        clientId: isPaying.clientId,
        createdAt: new Date().toISOString()
      });

      // Generate commissions
      await generateCommissions(amountUSD, isPaying.clientId, isPaying.id!, format(new Date(), 'yyyy-MM-dd'));

      setIsPaying(null);
      toast.success('Pago procesado correctamente', {
        action: {
          label: 'Emitir Factura',
          onClick: () => {
            setSearchTerm(isPaying.clientName);
            onNavigate('invoices');
          }
        }
      });
    } catch (err) {
      console.error("Error processing payment:", err);
      toast.error('Error al procesar el pago');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <ContextualSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar cliente o monto..." />
        <div className="flex flex-col sm:flex-row gap-4">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <option value="all">Todos los estados</option>
            <option value="paid">Pagados</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden border-none md:border md:border-slate-100 dark:md:border-slate-800">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 dark:bg-slate-900/50 border-b border-primary/5 dark:border-slate-700">
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Cuota</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Vencimiento</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Monto (USD)</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Factura</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest text-left">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 dark:divide-slate-800">
              {filteredPayments.map(payment => {
                const now = new Date();
                const dueDate = parseISO(payment.dueDate);
                const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays <= 0 && payment.status === 'pending';
                const isUpcoming = diffDays <= 7 && diffDays > 0 && payment.status === 'pending';

                return (
                  <tr key={payment.id} className="hover:bg-primary/[0.02] dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5 font-black text-primary dark:text-slate-100 tracking-tight">{payment.clientName}</td>
                    <td className="px-8 py-5 text-sm font-bold text-primary/60 dark:text-slate-400 italic">#{payment.installmentNumber}</td>
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
                      {formatCurrency(payment.amountUSD)}
                      {payment.paidAmountUSD && payment.paidAmountUSD < payment.amountUSD && (
                        <p className="text-[10px] text-secondary font-bold not-italic tracking-normal mt-1">
                          Restante: {formatCurrency(payment.amountUSD - payment.paidAmountUSD)}
                        </p>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        payment.status === 'paid' 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                          : (payment.paidAmountUSD && payment.paidAmountUSD > 0 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")
                      )}>
                        {payment.status === 'paid' ? 'Pagado' : 
                         (payment.paidAmountUSD && payment.paidAmountUSD > 0 ? 'Parcial' : 'Pendiente')}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {payment.status === 'paid' && payment.invoiceStatus !== 'not_required' && (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            payment.invoiceStatus === 'completed' ? "bg-green-500" : "bg-amber-500"
                          )} />
                          <span className="text-[10px] font-bold text-primary/60 dark:text-slate-400 uppercase tracking-widest">
                            {payment.invoiceStatus === 'completed' ? 'Emitida' : 'Pendiente'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-left">
                      {payment.status === 'pending' ? (
                        <Button variant="secondary" className="py-2 px-4 text-xs" onClick={() => setIsPaying(payment)}>
                          Registrar Pago
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-start gap-2 text-xs font-bold text-primary/40">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {payment.paymentMethod}
                          </div>
                          {payment.invoiceStatus === 'pending' && (
                            <Button 
                              variant="tertiary" 
                              className="py-1.5 px-3 text-[10px] font-black uppercase tracking-widest shadow-sm"
                              onClick={() => {
                                setSearchTerm(payment.clientName);
                                onNavigate('invoices');
                              }}
                            >
                              <FileText className="w-3 h-3" />
                              Emitir Factura
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-primary/5 dark:divide-slate-800">
          {filteredPayments.map(payment => {
            const now = new Date();
            const dueDate = parseISO(payment.dueDate);
            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = diffDays <= 0 && payment.status === 'pending';
            const isUpcoming = diffDays <= 7 && diffDays > 0 && payment.status === 'pending';

            return (
              <div key={payment.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-primary dark:text-slate-100 tracking-tight">{payment.clientName}</h4>
                    <p className="text-[10px] font-bold text-primary/40 dark:text-slate-500 uppercase tracking-widest mt-0.5">Cuota #{payment.installmentNumber}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    payment.status === 'paid' 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : (payment.paidAmountUSD && payment.paidAmountUSD > 0 
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")
                  )}>
                    {payment.status === 'paid' ? 'Pagado' : 
                     (payment.paidAmountUSD && payment.paidAmountUSD > 0 ? 'Parcial' : 'Pendiente')}
                  </span>
                </div>

                {payment.status === 'paid' && payment.invoiceStatus !== 'not_required' && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg w-fit">
                    <FileText className={cn("w-3 h-3", payment.invoiceStatus === 'completed' ? "text-green-500" : "text-amber-500")} />
                    <span className="text-[9px] font-black text-primary/60 dark:text-slate-400 uppercase tracking-widest">
                      Factura {payment.invoiceStatus === 'completed' ? 'Emitida' : 'Pendiente'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-primary/30 uppercase tracking-widest mb-1">Vencimiento</p>
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-xs font-bold",
                        isOverdue ? "text-red-600" : isUpcoming ? "text-amber-600" : "text-primary/60"
                      )}>
                        {format(parseISO(payment.dueDate), 'dd/MM/yyyy')}
                      </span>
                      {isOverdue && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Vencido</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-primary/30 uppercase tracking-widest mb-1">Monto (USD)</p>
                    <p className="text-sm font-black text-primary dark:text-secondary tracking-tighter italic">
                      {formatCurrency(payment.amountUSD)}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  {payment.status === 'pending' ? (
                    <Button variant="secondary" className="w-full py-2 text-xs" onClick={() => setIsPaying(payment)}>
                      Registrar Pago
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary/40 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Pagado vía {payment.paymentMethod}</span>
                      </div>
                      {payment.invoiceStatus === 'pending' && (
                        <Button 
                          variant="tertiary" 
                          className="w-full py-3 text-xs font-black uppercase tracking-widest"
                          onClick={() => {
                            setSearchTerm(payment.clientName);
                            onNavigate('invoices');
                          }}
                        >
                          <FileText className="w-4 h-4" />
                          Emitir Factura
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
                  Pagado: {formatCurrency(isPaying.paidAmountUSD)} • Restante: {formatCurrency(isPaying.amountUSD - isPaying.paidAmountUSD)}
                </span>
              )}
            </p>
            
            <form onSubmit={handleProcessPayment} className="space-y-6">
              <Select 
                label="Moneda" 
                name="currency" 
                defaultValue="USD"
                onChange={(e) => setPaymentCurrency(e.target.value as Currency)}
                options={[{ value: 'USD', label: 'Dólares (USD)' }, { value: 'ARS', label: 'Pesos (ARS)' }]} 
              />
              <Input 
                key={`${isPaying.id}-${paymentCurrency}`}
                label="Monto a Pagar" 
                name="amount" 
                type="number" 
                step={paymentCurrency === 'USD' ? "1" : "0.01"} 
                defaultValue={paymentCurrency === 'USD' 
                  ? Math.round(isPaying.amountUSD - (isPaying.paidAmountUSD || 0))
                  : Math.round((isPaying.amountUSD - (isPaying.paidAmountUSD || 0)) * arsRate)
                } 
                required 
              />
              
              <div className="p-6 bg-secondary/5 dark:bg-secondary/10 rounded-[24px] border border-secondary/10 dark:border-secondary/20 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Conversor ARS a USD</p>
                  {isLoadingRate ? (
                    <span className="text-[8px] font-bold text-secondary/40 animate-pulse">Actualizando...</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-secondary/60">Fuente: BNA (Oficial)</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const fetchRate = async () => {
                            setIsLoadingRate(true);
                            try {
                              const response = await fetch('https://dolarapi.com/v1/dolares/oficial');
                              const data = await response.json();
                              if (data && data.venta) {
                                setArsRate(data.venta);
                                toast.success('Tipo de cambio actualizado');
                              }
                            } catch (err) {
                              console.error("Error fetching exchange rate:", err);
                              toast.error('Error al actualizar el tipo de cambio');
                            } finally {
                              setIsLoadingRate(false);
                            }
                          };
                          fetchRate();
                        }}
                        className="text-secondary/40 hover:text-secondary transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
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
                  { value: '', label: 'Seleccionar...' },
                  ...settings.paymentMethods.map(m => ({ value: m, label: m }))
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

// --- Invoices View ---

function InvoicesView({ payments, clients, searchTerm, setSearchTerm }: { payments: Payment[]; clients: Client[]; searchTerm: string; setSearchTerm: (v: string) => void }) {
  const settings = React.useContext(SettingsContext);
  const formatCurrency = useCurrency();
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<InvoiceType | 'all'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredInvoices = useMemo(() => {
    return payments
      .filter(p => p.status === 'paid' && p.invoiceStatus !== 'not_required')
      .filter(p => {
        const matchesStatus = filterStatus === 'all' || p.invoiceStatus === filterStatus;
        const matchesType = filterType === 'all' || p.invoiceType === filterType;
        const matchesSearch = !searchTerm || 
          p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesType && matchesSearch;
      })
      .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
  }, [payments, filterStatus, filterType, searchTerm]);

  const handleUpdateInvoice = async (paymentId: string, data: Partial<Payment>) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), data);
      toast.success('Factura actualizada');
    } catch (err) {
      console.error("Error updating invoice:", err);
      toast.error('Error al actualizar factura');
    }
  };

  return (
    <div className="space-y-8">
      <ContextualSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por cliente o número de factura..." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completadas</option>
          </select>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <option value="all">Todos los tipos</option>
            <option value="arca">ARCA (Local)</option>
            <option value="receipt">Receipt (Intl)</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden border-none md:border md:border-slate-100 dark:md:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 dark:bg-slate-900/50 border-b border-primary/5 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest w-10"></th>
                <th className="px-6 py-4 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Pago / Cuenta</th>
                <th className="px-6 py-4 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Monto</th>
                <th className="px-6 py-4 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Cuota</th>
                <th className="px-6 py-4 text-[10px] font-black text-primary/40 dark:text-slate-500 uppercase tracking-widest">Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-slate-400 font-bold">No se encontraron facturas pendientes.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(invoice => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  const isExpanded = expandedRows.has(invoice.id!);
                  return (
                    <React.Fragment key={invoice.id}>
                      <tr className={cn(
                        "hover:bg-primary/[0.02] dark:hover:bg-slate-800/50 transition-colors group cursor-pointer",
                        isExpanded && "bg-primary/[0.03] dark:bg-slate-800/70"
                      )} onClick={() => toggleRow(invoice.id!)}>
                        <td className="px-6 py-4">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-primary/40" /> : <ChevronDown className="w-4 h-4 text-primary/40" />}
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            invoice.invoiceStatus === 'completed' ? "bg-green-500" : "bg-amber-500"
                          )} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-primary dark:text-slate-100 tracking-tight">{invoice.clientName}</span>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Ver datos fiscales</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-primary dark:text-slate-200">
                              {invoice.paymentDate ? format(parseISO(invoice.paymentDate), 'dd/MM/yyyy') : 'S/F'}
                            </span>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{invoice.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-primary dark:text-secondary italic">
                              {invoice.currency} {invoice.amount.toLocaleString(undefined, { minimumFractionDigits: settings?.decimals || 0, maximumFractionDigits: settings?.decimals || 0 })}
                            </span>
                            {invoice.currency !== 'USD' && (
                              <span className="text-[10px] font-bold text-slate-400">
                                Eq: {formatCurrency(invoice.amountUSD)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-primary/40 dark:text-slate-500 italic">#{invoice.installmentNumber}</span>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-primary/30 dark:text-slate-600 uppercase tracking-widest">{invoice.invoiceType === 'arca' ? 'ARCA' : 'Receipt'}</span>
                              {invoice.invoiceStatus === 'completed' ? (
                                <span className="text-xs font-black text-primary dark:text-white">{invoice.invoiceNumber || 'S/N'}</span>
                              ) : (
                                <input 
                                  type="text" 
                                  placeholder="Nº..."
                                  defaultValue={invoice.invoiceNumber}
                                  className="w-24 bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-2 py-1 text-[10px] font-bold text-primary dark:text-white outline-none focus:ring-1 focus:ring-secondary/20"
                                  onBlur={(e) => {
                                    if (e.target.value !== invoice.invoiceNumber) {
                                      handleUpdateInvoice(invoice.id!, { invoiceNumber: e.target.value });
                                    }
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {invoice.invoiceStatus === 'completed' ? (
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    <span className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Emitida</span>
                                  </div>
                                  <button 
                                    onClick={() => handleUpdateInvoice(invoice.id!, { invoiceStatus: 'pending' })}
                                    className="text-[9px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
                                  >
                                    Editar
                                  </button>
                                  {invoice.invoiceUrl && (
                                    <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-secondary hover:scale-110 transition-transform">
                                      <Download className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleUpdateInvoice(invoice.id!, { invoiceStatus: 'completed' })}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/90 text-primary font-black text-[9px] uppercase tracking-widest rounded-lg transition-all shadow-sm shadow-secondary/20 active:scale-95"
                                >
                                  <Check className="w-3 h-3" />
                                  Marcar Emitida
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-primary/[0.01] dark:bg-slate-900/30">
                          <td colSpan={7} className="px-12 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="space-y-3">
                                <p className="text-[10px] font-black text-primary/30 dark:text-slate-600 uppercase tracking-[0.2em]">Datos Personales</p>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">DNI / CUIL / CUIT</p>
                                  <p className="text-sm font-black text-primary dark:text-white">{client?.dni || client?.cuil || client?.cuit || 'No registrado'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Email</p>
                                  <p className="text-sm font-black text-primary dark:text-white">{client?.email || 'No registrado'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Teléfono</p>
                                  <p className="text-sm font-black text-primary dark:text-white">{client?.phone || 'No registrado'}</p>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <p className="text-[10px] font-black text-primary/30 dark:text-slate-600 uppercase tracking-[0.2em]">Domicilio Fiscal</p>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Dirección</p>
                                  <p className="text-sm font-black text-primary dark:text-white">{client?.address || 'No registrado'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Ciudad / Provincia</p>
                                  <p className="text-sm font-black text-primary dark:text-white">{client?.city ? `${client.city}, ${client.province}` : 'No registrado'}</p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-[10px] font-black text-primary/30 dark:text-slate-600 uppercase tracking-[0.2em]">Detalle del Pago</p>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Fecha de Pago</p>
                                  <p className="text-sm font-black text-primary dark:text-white">
                                    {invoice.paymentDate ? format(parseISO(invoice.paymentDate), "EEEE d 'de' MMMM, yyyy", { locale: es }) : 'No registrado'}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Cuenta / Método</p>
                                  <p className="text-sm font-black text-secondary uppercase">{invoice.paymentMethod}</p>
                                </div>
                                {invoice.exchangeRate && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Tipo de Cambio</p>
                                    <p className="text-sm font-black text-primary dark:text-white">1 USD = {invoice.exchangeRate.toLocaleString(undefined, { minimumFractionDigits: settings?.decimals || 0, maximumFractionDigits: settings?.decimals || 0 })} ARS</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// --- Trash View ---

function TrashView({ 
  clients, 
  payments,
  searchTerm,
  setSearchTerm 
}: { 
  clients: Client[]; 
  payments: Payment[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  const formatCurrency = useCurrency();
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
      <ContextualSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar en la papelera..." />
      {clients.length === 0 ? (
        <Card className="p-12 bento-card flex flex-col items-center justify-center text-center space-y-4 bg-white/50 dark:bg-slate-800/50">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <Trash2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">La papelera está vacía</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500">No hay clientes eliminados recientemente.</p>
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
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-[18px] flex items-center justify-center text-slate-400 dark:text-slate-500 font-black text-xl italic">
                      {client.firstName[0]}{client.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-primary text-lg tracking-tight">{client.firstName} {client.lastName}</h4>
                      <p className="text-xs font-bold text-red-500">Eliminado el {format(parseISO(client.deletedAt!), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Días restantes</span>
                    </div>
                    <span className="text-xl font-black text-red-600 dark:text-red-400 italic">{daysRemaining}</span>
                  </div>
                  <div className="w-full bg-red-200 dark:bg-red-900/40 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-red-600 dark:bg-red-500 h-full transition-all duration-1000" 
                      style={{ width: `${(daysRemaining / 30) * 100}%` }}
                    />
                  </div>
                </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-primary/10 dark:border-slate-700 text-primary dark:text-slate-200 hover:bg-primary/5 dark:hover:bg-slate-800"
                      onClick={() => client.id && handleRestore(client.id)}
                    >
                      Restaurar
                    </Button>
                    {confirmPermDeleteId === client.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 bg-red-50 dark:bg-red-900/20 p-1 rounded-lg">
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
                        className="flex-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
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

function ReportsView({ 
  cashflow, 
  clients, 
  payments, 
  commissions, 
  staff,
  searchTerm,
  setSearchTerm 
}: { 
  cashflow: CashflowEntry[]; 
  clients: Client[]; 
  payments: Payment[]; 
  commissions: Commission[]; 
  staff: StaffMember[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  const formatCurrency = useCurrency();

  const commissionsByStaff = useMemo(() => {
    const stats: Record<string, { name: string; pending: number; paid: number; total: number }> = {};
    
    staff.forEach(s => {
      stats[s.id!] = { name: s.name, pending: 0, paid: 0, total: 0 };
    });

    commissions.forEach(c => {
      if (!stats[c.staffId]) {
        stats[c.staffId] = { name: c.staffName, pending: 0, paid: 0, total: 0 };
      }
      if (c.status === 'pending') stats[c.staffId].pending += c.amountUSD;
      else stats[c.staffId].paid += c.amountUSD;
      stats[c.staffId].total += c.amountUSD;
    });

    return Object.values(stats).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  }, [commissions, staff]);
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

  const COLORS = ['#001C35', '#5E98D3', '#E3E35F', '#F27D26', '#10b981', '#ef4444'];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContextualSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar en reportes..." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Ingresos por Categoría</h3>
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
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-50 dark:border-slate-700">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].name}</p>
                          <p className="text-sm font-black text-primary dark:text-secondary italic">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Egresos por Categoría</h3>
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
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-50 dark:border-slate-700">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].name}</p>
                          <p className="text-sm font-black text-primary dark:text-secondary italic">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-8">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-8">Rendimiento por Cliente</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-50 dark:border-slate-700">
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Progreso de Pago</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cobrado</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pendiente</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Contrato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {clientPerformance.map((item, i) => (
                <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-5">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{item.name}</p>
                  </td>
                  <td className="py-5 pr-8">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-1000" 
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-primary dark:text-slate-300 w-8">{item.progress.toFixed(0)}%</span>
                      </div>
                  </td>
                  <td className="py-5 text-sm font-bold text-green-600">{formatCurrency(item.paid)}</td>
                  <td className="py-5 text-sm font-bold text-amber-600">{formatCurrency(item.pending)}</td>
                  <td className="py-5 text-sm font-black text-primary italic">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-8">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-8">Comisiones por Staff (Setter/Closer)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-50 dark:border-slate-700">
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Integrante</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pendiente de Cobro</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cobrado</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Generado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {commissionsByStaff.map((item, i) => (
                <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-5">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{item.name}</p>
                  </td>
                  <td className="py-5 text-sm font-bold text-amber-600">{formatCurrency(item.pending)}</td>
                  <td className="py-5 text-sm font-bold text-green-600">{formatCurrency(item.paid)}</td>
                  <td className="py-5 text-sm font-black text-primary italic">{formatCurrency(item.total)}</td>
                </tr>
              ))}
              {commissionsByStaff.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-slate-400 italic">No hay comisiones registradas aún.</td>
                </tr>
              )}
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
  payments,
  staff,
  searchTerm,
  setSearchTerm,
  generateCommissions,
  userProfile
}: { 
  cashflow: CashflowEntry[]; 
  isAdding: boolean; 
  setIsAdding: (v: boolean) => void;
  clients: Client[];
  payments: Payment[];
  staff: StaffMember[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  generateCommissions: (amountUSD: number, clientId: string, paymentId: string, date: string) => Promise<void>;
  userProfile: any;
}) {
  const settings = React.useContext(SettingsContext);
  const formatCurrency = useCurrency();
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
    const date = formData.get('date') as string;
    
    try {
      const cashflowRef = await addDoc(collection(db, 'cashflow'), {
        companyId: userProfile.companyId,
        type,
        amountUSD,
        category: formData.get('category') as string,
        date,
        description: formData.get('description') as string,
        paymentMethod: formData.get('paymentMethod') as PaymentMethod,
        paymentId: paymentId || null,
        clientId: clientId || null,
        createdAt: new Date().toISOString()
      });

      // If it's an income linked to a payment, update the payment and generate commissions
      if (type === 'income' && paymentId) {
        const payment = payments.find(p => p.id === paymentId);
        const client = clients.find(c => c.id === (clientId || payment?.clientId));
        
        if (payment) {
          const currentPaid = payment.paidAmountUSD || 0;
          const newPaid = currentPaid + amountUSD;
          const isFullyPaid = newPaid >= payment.amountUSD;
          
          await updateDoc(doc(db, 'payments', paymentId), {
            paidAmountUSD: newPaid,
            status: isFullyPaid ? 'paid' : 'pending',
            paymentDate: new Date().toISOString(),
            paymentMethod: formData.get('paymentMethod') as PaymentMethod
          });
        }

        if (client) {
          // Calculate and add commissions
          await generateCommissions(amountUSD, clientId || payment?.clientId || '', paymentId, date);
        }
      }

      setIsAdding(false);
      setSelectedClientId('');
      setSelectedPaymentId('');
      toast.success('Entrada agregada correctamente');
    } catch (err) {
      console.error("Error adding cashflow entry:", err);
      toast.error('Error al agregar la entrada');
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
      toast.success('Entrada actualizada correctamente');
    } catch (err) {
      console.error("Error updating cashflow entry:", err);
      toast.error('Error al actualizar la entrada');
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
      toast.success('Entrada eliminada correctamente');
    } catch (err) {
      console.error("Error deleting entry:", err);
      toast.error('Error al eliminar la entrada');
    }
  };

  return (
    <div className="space-y-8">
      <ContextualSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar transacciones..." />
      <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
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
            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
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
        <Card className="p-8 bento-card bg-white dark:bg-slate-800/50 border-none shadow-xl shadow-primary/5">
          <p className="text-[10px] font-black text-primary/40 dark:text-primary/60 uppercase tracking-[0.2em] mb-2">Total Ingresos</p>
          <p className="text-3xl font-black text-green-600 tracking-tighter italic">{formatCurrency(totals.income)}</p>
        </Card>
        <Card className="p-8 bento-card bg-white dark:bg-slate-800/50 border-none shadow-xl shadow-primary/5">
          <p className="text-[10px] font-black text-primary/40 dark:text-primary/60 uppercase tracking-[0.2em] mb-2">Total Egresos</p>
          <p className="text-3xl font-black text-red-600 tracking-tighter italic">{formatCurrency(totals.expense)}</p>
        </Card>
        <Card className={cn(
          "p-8 bento-card border-none shadow-xl shadow-primary/5",
          balance >= 0 ? "bg-primary text-white" : "bg-red-600 text-white"
        )}>
          <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-2">Saldo Neto</p>
          <p className="text-3xl font-black tracking-tighter italic">{formatCurrency(balance)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCashflow.map(entry => (
          <Card key={entry.id} className="p-4 md:p-6 bento-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 group">
            <div className="flex items-center gap-4 md:gap-6">
              <div className={cn(
                "w-12 h-12 md:w-14 md:h-14 rounded-[18px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0",
                entry.type === 'income' 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
                  : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              )}>
                {entry.type === 'income' ? <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" /> : <ArrowDownRight className="w-5 h-5 md:w-6 md:h-6" />}
              </div>
              <div className="min-w-0">
                <p className="font-black text-primary text-base md:text-lg tracking-tight truncate">{entry.description}</p>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
                  <span className="text-[10px] md:text-xs font-bold text-primary/40 dark:text-slate-500">{format(parseISO(entry.date), 'dd/MM/yyyy')}</span>
                  <span className="hidden sm:block w-1 h-1 bg-primary/10 dark:bg-slate-700 rounded-full"></span>
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary/40 dark:text-slate-500 bg-primary/5 dark:bg-slate-800 px-2 py-0.5 rounded-full">{entry.category}</span>
                  {entry.paymentMethod && (
                    <>
                      <span className="hidden sm:block w-1 h-1 bg-primary/10 dark:bg-slate-700 rounded-full"></span>
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-secondary">{entry.paymentMethod}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-primary/5">
              <p className={cn(
                "text-xl md:text-2xl font-black tracking-tighter italic",
                entry.type === 'income' ? "text-green-600" : "text-red-600"
              )}>
                {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amountUSD)}
              </p>
              <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingEntry(entry)} 
                  className="text-primary/20 dark:text-slate-600 hover:text-primary dark:hover:text-slate-200 transition-colors p-2"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {isDeletingId === entry.id ? (
                  <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 p-1 rounded-lg">
                    <button 
                      onClick={() => entry.id && handleDeleteEntry(entry.id)} 
                      className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 p-1 rounded transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsDeletingId(null)} 
                      className="text-primary/40 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => entry.id && setIsDeletingId(entry.id)} 
                    className="text-primary/20 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2"
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
                          label: `Cuota #${p.installmentNumber} - Restante: ${formatCurrency(p.amountUSD - (p.paidAmountUSD || 0))}` 
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
                  { value: '', label: 'Seleccionar...' },
                  ...settings.paymentMethods.map(m => ({ value: m, label: m }))
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
          <Card className="max-w-md w-full p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary dark:text-secondary uppercase italic tracking-tight">Editar <span className="text-secondary dark:text-tertiary">Entrada</span></h3>
              <button onClick={() => setEditingEntry(null)} className="text-primary/40 hover:text-primary dark:hover:text-slate-200 transition-colors">
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
                  { value: '', label: 'Seleccionar...' },
                  ...settings.paymentMethods.map(m => ({ value: m, label: m }))
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
  commissions,
  isAddingStaff, 
  setIsAddingStaff,
  setSettings,
  userProfile,
  searchTerm,
  setSearchTerm
}: { 
  staff: StaffMember[]; 
  payroll: PayrollPayment[];
  commissions: Commission[];
  isAddingStaff: boolean;
  setIsAddingStaff: (v: boolean) => void;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  userProfile: any;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  const settings = React.useContext(SettingsContext);
  const formatCurrency = useCurrency();
  const [isPayingStaff, setIsPayingStaff] = useState<StaffMember | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isDeletingStaffId, setIsDeletingStaffId] = useState<string | null>(null);

  const nextPaymentDate = useMemo(() => {
    const now = new Date();
    const day = settings?.payrollDay || 5;
    let nextDate = setDate(now, day);
    
    if (isAfter(now, nextDate)) {
      nextDate = addMonths(nextDate, 1);
    }
    
    return nextDate;
  }, [settings?.payrollDay]);

  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await addDoc(collection(db, 'staff'), {
        companyId: userProfile.companyId,
        name: formData.get('name') as string,
        role: formData.get('role') as string,
        type: formData.get('type') as StaffType,
        email: formData.get('email') as string,
        baseSalaryUSD: Number(formData.get('baseSalaryUSD')),
        createdAt: new Date().toISOString()
      });
      setIsAddingStaff(false);
      toast.success('Integrante agregado correctamente');
    } catch (err) {
      console.error("Error adding staff member:", err);
      handleFirestoreError(err, OperationType.CREATE, 'staff');
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStaff?.id) return;
    const formData = new FormData(e.currentTarget);
    
    try {
      await updateDoc(doc(db, 'staff', editingStaff.id), {
        name: formData.get('name') as string,
        role: formData.get('role') as string,
        type: formData.get('type') as StaffType,
        email: formData.get('email') as string,
        baseSalaryUSD: Number(formData.get('baseSalaryUSD')),
      });
      setEditingStaff(null);
      toast.success('Integrante actualizado correctamente');
    } catch (err) {
      console.error("Error updating staff member:", err);
      handleFirestoreError(err, OperationType.UPDATE, `staff/${editingStaff.id}`);
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
        companyId: userProfile.companyId,
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
        companyId: userProfile.companyId,
        type: 'expense',
        amountUSD,
        category: 'Payroll',
        date,
        description: `Pago Payroll ${period} - ${isPayingStaff.name}`,
        paymentMethod,
        createdAt: new Date().toISOString()
      });

      setIsPayingStaff(null);
      toast.success('Pago de payroll procesado correctamente');
    } catch (err) {
      console.error("Error processing payroll:", err);
      handleFirestoreError(err, OperationType.CREATE, 'payroll');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await updateDoc(doc(db, 'staff', id), {
        deletedAt: new Date().toISOString()
      });
      setIsDeletingStaffId(null);
      toast.success('Integrante eliminado correctamente');
    } catch (err) {
      console.error("Error deleting staff member:", err);
      handleFirestoreError(err, OperationType.UPDATE, `staff/${id}`);
    }
  };

  const handlePayCommission = async (commission: Commission) => {
    try {
      // 1. Mark commission as paid
      await updateDoc(doc(db, 'commissions', commission.id!), {
        status: 'paid',
        paidAt: new Date().toISOString()
      });

      // 2. Record as expense in cashflow
      await addDoc(collection(db, 'cashflow'), {
        companyId: userProfile.companyId,
        type: 'expense',
        amountUSD: commission.amountUSD,
        category: 'Comisiones',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: `Comisión: ${commission.staffName} - Cliente: ${commission.clientName}`,
        createdAt: new Date().toISOString()
      });
      toast.success('Comisión pagada correctamente');
    } catch (err) {
      console.error("Error paying commission:", err);
      handleFirestoreError(err, OperationType.UPDATE, `commissions/${commission.id}`);
    }
  };

  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  const paidCommissions = commissions.filter(c => c.status === 'paid');

  const [activeSubTab, setActiveSubTab] = useState<'salaries' | 'commissions' | 'staff'>('salaries');
  const [isEditingPayrollDay, setIsEditingPayrollDay] = useState(false);

  const commissionsByStaff = useMemo(() => {
    const pending = commissions.filter(c => c.status === 'pending');
    const grouped: { [key: string]: { staffName: string; staffId: string; total: number; count: number; commissions: Commission[] } } = {};
    
    pending.forEach(c => {
      if (!grouped[c.staffId]) {
        grouped[c.staffId] = { staffName: c.staffName, staffId: c.staffId, total: 0, count: 0, commissions: [] };
      }
      grouped[c.staffId].total += c.amountUSD;
      grouped[c.staffId].count += 1;
      grouped[c.staffId].commissions.push(c);
    });
    
    return Object.values(grouped);
  }, [commissions]);

  const lastMonthCommissions = useMemo(() => {
    const lastMonth = subMonths(new Date(), 1);
    const startOfLastMonth = startOfMonth(lastMonth);
    const endOfLastMonth = endOfMonth(lastMonth);
    
    const pendingLastMonth = commissions.filter(c => {
      if (c.status !== 'pending') return false;
      const commissionDate = parseISO(c.date);
      return (isAfter(commissionDate, startOfLastMonth) || c.date === format(startOfLastMonth, 'yyyy-MM-dd')) && 
             (isBefore(commissionDate, endOfLastMonth) || c.date === format(endOfLastMonth, 'yyyy-MM-dd'));
    });

    const grouped: { [key: string]: { staffName: string; staffId: string; total: number; count: number; commissions: Commission[] } } = {};
    
    pendingLastMonth.forEach(c => {
      if (!grouped[c.staffId]) {
        grouped[c.staffId] = { staffName: c.staffName, staffId: c.staffId, total: 0, count: 0, commissions: [] };
      }
      grouped[c.staffId].total += c.amountUSD;
      grouped[c.staffId].count += 1;
      grouped[c.staffId].commissions.push(c);
    });
    
    return Object.values(grouped);
  }, [commissions]);

  const currentMonthCommissions = useMemo(() => {
    const startOfCurrentMonth = startOfMonth(new Date());
    const endOfCurrentMonth = endOfMonth(new Date());
    
    const pendingCurrentMonth = commissions.filter(c => {
      if (c.status !== 'pending') return false;
      const commissionDate = parseISO(c.date);
      return (isAfter(commissionDate, startOfCurrentMonth) || c.date === format(startOfCurrentMonth, 'yyyy-MM-dd')) && 
             (isBefore(commissionDate, endOfCurrentMonth) || c.date === format(endOfCurrentMonth, 'yyyy-MM-dd'));
    });

    const grouped: { [key: string]: { staffName: string; staffId: string; total: number; count: number; commissions: Commission[] } } = {};
    
    pendingCurrentMonth.forEach(c => {
      if (!grouped[c.staffId]) {
        grouped[c.staffId] = { staffName: c.staffName, staffId: c.staffId, total: 0, count: 0, commissions: [] };
      }
      grouped[c.staffId].total += c.amountUSD;
      grouped[c.staffId].count += 1;
      grouped[c.staffId].commissions.push(c);
    });
    
    return Object.values(grouped);
  }, [commissions]);

  const handlePayMultipleCommissions = async (staffId: string, staffName: string, commissionsToPay: Commission[], period: 'last' | 'current' | 'all' = 'last') => {
    const totalAmount = commissionsToPay.reduce((acc, c) => acc + c.amountUSD, 0);
    const dateForPeriod = period === 'last' ? subMonths(new Date(), 1) : new Date();
    const periodLabel = period === 'all' ? 'Todas las pendientes' : format(dateForPeriod, 'MMMM yyyy', { locale: es });

    try {
      const batchPromises = commissionsToPay.map(c => 
        updateDoc(doc(db, 'commissions', c.id!), {
          status: 'paid',
          paidAt: new Date().toISOString()
        })
      );
      await Promise.all(batchPromises);

      await addDoc(collection(db, 'cashflow'), {
        companyId: userProfile.companyId,
        type: 'expense',
        amountUSD: totalAmount,
        category: 'Comisiones',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: `Pago Comisiones Acumuladas (${periodLabel}) - ${staffName}`,
        createdAt: new Date().toISOString()
      });
      
      toast.success(`Se pagaron ${commissionsToPay.length} comisiones por un total de ${formatCurrency(totalAmount)}`);
    } catch (err) {
      console.error("Error paying multiple commissions:", err);
      toast.error('Error al procesar el pago de comisiones');
    }
  };

  const handleUpdatePayrollDay = async (day: number) => {
    if (!settings) return;
    try {
      const newSettings = { ...settings, payrollDay: day, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'settings', userProfile.companyId), newSettings);
      setSettings(newSettings);
      setIsEditingPayrollDay(false);
      toast.success(`Día de pago actualizado al ${day}`);
    } catch (err) {
      console.error("Error updating payroll day:", err);
      toast.error('Error al actualizar el día de pago');
    }
  };

  return (
    <>
      <div className="space-y-8">
        <ContextualSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar empleados o comisiones..." />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl md:text-2xl font-black text-primary dark:text-secondary uppercase italic tracking-tight">Gestión de <span className="text-secondary dark:text-tertiary">Payroll</span></h2>
          <div className="flex items-center gap-2 bg-neutral/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-white/50 dark:border-slate-700 overflow-x-auto whitespace-nowrap max-w-full hide-scrollbar">
            <button 
              onClick={() => setActiveSubTab('salaries')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeSubTab === 'salaries' ? "bg-primary text-white shadow-lg" : "text-primary/40 hover:text-primary"
              )}
            >
              Sueldos Fijos
            </button>
            <button 
              onClick={() => setActiveSubTab('commissions')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeSubTab === 'commissions' ? "bg-primary text-white shadow-lg" : "text-primary/40 hover:text-primary"
              )}
            >
              Comisiones
            </button>
            <button 
              onClick={() => setActiveSubTab('staff')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeSubTab === 'staff' ? "bg-primary text-white shadow-lg" : "text-primary/40 hover:text-primary"
              )}
            >
              Integrantes
            </button>
          </div>
        </div>

      {activeSubTab === 'salaries' && (
        <div className="space-y-8">
          {/* Payroll Configuration & Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8 bento-card bg-primary text-white border-none shadow-xl shadow-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Próximos Pagos</p>
              </div>
              <p className="text-3xl font-black tracking-tighter italic mb-1">
                {format(nextPaymentDate, 'dd')} de {format(nextPaymentDate, 'MMMM', { locale: es })}
              </p>
              <p className="text-xs opacity-60 font-medium">Fecha de vencimiento configurada: día {settings?.payrollDay || 5} de cada mes.</p>
            </Card>
            
            <Card className="p-8 bento-card bg-white dark:bg-slate-800/50 border-none shadow-xl shadow-primary/5 col-span-2 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-primary dark:text-secondary uppercase tracking-widest mb-2">Configuración de Vencimiento</h4>
                <p className="text-xs text-slate-400 max-w-md">Los pagos a empleados están programados para el día {settings?.payrollDay || 5}.</p>
              </div>
              <div className="flex items-center gap-3">
                {isEditingPayrollDay ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <input 
                      type="number" 
                      min="1" 
                      max="31" 
                      defaultValue={settings?.payrollDay || 5}
                      className="w-16 px-3 py-2 bg-neutral dark:bg-slate-800 border border-primary/10 dark:border-slate-700 rounded-lg text-sm font-bold text-primary dark:text-white outline-none focus:ring-2 focus:ring-secondary/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdatePayrollDay(parseInt((e.target as HTMLInputElement).value));
                        }
                      }}
                      onBlur={(e) => {
                        handleUpdatePayrollDay(parseInt(e.target.value));
                      }}
                      autoFocus
                    />
                    <button 
                      onClick={() => setIsEditingPayrollDay(false)}
                      className="text-primary/40 hover:text-primary p-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => setIsEditingPayrollDay(true)} className="text-xs py-2">
                    Cambiar Fecha
                  </Button>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black text-primary uppercase italic tracking-tight mb-4">Sueldos <span className="text-secondary">Fijos</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.filter(s => s.baseSalaryUSD > 0).map(s => (
                <Card key={s.id} className="p-6 flex flex-col justify-between group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/5 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary dark:text-secondary font-black">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-primary dark:text-white tracking-tight">{s.name}</p>
                      <p className="text-[10px] font-black text-secondary uppercase tracking-widest">{s.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-primary/5 dark:border-slate-700">
                    <div className="text-left">
                      <p className="text-[10px] font-black text-primary/40 dark:text-primary/60 uppercase tracking-widest">Sueldo Base</p>
                      <p className="text-lg font-black text-primary dark:text-secondary italic">{formatCurrency(s.baseSalaryUSD)}</p>
                    </div>
                    <Button variant="tertiary" className="py-2 px-6 text-xs" onClick={() => setIsPayingStaff(s)}>
                      Pagar Sueldo
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'commissions' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-primary uppercase italic tracking-tight">Comisiones por <span className="text-secondary">Venta</span></h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Total Pendiente:</span>
              <span className="text-sm font-black text-secondary italic">{formatCurrency(pendingCommissions.reduce((acc, c) => acc + c.amountUSD, 0))}</span>
            </div>
          </div>

          {/* Summary Section - New */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-primary/40 uppercase tracking-[0.2em]">Liquidación: Mes Anterior ({format(subMonths(new Date(), 1), 'MMMM', { locale: es })})</h4>
              {lastMonthCommissions.length === 0 ? (
                <Card className="p-6 bg-neutral/50 dark:bg-slate-800/30 border-dashed border-2 border-primary/5 dark:border-slate-700 flex items-center justify-center">
                  <p className="text-xs font-bold text-slate-400 italic">No hay comisiones del mes anterior para liquidar.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {lastMonthCommissions.map(group => (
                    <Card key={group.staffId} className="p-6 bg-primary text-white border-none shadow-xl shadow-primary/20 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-secondary" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg">
                            {group.count} Ventas
                          </span>
                        </div>
                        <p className="text-sm font-black tracking-tight mb-1">{group.staffName}</p>
                        <p className="text-2xl font-black italic text-secondary">{formatCurrency(group.total)}</p>
                      </div>
                      <Button 
                        variant="secondary" 
                        className="mt-6 w-full py-3 text-xs font-black uppercase tracking-widest"
                        onClick={() => handlePayMultipleCommissions(group.staffId, group.staffName, group.commissions, 'last')}
                      >
                        Liquidar Mes Anterior
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-primary/40 uppercase tracking-[0.2em]">Acumulado: Mes Actual ({format(new Date(), 'MMMM', { locale: es })})</h4>
              {currentMonthCommissions.length === 0 ? (
                <Card className="p-6 bg-neutral/50 dark:bg-slate-800/30 border-dashed border-2 border-primary/5 dark:border-slate-700 flex items-center justify-center">
                  <p className="text-xs font-bold text-slate-400 italic">No hay comisiones acumuladas en este mes aún.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {currentMonthCommissions.map(group => (
                    <Card key={group.staffId} className="p-6 bg-white dark:bg-slate-800/50 border border-primary/10 dark:border-slate-700 shadow-xl shadow-primary/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-primary/5 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-primary dark:text-secondary" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest bg-primary/5 dark:bg-slate-700 px-2 py-1 rounded-lg text-primary dark:text-secondary">
                            {group.count} Ventas
                          </span>
                        </div>
                        <p className="text-sm font-black tracking-tight mb-1 text-primary dark:text-white">{group.staffName}</p>
                        <p className="text-2xl font-black italic text-secondary">{formatCurrency(group.total)}</p>
                      </div>
                      <Button 
                        variant="tertiary" 
                        className="mt-6 w-full py-3 text-xs font-black uppercase tracking-widest"
                        onClick={() => handlePayMultipleCommissions(group.staffId, group.staffName, group.commissions, 'current')}
                      >
                        Liquidar Mes Actual (Adelanto)
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* General Summary Section - Added to satisfy user request for current month too */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-primary/40 uppercase tracking-[0.2em]">Total Pendiente por Integrante (Histórico)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {commissionsByStaff.map(group => (
                <Card key={group.staffId} className="p-4 bg-white dark:bg-slate-800/50 border border-primary/5 dark:border-slate-700 shadow-sm">
                  <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-1">{group.staffName}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-black text-primary dark:text-secondary italic">{formatCurrency(group.total)}</p>
                    <p className="text-[9px] font-bold text-secondary uppercase">{group.count} pendientes</p>
                  </div>
                </Card>
              ))}
              {commissionsByStaff.length === 0 && (
                <p className="text-xs font-bold text-slate-400 italic col-span-full">No hay comisiones pendientes en total.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-primary/40 uppercase tracking-[0.2em]">Detalle de Comisiones Pendientes</h4>
            {pendingCommissions.length === 0 ? (
              <Card className="p-12 text-center border-slate-100 dark:border-slate-700">
                <Star className="w-12 h-12 text-primary/10 dark:text-primary/20 mx-auto mb-4" />
                <p className="text-primary/40 dark:text-primary/60 font-medium italic">No hay comisiones individuales pendientes.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingCommissions.map(c => (
                  <Card key={c.id} className="p-5 border-none shadow-xl shadow-primary/5 space-y-4 group bg-white dark:bg-slate-800/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-primary dark:text-white tracking-tight">{c.staffName}</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                          c.staffRole === 'setter' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : 
                          c.staffRole === 'closer' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                          "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
                        )}>
                          {c.staffRole || 'N/A'}
                        </span>
                      </div>
                      <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Comisión {c.percentage}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary dark:text-secondary italic">{formatCurrency(c.amountUSD)}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-primary/5 dark:bg-slate-800/50 rounded-xl border border-primary/5 dark:border-slate-700">
                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest mb-1">Cliente / Venta</p>
                    <p className="text-xs font-bold text-primary dark:text-slate-300 truncate">{c.clientName}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[9px] font-bold text-primary/30 dark:text-primary/50">{format(parseISO(c.date), 'dd/MM/yyyy')}</span>
                    <Button variant="tertiary" className="py-1.5 px-4 text-[10px]" onClick={() => handlePayCommission(c)}>
                      Pagar Comisión
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

          {/* Paid Commissions History */}
          {paidCommissions.length > 0 && (
            <div className="space-y-4 pt-4">
              <h4 className="text-xs font-black text-primary/40 uppercase tracking-[0.2em]">Historial Reciente de Comisiones</h4>
              <div className="grid grid-cols-1 gap-2">
                {paidCommissions.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/30 rounded-xl border border-primary/5 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-primary dark:text-slate-200">{c.staffName}</p>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest",
                            c.staffRole === 'setter' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : 
                            c.staffRole === 'closer' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                            "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
                          )}>
                            {c.staffRole || 'N/A'}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-primary/40 dark:text-slate-500 uppercase">{c.clientName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary dark:text-slate-200 italic">{formatCurrency(c.amountUSD)}</p>
                      <p className="text-[8px] font-bold text-primary/30 dark:text-slate-600">Pagado el {format(parseISO(c.paidAt!), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-primary uppercase italic tracking-tight">Integrantes de la <span className="text-secondary">Consultora</span></h3>
            <Button onClick={() => setIsAddingStaff(true)} className="text-xs py-2">
              <Plus className="w-4 h-4" />
              Nuevo Integrante
            </Button>
          </div>
          
          {staff.length === 0 ? (
            <Card className="p-12 text-center border-slate-100 dark:border-slate-700">
              <Users className="w-12 h-12 text-primary/10 dark:text-primary/20 mx-auto mb-4" />
              <p className="text-primary/40 dark:text-primary/60 font-medium italic">No hay integrantes registrados.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {staff.map(s => (
                <Card key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/5 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary dark:text-secondary font-black shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-primary dark:text-white tracking-tight text-sm truncate">{s.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[9px] font-black text-secondary uppercase tracking-widest">{s.role}</p>
                        <span className="text-[7px] font-bold text-primary/30 dark:text-primary/50 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full">
                          {s.type === 'setter' ? 'Setter' : s.type === 'closer' ? 'Closer' : 'Staff'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-primary/5">
                    <div className="text-left sm:text-right">
                      <p className="text-[8px] font-black text-primary/40 dark:text-primary/60 uppercase tracking-widest">Sueldo Base</p>
                      <p className="text-sm font-black text-primary dark:text-secondary italic">{formatCurrency(s.baseSalaryUSD)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setEditingStaff(s)}
                        className="text-primary/10 dark:text-primary/30 hover:text-secondary p-2 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {isDeletingStaffId === s.id ? (
                        <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 p-1 rounded-lg">
                          <button onClick={() => s.id && handleDeleteStaff(s.id)} className="text-red-600 dark:text-red-400 p-1"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setIsDeletingStaffId(null)} className="text-primary/40 dark:text-slate-500 p-1"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => s.id && setIsDeletingStaffId(s.id)}
                          className="text-primary/10 dark:text-primary/30 hover:text-red-600 dark:hover:text-red-400 p-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'salaries' && (
        <div className="space-y-4 pt-8 border-t border-primary/5 dark:border-slate-700">
          <h3 className="text-lg font-black text-primary dark:text-secondary uppercase italic tracking-tight mb-4">Historial de <span className="text-secondary dark:text-tertiary">Pagos de Sueldo</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payroll.slice(0, 12).map(p => (
              <Card key={p.id} className="p-4 border-none shadow-sm bg-white dark:bg-slate-800/30">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-primary dark:text-secondary tracking-tight">{p.staffName}</p>
                    <p className="text-[9px] font-bold text-primary/40 dark:text-primary/60 uppercase">{p.period}</p>
                  </div>
                  <p className="text-sm font-black text-red-600 italic">-{formatCurrency(p.amountUSD)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[8px] font-black text-secondary dark:text-primary uppercase tracking-widest">{p.paymentMethod}</span>
                  <span className="text-[8px] font-bold text-primary/30 dark:text-primary/50">{format(parseISO(p.date), 'dd/MM/yyyy')}</span>
                </div>
              </Card>
            ))}
            {payroll.length === 0 && (
              <p className="text-xs text-primary/30 dark:text-primary/50 italic text-center py-8 col-span-full">No hay pagos registrados.</p>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Modals */}
      {isAddingStaff && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary dark:text-secondary uppercase italic tracking-tight">Nuevo <span className="text-secondary dark:text-tertiary">Integrante</span></h3>
              <button onClick={() => setIsAddingStaff(false)} className="text-primary/40 hover:text-primary dark:hover:text-slate-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-6">
              <Input label="Nombre Completo" name="name" placeholder="Ej: Juan Perez" required />
              <Input label="Rol / Puesto" name="role" placeholder="Ej: Consultor Senior" required />
              <Select 
                label="Tipo de Integrante" 
                name="type" 
                options={[
                  { value: 'other', label: 'Staff General' },
                  { value: 'setter', label: 'Setter' },
                  { value: 'closer', label: 'Closer' }
                ]} 
              />
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
          <Card className="max-w-md w-full p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary dark:text-secondary uppercase italic tracking-tight">Registrar <span className="text-secondary dark:text-tertiary">Pago</span></h3>
              <button onClick={() => setIsPayingStaff(null)} className="text-primary/40 hover:text-primary dark:hover:text-slate-200 transition-colors">
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
                  { value: '', label: 'Seleccionar...' },
                  ...settings.paymentMethods.map(m => ({ value: m, label: m }))
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

      {editingStaff && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-primary dark:text-secondary uppercase italic tracking-tight">Editar <span className="text-secondary dark:text-tertiary">Integrante</span></h3>
              <button onClick={() => setEditingStaff(null)} className="text-primary/40 hover:text-primary dark:hover:text-slate-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateStaff} className="space-y-6">
              <Input label="Nombre Completo" name="name" defaultValue={editingStaff.name} required />
              <Input label="Rol / Puesto" name="role" defaultValue={editingStaff.role} required />
              <Select 
                label="Tipo de Integrante" 
                name="type" 
                defaultValue={editingStaff.type || 'other'}
                options={[
                  { value: 'other', label: 'Staff General' },
                  { value: 'setter', label: 'Setter' },
                  { value: 'closer', label: 'Closer' }
                ]} 
              />
              <Input label="Email" name="email" type="email" defaultValue={editingStaff.email} />
              <Input label="Sueldo Base (USD)" name="baseSalaryUSD" type="number" step="0.01" defaultValue={editingStaff.baseSalaryUSD} required />
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="secondary" type="button" onClick={() => setEditingStaff(null)} className="px-8">Cancelar</Button>
                <Button type="submit" className="px-10">Actualizar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

function SettingsView({ 
  settings, 
  setSettings, 
  userProfile, 
  company, 
  setCompany 
}: { 
  settings: AppSettings; 
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; 
  userProfile: any;
  company: any;
  setCompany: any;
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [localCompany, setLocalCompany] = useState(company);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Team management states
  const [users, setUsers] = useState<any[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');

  // Sync with external changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    setLocalCompany(company);
  }, [company]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('companyId', '==', userProfile.companyId));
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [userProfile.companyId]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Save App Settings
      await setDoc(doc(db, 'settings', userProfile.companyId), {
        ...localSettings,
        updatedAt: new Date().toISOString()
      });
      setSettings(localSettings);

      // Save Company Data
      if (localCompany) {
        await updateDoc(doc(db, 'companies', userProfile.companyId), {
          name: localCompany.name,
          updatedAt: new Date().toISOString()
        });
        setCompany(localCompany);
      }

      toast.success('Ajustes guardados correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar los ajustes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    
    try {
      // In a real app, this would be a backend call to invite.
      // For now, we'll just show a message.
      toast.info("Funcionalidad de invitación: En un entorno real, esto enviaría un correo. Por ahora, el usuario debe registrarse con este email para unirse.");
      setIsAddingUser(false);
      setNewEmail('');
    } catch (err) {
      console.error("Error adding user:", err);
    }
  };

  const updateField = (field: keyof AppSettings, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    
    // For theme, apply immediately for preview
    if (field === 'theme') {
      setSettings(prev => ({ ...prev, theme: value }));
    }
  };

  const updateCompanyField = (field: string, value: any) => {
    setLocalCompany((prev: any) => ({ ...prev, [field]: value }));
  };

  const addPaymentMethod = () => {
    if (!newPaymentMethod.trim()) return;
    setLocalSettings(prev => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, newPaymentMethod.trim()]
    }));
    setNewPaymentMethod('');
  };

  const removePaymentMethod = (method: string) => {
    setLocalSettings(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter(m => m !== method)
    }));
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings) || 
                     JSON.stringify(localCompany) !== JSON.stringify(company);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-primary dark:text-secondary tracking-tighter italic">Ajustes del Sistema</h2>
          <p className="text-slate-400 text-sm">Configura las preferencias de tu espacio de trabajo.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={saveSettings} 
            disabled={!hasChanges || isSaving}
            className={cn(
              "w-full sm:w-auto px-8 py-3 shadow-xl transition-all",
              hasChanges ? "shadow-primary/20 scale-105" : "opacity-50 grayscale"
            )}
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Company Settings */}
        <Card className="p-8 bento-card border-none space-y-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">Datos de la Empresa</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la Empresa / Mentoría</label>
              <input 
                type="text" 
                value={localCompany?.name || ''}
                onChange={(e) => updateCompanyField('name', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID de Empresa (No editable)</label>
              <input 
                type="text" 
                value={userProfile.companyId}
                disabled
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-400 shadow-sm focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Team Management Section */}
        <Card className="p-8 bento-card border-none space-y-6 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white">Gestión de Equipo</h3>
            </div>
            {userProfile.role === 'admin' && (
              <Button variant="ghost" onClick={() => setIsAddingUser(true)} className="text-xs font-black uppercase tracking-widest text-primary">
                <Plus className="w-4 h-4" />
                Invitar Integrante
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <div key={u.uid} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary dark:text-white truncate max-w-[120px]">{u.email}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-secondary">{u.role}</p>
                  </div>
                </div>
                {userProfile.role === 'admin' && u.uid !== userProfile.uid && (
                  <button 
                    onClick={async () => {
                      if (confirm('¿Estás seguro de eliminar a este integrante?')) {
                        await deleteDoc(doc(db, 'users', u.uid));
                      }
                    }}
                    className="text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* General Settings */}
        <Card className="p-8 bento-card border-none space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">Moneda y Formato</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moneda Principal</label>
              <div className="flex gap-2">
                {(['USD', 'ARS', 'EUR'] as Currency[]).map(c => (
                  <button
                    key={c}
                    onClick={() => updateField('currency', c)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all border",
                      localSettings.currency === c 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                        : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decimales a mostrar</label>
              <div className="flex gap-2">
                {[0, 1, 2].map(d => (
                  <button
                    key={d}
                    onClick={() => updateField('decimals', d)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all border",
                      localSettings.decimals === d 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                        : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                    )}
                  >
                    {d} {d === 1 ? 'Decimal' : 'Decimales'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Día de Pago (Payroll)</label>
              <input 
                type="number" 
                min="1" 
                max="31"
                value={localSettings.payrollDay || 5}
                onChange={(e) => updateField('payrollDay', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
              <p className="text-[10px] text-slate-400 italic">Día del mes en que se vencen los pagos a empleados.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">% Comisión Setter (Default)</label>
              <input 
                type="number" 
                step="0.1"
                value={localSettings.defaultSetterCommissionPct}
                onChange={(e) => updateField('defaultSetterCommissionPct', parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">% Comisión Closer (Default)</label>
              <input 
                type="number" 
                step="0.1"
                value={localSettings.defaultCloserCommissionPct}
                onChange={(e) => updateField('defaultCloserCommissionPct', parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-8 bento-card border-none space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
              <Sun className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">Apariencia</h3>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tema Visual</label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => updateField('theme', 'light')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold transition-all border",
                    localSettings.theme === 'light' 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                      : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                  )}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => updateField('theme', 'dark')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold transition-all border",
                    localSettings.theme === 'dark' 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                      : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                  )}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
              </div>
              <button
                onClick={() => updateField('theme', 'auto')}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold transition-all border",
                  localSettings.theme === 'auto' 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                    : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                )}
              >
                <Clock className="w-4 h-4" />
                Automático (Día/Noche)
              </button>
            </div>
          </div>
        </Card>

        {/* Payment Methods */}
        <Card className="p-8 bento-card border-none space-y-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center text-green-600">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">Medios de Pago / Cuentas</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  placeholder="Ej: Banco USA, Stripe..."
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                />
                <button 
                  onClick={addPaymentMethod}
                  className="px-6 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  Agregar
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Estos medios aparecerán como opciones al registrar transacciones y pagos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {localSettings.paymentMethods.map(m => (
                <div 
                  key={m} 
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-red-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-red-600">{m}</span>
                  <button 
                    onClick={() => removePaymentMethod(m)}
                    className="text-slate-300 dark:text-slate-500 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary dark:text-white">Invitar Integrante</h3>
              <button onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email del Usuario</label>
                <input 
                  type="email" 
                  placeholder="usuario@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-primary dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="admin">Administrador</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <Button type="submit" className="w-full py-4">
                Enviar Invitación
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
