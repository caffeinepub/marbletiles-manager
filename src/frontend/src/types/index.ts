/**
 * Domain types for Radha Rani Marble House.
 * These mirror the Motoko backend types. Defined here because bindgen
 * hasn't been run yet (backend canister interface is pending compilation).
 */

import type { Principal } from "@icp-sdk/core/principal";

export interface GSTRate {
  name: string;
  percentage: bigint;
}

export type ProductCategory =
  | { marble: null }
  | { tile: null }
  | { granite: null }
  | { travertine: null }
  | { onyx: null }
  | { other: null }
  | string;

export interface Product {
  id: bigint;
  name: string;
  category: ProductCategory;
  basePrice: bigint;
  currentStock: bigint;
  minStockAlert: bigint;
  qrCode: string;
  createdAt: bigint;
}

export interface Customer {
  id: bigint;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalPurchases: bigint;
  outstandingDue: bigint;
  createdAt: bigint;
}

export interface SaleItem {
  productId: bigint;
  quantity: bigint;
  unitPrice: bigint;
  gstRate: GSTRate;
  gstAmount: bigint;
}

export type SaleStatus =
  | { paid: null }
  | { partial: null }
  | { unpaid: null }
  | string;

// Convenience string constants matching backend variant strings
export const SaleStatus = {
  paid: "paid" as string,
  partial: "partial" as string,
  unpaid: "unpaid" as string,
};

export interface Sale {
  id: bigint;
  customerId: bigint;
  invoiceNumber: string;
  items: SaleItem[];
  subtotal: bigint;
  totalGST: bigint;
  transportCharge: bigint;
  discount: bigint;
  grandTotal: bigint;
  paymentStatus: string;
  createdAt: bigint;
  createdBy: Principal;
}

export type PaymentMode =
  | { cash: null }
  | { upi: null }
  | { cheque: null }
  | { bank: null }
  | string;

// Convenience constants
export const PaymentMode = {
  cash: "cash" as string,
  upi: "upi" as string,
  cheque: "cheque" as string,
  bank: "bank" as string,
};

export interface Payment {
  id: bigint;
  saleId: bigint;
  amount: bigint;
  mode: string;
  date: bigint;
  notes: string;
}

export type ExpenseCategory =
  | { labour: null }
  | { electricity: null }
  | { transport: null }
  | { rent: null }
  | { other: null }
  | string;

// Convenience constants
export const ExpenseCategory = {
  labour: "labour" as string,
  electricity: "electricity" as string,
  transport: "transport" as string,
  rent: "rent" as string,
  other: "other" as string,
};

export interface Expense {
  id: bigint;
  category: string;
  description: string;
  amount: bigint;
  date: bigint;
  recordedBy: Principal;
}

export interface UserProfile {
  name: string;
  role: string;
  username: string;
}

export interface CompanySettings {
  name: string;
  gstin: string;
  phone: string;
  address: string;
  city: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
}

/** Typed actor interface matching backend canister methods */
export interface RRMHActor {
  getAllGSTRates(): Promise<[string, GSTRate][]>;
  addGSTRate(rate: GSTRate): Promise<void>;
  deleteGSTRate(name: string): Promise<void>;

  getAllProducts(): Promise<Product[]>;
  addProduct(product: Product): Promise<bigint>;
  updateProduct(name: string, product: Product): Promise<void>;
  deleteProduct(name: string): Promise<void>;
  getProduct(name: string): Promise<Product | null>;

  getAllProductCategories(): Promise<[string, ProductCategory][]>;
  addProductCategory(name: string): Promise<void>;
  deleteProductCategory(name: string): Promise<void>;

  getAllCustomers(): Promise<Customer[]>;
  addCustomer(customer: Customer): Promise<bigint>;
  updateCustomer(customerId: bigint, customer: Customer): Promise<void>;
  deleteCustomer(customerId: bigint): Promise<void>;
  getCustomer(id: bigint): Promise<Customer>;

  getAllSales(): Promise<Sale[]>;
  addSale(sale: Sale): Promise<bigint>;
  updateSale(id: bigint, sale: Sale): Promise<void>;
  getSale(id: bigint): Promise<Sale | null>;
  deleteSale(id: bigint): Promise<void>;

  getAllPayments(): Promise<Payment[]>;
  addPayment(payment: Payment): Promise<bigint>;
  updatePayment(paymentId: bigint, payment: Payment): Promise<void>;
  getPayment(id: bigint): Promise<Payment | null>;
  deletePayment(id: bigint): Promise<void>;

  getAllExpenses(): Promise<Expense[]>;
  addExpense(expense: Expense): Promise<void>;
  updateExpense(id: bigint, expense: Expense): Promise<void>;
  deleteExpense(id: bigint): Promise<void>;

  getCompanySettings(): Promise<CompanySettings>;
  saveCompanySettings(settings: CompanySettings): Promise<void>;

  isFirstUser(): Promise<boolean>;
  getCallerUserProfile(): Promise<UserProfile | null>;
  getUserProfile(principal: Principal): Promise<UserProfile | null>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;
  setUserPassword(password: string): Promise<void>;
  verifyUserPassword(password: string): Promise<boolean>;
  hasUserPassword(): Promise<boolean>;
  getAllUserProfiles(): Promise<[Principal, UserProfile][]>;
  updateUserProfile(principal: Principal, profile: UserProfile): Promise<void>;
}
