# Radha Rani Marble House

## Current State
- Full-stack app with Motoko backend and React frontend
- Modules: Dashboard, Inventory, Sales & Billing, Payments, Customers, Expenses, Reports, Finance, Settings
- Login: traditional username/password (radharanim123 / radha123456)
- Admin Panel: off/hidden
- Known bugs: Dashboard shows no data, Invoice creation errors, Payments customer selection broken
- Data persistence: stable var implemented in backend
- Assets: gold RR logo at src/frontend/public/assets/file-019d4401-ef71-762a-a4e0-e28a94ec321e.jpg

## Requested Changes (Diff)

### Add
- PDF invoice download/print button on Invoice Detail
- WhatsApp payment reminder button (opens WhatsApp with pre-filled message)
- Reports page: charts for monthly sales, profit trends, inventory valuation
- Expense tracker: category-wise breakdown (labour, rent, transport, salary, electricity, misc)
- Customer ledger: detailed view showing all invoices and payments per customer
- Data export: CSV/JSON download for all modules
- PWA support: manifest.json, service worker, installable on mobile home screen
- PWA icons: use gold RR monogram logo
- Dashboard: fix revenue, profit, outstanding dues calculation from actual sales/payments/expenses data
- Finance page: income vs expense summary, profit/loss

### Modify
- Backend: fix all data query functions to return correct aggregated data for dashboard
- Backend: ensure payments correctly update sale paymentStatus and outstandingDue
- Backend: add getExpensesByCategory, getDashboardStats, exportAllData functions
- Backend: add PDF-ready invoice data function
- Payments page: fix customer selection dropdown - load customers properly, show pending invoices on customer select
- Dashboard: fix KPI cards (Revenue, Profit, Outstanding Dues, Low Stock count) to pull from real data
- Sales page: fix invoice creation - ensure all select fields have non-empty values
- Reports page: add recharts bar/line charts for monthly trends

### Remove
- Nothing removed

## Implementation Plan
1. Rewrite backend main.mo with complete, correct implementations of all query/update functions including getDashboardStats, getExpensesByCategory, exportAllData, recordPaymentForSale
2. Ensure all stable vars are correct and data persists
3. Rebuild frontend pages:
   a. DashboardPage: use getDashboardStats for real KPIs + monthly chart
   b. SalesPage: fix invoice form (no empty Select values), add PDF print, WhatsApp reminder
   c. PaymentsPage: fix customer dropdown load + pending invoice selection
   d. ExpensesPage: add category-wise pie chart and summary
   e. ReportsPage: add recharts charts (monthly sales bar, profit line, inventory value)
   f. FinancePage: income vs expense summary cards
4. Add PWA: vite-plugin-pwa with manifest, icons, service worker
5. Add CSV export buttons on Reports page
