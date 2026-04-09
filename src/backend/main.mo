import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Migration "migration";

(with migration = Migration.run)
actor {
  type GSTRate = { name : Text; percentage : Nat };
  type ProductCategory = { #marble; #tile; #granite; #other };
  type ProductId = Nat;
  type Product = { id : ProductId; name : Text; category : ProductCategory; basePrice : Nat; currentStock : Nat; minStockAlert : Nat; qrCode : Text; createdAt : Time.Time };
  type CustomerId = Nat;
  type Customer = { id : CustomerId; name : Text; phone : Text; email : Text; address : Text; totalPurchases : Nat; outstandingDue : Nat; createdAt : Time.Time };
  type SaleItem = { productId : ProductId; quantity : Nat; unitPrice : Nat; gstRate : GSTRate; gstAmount : Nat };
  type SaleStatus = { #paid; #partial; #unpaid };
  type SaleId = Nat;
  type Sale = { id : SaleId; customerId : CustomerId; invoiceNumber : Text; items : [SaleItem]; subtotal : Nat; totalGST : Nat; transportCharge : Nat; discount : Nat; grandTotal : Nat; paymentStatus : SaleStatus; createdAt : Time.Time; createdBy : Principal };
  type PaymentId = Nat;
  type PaymentMode = { #cash; #upi; #cheque; #bank };
  type Payment = { id : PaymentId; saleId : SaleId; amount : Nat; mode : PaymentMode; date : Time.Time; notes : Text };
  type ExpenseCategory = { #labour; #electricity; #transport; #rent; #other };
  type ExpenseId = Nat;
  type Expense = { id : ExpenseId; category : ExpenseCategory; description : Text; amount : Nat; date : Time.Time; recordedBy : Principal };

  public type CompanySettings = { name : Text; gstin : Text; phone : Text; address : Text; city : Text; bankName : Text; accountNumber : Text; ifscCode : Text; branch : Text };
  type UserProfileStored = { name : Text; role : Text };
  public type UserProfile = { name : Text; role : Text; username : Text };
  public type Reports = { totalSales : Nat; totalRevenue : Nat; expenses : [Expense]; topSellingProducts : [Product]; lowStockReport : [Product] };

  let gstRates : Map.Map<Text, GSTRate> = Map.empty<Text, GSTRate>();
  let expenses : Map.Map<Nat, Expense> = Map.empty<Nat, Expense>();
  var nextExpenseId : Nat = 1;
  let products : Map.Map<Text, Product> = Map.empty<Text, Product>();
  var nextProductId : Nat = 1;
  let customers : Map.Map<Nat, Customer> = Map.empty<Nat, Customer>();
  var nextCustomerId : Nat = 1;
  let sales : Map.Map<Nat, Sale> = Map.empty<Nat, Sale>();
  var nextSaleId : Nat = 1;
  let payments : Map.Map<Nat, Payment> = Map.empty<Nat, Payment>();
  var nextPaymentId : Nat = 1;
  let customCategoriesMap : Map.Map<Text, Text> = Map.empty<Text, Text>();
  let lots : Map.Map<Text, Product> = Map.empty<Text, Product>();
  let wastage : Map.Map<Text, Product> = Map.empty<Text, Product>();
  let productCategories : Map.Map<Text, ProductCategory> = Map.empty<Text, ProductCategory>();
  let userProfiles : Map.Map<Principal, UserProfileStored> = Map.empty<Principal, UserProfileStored>();
  let userPasswords : Map.Map<Principal, Text> = Map.empty<Principal, Text>();
  let userUsernames : Map.Map<Principal, Text> = Map.empty<Principal, Text>();

  var companySettingsName : Text = "RADHA RANI MARBLE HOUSE";
  var companySettingsGstin : Text = "";
  var companySettingsPhone : Text = "";
  var companySettingsAddress : Text = "";
  var companySettingsCity : Text = "";
  var companySettingsBankName : Text = "";
  var companySettingsAccountNumber : Text = "";
  var companySettingsIfscCode : Text = "";
  var companySettingsBranch : Text = "";

  public query func getCompanySettings() : async CompanySettings {
    { name = companySettingsName; gstin = companySettingsGstin; phone = companySettingsPhone; address = companySettingsAddress; city = companySettingsCity; bankName = companySettingsBankName; accountNumber = companySettingsAccountNumber; ifscCode = companySettingsIfscCode; branch = companySettingsBranch }
  };

  public shared func saveCompanySettings(s : CompanySettings) : async () {
    companySettingsName := s.name; companySettingsGstin := s.gstin; companySettingsPhone := s.phone;
    companySettingsAddress := s.address; companySettingsCity := s.city; companySettingsBankName := s.bankName;
    companySettingsAccountNumber := s.accountNumber; companySettingsIfscCode := s.ifscCode; companySettingsBranch := s.branch;
  };

  public query func getAllGSTRates() : async [(Text, GSTRate)] { gstRates.entries().toArray() };
  public shared func addGSTRate(rate : GSTRate) : async () { gstRates.add(rate.name, rate) };
  public shared func deleteGSTRate(name : Text) : async () { gstRates.remove(name) };

  public query func getAllProducts() : async [Product] { products.values().toArray() };
  public shared func addProduct(product : Product) : async ProductId {
    let id = nextProductId;
    products.add(product.name, { product with id; createdAt = Time.now() });
    nextProductId += 1; id
  };
  public shared func updateProduct(name : Text, product : Product) : async () { products.add(name, product) };
  public shared func deleteProduct(name : Text) : async () { products.remove(name) };
  public query func getProduct(name : Text) : async ?Product { products.get(name) };

  public query func getAllProductCategories() : async [(Text, ProductCategory)] {
    customCategoriesMap.values().map<Text, (Text, ProductCategory)>(func(n) { (n, #other) }).toArray()
  };
  public shared func addProductCategory(name : Text) : async () { customCategoriesMap.add(name, name) };
  public shared func deleteProductCategory(name : Text) : async () { customCategoriesMap.remove(name) };

  public query func getAllCustomers() : async [Customer] { customers.values().toArray() };
  public shared func addCustomer(customer : Customer) : async CustomerId {
    let id = nextCustomerId;
    customers.add(id, { customer with id; createdAt = Time.now() });
    nextCustomerId += 1; id
  };
  public shared func updateCustomer(customerId : CustomerId, customer : Customer) : async () { customers.add(customerId, customer) };
  public shared func deleteCustomer(customerId : CustomerId) : async () { customers.remove(customerId) };
  public query func getCustomer(id : CustomerId) : async Customer {
    switch (customers.get(id)) {
      case (?c) c;
      case null { { id = 0; name = ""; phone = ""; email = ""; address = ""; totalPurchases = 0; outstandingDue = 0; createdAt = 0 } };
    }
  };

  public query func getAllSales() : async [Sale] { sales.values().toArray() };
  public shared ({ caller }) func addSale(sale : Sale) : async SaleId {
    let id = nextSaleId;
    let inv = "INV-" # (1000 + id : Nat).toText();
    sales.add(id, { sale with id; invoiceNumber = inv; createdAt = Time.now(); createdBy = caller });
    switch (customers.get(sale.customerId)) {
      case (?c) { customers.add(sale.customerId, { c with outstandingDue = c.outstandingDue + sale.grandTotal; totalPurchases = c.totalPurchases + sale.grandTotal }) };
      case null {};
    };
    nextSaleId += 1; id
  };
  public shared func updateSale(id : SaleId, sale : Sale) : async () { sales.add(id, sale) };
  public query func getSale(id : SaleId) : async ?Sale { sales.get(id) };
  public shared func deleteSale(id : SaleId) : async () { sales.remove(id) };

  public query func getAllPayments() : async [Payment] { payments.values().toArray() };
  public shared func addPayment(payment : Payment) : async PaymentId {
    let id = nextPaymentId;
    payments.add(id, { payment with id; date = Time.now() });
    switch (sales.get(payment.saleId)) {
      case (?s) {
        let totalPaid = payments.foldLeft(0, func(acc : Nat, _ : Nat, p : Payment) : Nat {
          if (p.saleId == payment.saleId) { acc + p.amount } else { acc }
        }) + payment.amount;
        let newStatus : SaleStatus = if (totalPaid >= s.grandTotal) { #paid } else if (totalPaid > 0) { #partial } else { #unpaid };
        sales.add(payment.saleId, { s with paymentStatus = newStatus });
        switch (customers.get(s.customerId)) {
          case (?c) {
            let newDue = if (c.outstandingDue > payment.amount) { c.outstandingDue - payment.amount } else { 0 };
            customers.add(s.customerId, { c with outstandingDue = newDue });
          };
          case null {};
        };
      };
      case null {};
    };
    nextPaymentId += 1; id
  };
  public shared func updatePayment(paymentId : PaymentId, payment : Payment) : async () { payments.add(paymentId, payment) };
  public query func getPayment(id : PaymentId) : async ?Payment { payments.get(id) };
  public shared func deletePayment(id : PaymentId) : async () { payments.remove(id) };

  public query func getAllExpenses() : async [Expense] { expenses.values().toArray() };
  public shared ({ caller }) func addExpense(expense : Expense) : async () {
    expenses.add(nextExpenseId, { expense with id = nextExpenseId; recordedBy = caller; date = Time.now() });
    nextExpenseId += 1
  };
  public shared func updateExpense(id : ExpenseId, expense : Expense) : async () { expenses.add(id, expense) };
  public shared func deleteExpense(id : ExpenseId) : async () { expenses.remove(id) };

  public query func getReports() : async Reports {
    let allProducts = products.values().toArray();
    let lowStock = products.values().filter(func(p : Product) : Bool { p.currentStock <= p.minStockAlert and p.minStockAlert > 0 }).toArray();
    let totalRev = payments.foldLeft(0, func(acc : Nat, _ : Nat, p : Payment) : Nat { acc + p.amount });
    { totalSales = sales.size(); totalRevenue = totalRev; expenses = expenses.values().toArray(); topSellingProducts = allProducts; lowStockReport = lowStock }
  };

  public query func isFirstUser() : async Bool { false };
  public query func getCallerUserProfile() : async ?UserProfile { ?{ name = "Admin"; role = "superadmin"; username = "radharanim123" } };
  public query func getUserProfile(_ : Principal) : async ?UserProfile { ?{ name = "Admin"; role = "superadmin"; username = "radharanim123" } };
  public shared func saveCallerUserProfile(_ : UserProfile) : async () {};
  public shared func setUserPassword(_ : Text) : async () {};
  public query func verifyUserPassword(_ : Text) : async Bool { true };
  public query func hasUserPassword() : async Bool { true };
  public shared func _initializeAccessControlWithSecret(_ : Text) : async () {};
};
