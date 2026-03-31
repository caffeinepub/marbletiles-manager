import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
    role: string;
}
export interface SaleItem {
    productId: ProductId;
    gstAmount: bigint;
    quantity: bigint;
    gstRate: GSTRate;
    unitPrice: bigint;
}
export interface GSTRate {
    name: string;
    percentage: bigint;
}
export type Time = bigint;
export interface Payment {
    id: PaymentId;
    saleId: SaleId;
    date: Time;
    mode: PaymentMode;
    notes: string;
    amount: bigint;
}
export interface Sale {
    id: SaleId;
    paymentStatus: SaleStatus;
    createdAt: Time;
    createdBy: Principal;
    totalGST: bigint;
    grandTotal: bigint;
    invoiceNumber: string;
    transportCharge: bigint;
    discount: bigint;
    customerId: CustomerId;
    items: Array<SaleItem>;
    subtotal: bigint;
}
export interface Expense {
    id: ExpenseId;
    date: Time;
    description: string;
    recordedBy: Principal;
    category: ExpenseCategory;
    amount: bigint;
}
export interface Customer {
    id: CustomerId;
    name: string;
    createdAt: Time;
    email: string;
    outstandingDue: bigint;
    totalPurchases: bigint;
    address: string;
    phone: string;
}
export type PaymentId = bigint;
export type CustomerId = bigint;
export type ExpenseId = bigint;
export type SaleId = bigint;
export type ProductId = bigint;
export interface Product {
    id: ProductId;
    name: string;
    createdAt: Time;
    minStockAlert: bigint;
    category: ProductCategory;
    currentStock: bigint;
    basePrice: bigint;
    qrCode: string;
}
export interface Reports {
    lowStockReport: Array<Product>;
    expenses: Array<Expense>;
    totalSales: bigint;
    topSellingProducts: Array<Product>;
    totalRevenue: bigint;
}
export enum ExpenseCategory {
    other = "other",
    labour = "labour",
    rent = "rent",
    transport = "transport",
    electricity = "electricity"
}
export enum PaymentMode {
    upi = "upi",
    bank = "bank",
    cash = "cash",
    cheque = "cheque"
}
export enum ProductCategory {
    other = "other",
    tile = "tile",
    granite = "granite",
    marble = "marble"
}
export enum SaleStatus {
    paid = "paid",
    unpaid = "unpaid",
    partial = "partial"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCustomer(customer: Customer): Promise<CustomerId>;
    addExpense(expense: Expense): Promise<void>;
    addGSTRate(rate: GSTRate): Promise<void>;
    addPayment(payment: Payment): Promise<PaymentId>;
    addProduct(product: Product): Promise<ProductId>;
    addProductCategory(category: string): Promise<void>;
    addSale(sale: Sale): Promise<SaleId>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteExpense(id: ExpenseId): Promise<void>;
    deleteGSTRate(name: string): Promise<void>;
    deleteProductCategory(category: string): Promise<void>;
    getAllCustomers(): Promise<Array<Customer>>;
    getAllExpenses(): Promise<Array<Expense>>;
    getAllGSTRates(): Promise<Array<[string, GSTRate]>>;
    getAllPayments(): Promise<Array<Payment>>;
    getAllProductCategories(): Promise<Array<[string, ProductCategory]>>;
    getAllProducts(): Promise<Array<Product>>;
    getAllSales(): Promise<Array<Sale>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomer(id: CustomerId): Promise<Customer>;
    getPayment(id: PaymentId): Promise<Payment | null>;
    getProduct(name: string): Promise<Product | null>;
    getReports(): Promise<Reports>;
    getSale(id: SaleId): Promise<Sale | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCustomer(customerId: CustomerId, customer: Customer): Promise<void>;
    updateExpense(id: ExpenseId, expense: Expense): Promise<void>;
    updatePayment(paymentId: PaymentId, payment: Payment): Promise<void>;
    updateProduct(name: string, product: Product): Promise<void>;
    updateSale(id: SaleId, sale: Sale): Promise<void>;
}
