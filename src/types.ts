export type Currency = 'USD' | 'ARS';
export type PaymentStatus = 'paid' | 'pending';
export type PaymentMethod = 'Mercury' | 'Stripe' | 'Santander Argentina' | 'Belo Argentina';
export type CashflowType = 'income' | 'expense';

export interface Client {
  id?: string;
  firstName: string;
  lastName: string;
  dni?: string;
  cuil?: string;
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

export interface StaffMember {
  id?: string;
  name: string;
  role: string;
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
