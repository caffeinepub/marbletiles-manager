# Radha Rani Marble House

## Current State
- App has Login (username/password), Dashboard, Inventory, Sales, Payments, Customers, Expenses, Reports, Finance, Settings pages
- Admin Panel exists in routing but should remain hidden
- Backend has full CRUD for Products, Customers, Sales, Payments, Expenses, GST rates
- Sales page has basic invoice list and create dialog but needs UI overhaul
- Invoice detail view lacks printable layout and payment recording
- Dashboard, Payments, Customers, Expenses, Reports pages need full functional implementation

## Requested Changes (Diff)

### Add
- Sales & Billing page: invoice list matching uploaded image (search bar, All Status filter dropdown, table with INVOICE/CUSTOMER/DATE/TOTAL/PAID/DUE/STATUS/ACTIONS columns, gold invoice number links, PAID/PARTIAL/UNPAID status badges, View button)
- Create Invoice modal: matching uploaded image (Customer dropdown, Products with + Add Item, Qty, Price fields, GST% dropdown, Discount field, Transport field, Subtotal/Total summary, Amount Paid, Payment Method, Notes, Cancel/Create Invoice buttons)
- Invoice Detail page/view: matching uploaded image (Back button, Print button, company header "RADHA RANI MARBLE HOUSE", BILL TO section, items table with #/PRODUCT/QTY/UNIT PRICE/DISCOUNT/AMOUNT, totals section with Subtotal/Transport/Total/Paid, Notes, Payment History table with DATE/AMOUNT/METHOD/REFERENCE)
- Dashboard: Revenue card, Profit card, Outstanding Dues card, Low Stock Alerts, Monthly sales chart, recent transactions
- Customers: CRM table with add/edit/delete, customer ledger/history view
- Payments: All payment records table, collection by payment method summary
- Expenses: Add expense form, category tracking (labour/rent/transport/salary/electricity/other), totals
- Reports: P&L summary, monthly trend chart, inventory valuation, outstanding dues

### Modify
- Sales page completely redesigned to match uploaded images
- Invoice numbers formatted as INV-YYYYMM-XXXX
- Invoice detail shows payment history from payments table
- All pages use consistent warm beige/gold color scheme (background #f5f0e8, gold #B8924A)

### Remove
- Admin Panel link from sidebar (keep hidden)
- SetupProfilePage and PasswordSetupPage routes if redundant

## Implementation Plan
1. Rebuild SalesPage to match uploaded images exactly: list view with search+filter, Create Invoice modal, Invoice Detail full-page view with print
2. Fix Dashboard with real data from backend (revenue, profit, dues, stock alerts, monthly chart)
3. Rebuild CustomersPage with CRM table, add/edit/delete modals, ledger view
4. Rebuild PaymentsPage with all payment records and method summary
5. Rebuild ExpensesPage with expense form, categories, totals
6. Rebuild ReportsPage with P&L, charts, inventory valuation
7. Keep Login, Inventory, Finance, Settings pages as-is (they work)
8. Admin Panel stays hidden from sidebar
