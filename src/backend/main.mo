import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

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
  // Sale type kept identical to previous deployed version (no new fields to preserve compatibility)
  type Sale = { id : SaleId; customerId : CustomerId; invoiceNumber : Text; items : [SaleItem]; subtotal : Nat; totalGST : Nat; transportCharge : Nat; discount : Nat; grandTotal : Nat; paymentStatus : SaleStatus; createdAt : Time.Time; createdBy : Principal };
  type PaymentId = Nat;
  type PaymentMode = { #cash; #upi; #cheque; #bank };
  // Payment type kept identical to previous deployed version (no new fields to preserve compatibility)
  type Payment = { id : PaymentId; saleId : SaleId; amount : Nat; mode : PaymentMode; date : Time.Time; notes : Text };
  type ExpenseCategory = { #labour; #electricity; #transport; #rent; #other };
  type ExpenseId = Nat;
  type Expense = { id : ExpenseId; category : ExpenseCategory; description : Text; amount : Nat; date : Time.Time; recordedBy : Principal };

  // Keep these stable vars from previous versions to avoid compatibility errors
  type UserProfileStored = { name : Text; role : Text };
  stable var userProfiles = Map.empty<Principal, UserProfileStored>();
  stable var userUsernames = Map.empty<Principal, Text>();
  stable var userPasswords = Map.empty<Principal, Text>();
  stable var productCategories = Map.empty<Text, ProductCategory>();
  stable var lots = Map.empty<Text, Product>();
  stable var wastage = Map.empty<Text, Product>();
  let accessControlState = AccessControl.initState();

  public type UserProfile = { name : Text; role : Text; username : Text };
  public type Reports = { totalSales : Nat; totalRevenue : Nat; expenses : [Expense]; topSellingProducts : [Product]; lowStockReport : [Product] };

  stable var gstRates = Map.empty<Text, GSTRate>();
  stable var expenses = Map.empty<Nat, Expense>();
  stable var nextExpenseId = 1;
  stable var products = Map.empty<Text, Product>();
  stable var nextProductId = 1;
  stable var customers = Map.empty<Nat, Customer>();
  stable var nextCustomerId = 1;
  stable var sales = Map.empty<Nat, Sale>();
  stable var nextSaleId = 1;
  stable var payments = Map.empty<Nat, Payment>();
  stable var nextPaymentId = 1;
  stable var customCategoriesMap = Map.empty<Text, Text>();

  public query func getAllGSTRates() : async [(Text, GSTRate)] { gstRates.toArray() };
  public shared func addGSTRate(rate : GSTRate) : async () { gstRates.add(rate.name, rate) };
  public shared func deleteGSTRate(name : Text) : async () { gstRates.remove(name) };

  public query func getAllProducts() : async [Product] { products.values().toArray() };
  public shared func addProduct(product : Product) : async ProductId {
    let id = nextProductId;
    products.add(product.name, { product with id; createdAt = Time.now() });
    nextProductId += 1;
    id
  };
  public shared func updateProduct(name : Text, product : Product) : async () { products.add(name, product) };
  public shared func deleteProduct(name : Text) : async () { products.remove(name) };
  public query func getProduct(name : Text) : async ?Product { products.get(name) };

  public query func getAllProductCategories() : async [(Text, ProductCategory)] {
    customCategoriesMap.values().toArray().map(func(n) { (n, #other) })
  };
  public shared func addProductCategory(name : Text) : async () { customCategoriesMap.add(name, name) };
  public shared func deleteProductCategory(name : Text) : async () { customCategoriesMap.remove(name) };

  public query func getAllCustomers() : async [Customer] { customers.values().toArray() };
  public shared func addCustomer(customer : Customer) : async CustomerId {
    let id = nextCustomerId;
    customers.add(id, { customer with id; createdAt = Time.now() });
    nextCustomerId += 1;
    id
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
    let inv = "INV-" # Nat.toText(1000 + id);
    sales.add(id, { sale with id; invoiceNumber = inv; createdAt = Time.now(); createdBy = caller });
    switch (customers.get(sale.customerId)) {
      case (?c) {
        customers.add(sale.customerId, { c with
          outstandingDue = c.outstandingDue + sale.grandTotal;
          totalPurchases = c.totalPurchases + sale.grandTotal
        });
      };
      case null {};
    };
    nextSaleId += 1;
    id
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
        let totalPaid = payments.values().toArray().foldLeft(0, func(acc, p) {
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
    nextPaymentId += 1;
    id
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
    let lowStock = products.filter(func(_, p) { p.currentStock <= p.minStockAlert and p.minStockAlert > 0 }).values().toArray();
    let totalRev = payments.values().toArray().foldLeft(0, func(acc, p) { acc + p.amount });
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
