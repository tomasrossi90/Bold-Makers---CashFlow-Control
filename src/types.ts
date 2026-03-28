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
}

export interface Payment {
  id?: string;
  clientId: string;
  clientName?: string; // Denormalized for display
  installmentNumber: number;
  amount: number;
  currency: Currency;
  amountUSD: number;
  exchangeRate?: number;
  paymentDate?: string;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
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
  createdAt: string;
}
