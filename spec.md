# Radha Rani Marble House

## Current State
- CustomersPage: has Edit + Ledger buttons, no Delete button. Balance only auto-updates via sale/payment — no manual update.
- SalesPage: has Print button, basic HTML invoice template. No logo, no bank details, no address from Settings.
- SettingsPage: Company tab stores name/gstin/phone/address/city in localStorage. No bankInfo fields.
- Backend: has `deleteCustomer` method. `CompanySettings` type does not exist in backend. Bank info not stored anywhere.
- Invoice print: renders plain HTML, no logo image, no bank details section.

## Requested Changes (Diff)

### Add
- **Customer Delete button**: visible in CustomersPage action column, with confirmation dialog before deleting.
- **Customer Balance Manual Edit**: ability to manually adjust `outstandingDue` via edit dialog (useful for corrections).
- **Bank Information in Settings**: new fields in Settings → Company tab: Bank Name, Account Number, IFSC Code, Branch. Stored in localStorage alongside other company settings.
- **Premium Invoice Template**: completely redesigned print invoice with:
  - Company logo (gold RR monogram: `/assets/file-019d4401-ef71-762a-a4e0-e28a94ec321e.jpg`) top-left
  - Company name, GSTIN, address, phone from Settings (localStorage)
  - Bank details section at bottom of invoice
  - Premium styled layout: gold header bar, clean table, totals box, terms footer
  - GST breakdown per line item (CGST + SGST split)
  - "Thank you" footer with company tagline
- **CompanySettings backend storage**: add `getCompanySettings` and `saveCompanySettings` to backend to persist address/bank info across sessions/devices (not just localStorage).

### Modify
- **CustomersPage**: add Delete button (calls `deleteCustomer`), add manual outstanding balance adjustment in Edit dialog.
- **SalesPage `printInvoice` function**: replace plain HTML with premium template that reads company settings + bank info from localStorage and embeds logo.
- **SettingsPage Company tab**: add Bank Name, Account Number, IFSC, Branch fields. Save to both localStorage and backend.

### Remove
- Nothing removed.

## Implementation Plan
1. Update Motoko backend to add `CompanySettings` type with address and bank info fields, plus `getCompanySettings` / `saveCompanySettings` stable storage.
2. Update `CustomersPage`: add Delete button with confirmation, add balance adjustment field in Edit modal.
3. Update `SettingsPage`: add bank info fields (Bank Name, Account Number, IFSC Code, Branch) to Company tab, sync to backend.
4. Update `SalesPage printInvoice`: redesign invoice HTML with logo, company details from settings, bank info, premium layout with gold header, GST split, totals box, bank details footer.
5. Wire company settings load on app startup so invoice always has latest details.
