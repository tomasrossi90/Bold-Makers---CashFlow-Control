export type Currency = 'USD' | 'ARS' | 'EUR';
export type PaymentStatus = 'paid' | 'pending';
export type PaymentMethod = string;
export type CashflowType = 'income' | 'expense';
export type InvoiceStatus = 'pending' | 'completed' | 'not_required';
export type InvoiceType = 'arca' | 'receipt';

export interface AppSettings {
  id?: string;
  currency: Currency;
  decimals: number;
  theme: 'light' | 'dark' | 'auto';
  paymentMethods: string[];
  updatedAt: string;
  payrollDay?: number;
  defaultSetterCommissionPct: number;
  defaultCloserCommissionPct: number;
}

export interface Client {
  id?: string;
  firstName: string;
  lastName: string;
  dni?: string;
  cuil?: string;
  cuit?: string;
  phone?: string;
  email?: string;
  businessName?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  installments: number;
  totalAmountUSD: number;
  comments?: string;
  createdAt: string;
  deletedAt?: string;
  setterId?: string;
  closerId?: string;
  setterCommissionPct?: number;
  closerCommissionPct?: number;
}

export interface Payment {
  id?: string;
  clientId: string;
  clientName?: string; // Denormalized for display
  installmentNumber: number;
  amount: number;
  currency: Currency;
  amountUSD: number;
  paidAmountUSD?: number; // New: for partial payments/advances
  exchangeRate?: number;
  paymentDate?: string;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  invoiceStatus?: InvoiceStatus;
  invoiceType?: InvoiceType;
  invoiceUrl?: string;
  invoiceNumber?: string;
  isUpfront?: boolean;
  createdAt: string;
  deletedAt?: string;
}

export interface CashflowEntry {
  id?: string;
  type: CashflowType;
  amountUSD: number;
  category: string;
  date: string;
  description: string;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  clientId?: string; // New: link to client
  createdAt: string;
}

export type StaffType = 'setter' | 'closer' | 'other';

export interface StaffMember {
  id?: string;
  name: string;
  role: string;
  type: StaffType;
  email?: string;
  baseSalaryUSD: number;
  createdAt: string;
  deletedAt?: string;
}

export interface PayrollPayment {
  id?: string;
  staffId: string;
  staffName: string;
  amountUSD: number;
  date: string;
  period: string; // e.g., "March 2026"
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface Commission {
  id?: string;
  staffId: string;
  staffName: string;
  clientId: string;
  clientName: string;
  paymentId: string;
  amountUSD: number;
  percentage: number;
  staffRole: 'setter' | 'closer';
  status: 'pending' | 'paid';
  date: string;
  paidAt?: string;
  createdAt: string;
}

export interface Invitation {
  id?: string;
  email: string;
  companyId: string;
  role: 'admin' | 'editor' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}
