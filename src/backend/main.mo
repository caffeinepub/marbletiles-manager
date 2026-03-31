import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";



actor {
  // ==== TYPES ====

  // Units and GST Rates
  type GSTRate = {
    name : Text;
    percentage : Nat;
  };

  // Product Types
  type ProductCategory = { #marble; #tile; #granite; #other };
  type ProductId = Nat;
  type Product = {
    id : ProductId;
    name : Text;
    category : ProductCategory;
    basePrice : Nat;
    currentStock : Nat;
    minStockAlert : Nat;
    qrCode : Text;
    createdAt : Time.Time;
  };

  // Customer
  type CustomerId = Nat;
  type Customer = {
    id : CustomerId;
    name : Text;
    phone : Text;
    email : Text;
    address : Text;
    totalPurchases : Nat;
    outstandingDue : Nat;
    createdAt : Time.Time;
  };

  // Sale Items
  type SaleItem = {
    productId : ProductId;
    quantity : Nat;
    unitPrice : Nat;
    gstRate : GSTRate;
    gstAmount : Nat;
  };

  // Sale
  type SaleStatus = { #paid; #partial; #unpaid };
  type SaleId = Nat;
  type Sale = {
    id : SaleId;
    customerId : CustomerId;
    invoiceNumber : Text;
    items : [SaleItem];
    subtotal : Nat;
    totalGST : Nat;
    transportCharge : Nat;
    discount : Nat;
    grandTotal : Nat;
    paymentStatus : SaleStatus;
    createdAt : Time.Time;
    createdBy : Principal;
  };

  // Payment
  type PaymentId = Nat;
  type PaymentMode = { #cash; #upi; #cheque; #bank };
  type Payment = {
    id : PaymentId;
    saleId : SaleId;
    amount : Nat;
    mode : PaymentMode;
    date : Time.Time;
    notes : Text;
  };

  // Expense
  type ExpenseCategory = { #labour; #electricity; #transport; #rent; #other };
  type ExpenseId = Nat;
  type Expense = {
    id : ExpenseId;
    category : ExpenseCategory;
    description : Text;
    amount : Nat;
    date : Time.Time;
    recordedBy : Principal;
  };

  var gstRates = Map.empty<Text, GSTRate>();
  var expenses = Map.empty<Nat, Expense>();
  var nextExpenseId = 1;
  var productCategories = Map.empty<Text, ProductCategory>();
  var products = Map.empty<Text, Product>();
  var nextProductId = 1;
  var customers = Map.empty<Nat, Customer>();
  var nextCustomerId = 1;
  var sales = Map.empty<Nat, Sale>();
  var nextSaleId = 1;
  var payments = Map.empty<Nat, Payment>();
  var nextPaymentId = 1;
  var lots = Map.empty<Text, Product>();
  var wastage = Map.empty<Text, Product>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
    role : Text; // "superadmin", "manager", or "staff"
  };

  var userProfiles = Map.empty<Principal, UserProfile>();

  // ==== AUTHORIZATION HELPERS ====

  private func getCallerRole(caller : Principal) : Text {
    switch (userProfiles.get(caller)) {
      case (?profile) { profile.role };
      case (null) { "guest" };
    };
  };

  private func requireSuperAdmin(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    let role = getCallerRole(caller);
    if (role != "superadmin") {
      Runtime.trap("Unauthorized: Only superadmin can perform this action");
    };
  };

  private func requireManagerOrAbove(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    let role = getCallerRole(caller);
    if (role != "superadmin" and role != "manager") {
      Runtime.trap("Unauthorized: Only superadmin or manager can perform this action");
    };
  };

  private func requireStaffOrAbove(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    let role = getCallerRole(caller);
    if (role != "superadmin" and role != "manager" and role != "staff") {
      Runtime.trap("Unauthorized: Only authenticated staff can perform this action");
    };
  };

  // ==== USER PROFILE MANAGEMENT ====

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    // Validate role
    if (profile.role != "superadmin" and profile.role != "manager" and profile.role != "staff") {
      Runtime.trap("Invalid role: must be superadmin, manager, or staff");
    };

    // Only superadmin can assign superadmin role
    if (profile.role == "superadmin") {
      requireSuperAdmin(caller);
    };

    userProfiles.add(caller, profile);
  };

  // ==== PRODUCT CATEGORY ==== (SUPERADMIN ONLY)

  public query ({ caller }) func getAllProductCategories() : async [(Text, ProductCategory)] {
    requireStaffOrAbove(caller);
    productCategories.toArray();
  };

  public shared ({ caller }) func addProductCategory(category : Text) : async () {
    requireSuperAdmin(caller);
    let existingCategory = productCategories.get(category);
    switch (existingCategory) {
      case (null) {
        productCategories.add(category, #other);
      };
      case (_) {
        Runtime.trap("Product Category exists! Try with new name.");
      };
    };
  };

  public shared ({ caller }) func deleteProductCategory(category : Text) : async () {
    requireSuperAdmin(caller);
    let existingCategory = productCategories.get(category);
    switch (existingCategory) {
      case (null) {
        Runtime.trap("Product Category does not exist!");
      };
      case (_) {
        productCategories.remove(category);
      };
    };
  };

  // ==== GST ==== (SUPERADMIN ONLY)

  public query ({ caller }) func getAllGSTRates() : async [(Text, GSTRate)] {
    requireStaffOrAbove(caller);
    gstRates.toArray();
  };

  public shared ({ caller }) func addGSTRate(rate : GSTRate) : async () {
    requireSuperAdmin(caller);
    if (rate.percentage > 100) {
      Runtime.trap("GST Percentage should be between 0 and 100.");
    };
    gstRates.add(rate.name, rate);
  };

  public shared ({ caller }) func deleteGSTRate(name : Text) : async () {
    requireSuperAdmin(caller);
    let existingName = gstRates.get(name);
    switch (existingName) {
      case (null) {
        Runtime.trap("GST Rate does not exist!");
      };
      case (_) {
        gstRates.remove(name);
      };
    };
  };

  // ==== EXPENSE ==== (MANAGER+ can view/add, SUPERADMIN can delete, owner can update)

  public query ({ caller }) func getAllExpenses() : async [Expense] {
    requireManagerOrAbove(caller);
    expenses.values().toArray();
  };

  public shared ({ caller }) func addExpense(expense : Expense) : async () {
    requireManagerOrAbove(caller);
    expenses.add(nextExpenseId, { expense with id = nextExpenseId; recordedBy = caller });
    nextExpenseId += 1;
  };

  public shared ({ caller }) func updateExpense(id : ExpenseId, expense : Expense) : async () {
    requireManagerOrAbove(caller);

    switch (expenses.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?existingExpense) {
        // Only the creator or superadmin can update
        if (existingExpense.recordedBy != caller) {
          requireSuperAdmin(caller);
        };
        expenses.add(id, expense);
      };
    };
  };

  public shared ({ caller }) func deleteExpense(id : ExpenseId) : async () {
    requireSuperAdmin(caller);
    expenses.remove(id);
  };

  // ==== PRODUCTS ==== (MANAGER+ can manage, STAFF can view)

  public query ({ caller }) func getAllProducts() : async [Product] {
    requireStaffOrAbove(caller);
    products.values().toArray();
  };

  public shared ({ caller }) func addProduct(product : Product) : async ProductId {
    requireManagerOrAbove(caller);
    let productId = nextProductId;
    products.add(product.name, { product with id = productId });
    nextProductId += 1;
    productId;
  };

  public shared ({ caller }) func updateProduct(name : Text, product : Product) : async () {
    requireManagerOrAbove(caller);
    if (not products.containsKey(name)) { Runtime.trap("Product not found") };
    products.add(name, product);
  };

  public query ({ caller }) func getProduct(name : Text) : async ?Product {
    requireStaffOrAbove(caller);
    products.get(name);
  };

  // ==== CUSTOMERS ==== (STAFF+ can view, MANAGER+ can modify)

  public query ({ caller }) func getAllCustomers() : async [Customer] {
    requireStaffOrAbove(caller);
    customers.values().toArray();
  };

  public shared ({ caller }) func addCustomer(customer : Customer) : async CustomerId {
    requireManagerOrAbove(caller);
    let customerId = nextCustomerId;
    customers.add(customerId, { customer with id = customerId });
    nextCustomerId += 1;
    customerId;
  };

  public shared ({ caller }) func updateCustomer(customerId : CustomerId, customer : Customer) : async () {
    requireManagerOrAbove(caller);
    if (not customers.containsKey(customerId)) { Runtime.trap("Customer not found") };
    customers.add(customerId, customer);
  };

  public query ({ caller }) func getCustomer(id : CustomerId) : async Customer {
    requireStaffOrAbove(caller);
    switch (customers.get(id)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) { customer };
    };
  };

  // ==== SALES ==== (STAFF+ can create/view, ownership for modifications)

  public query ({ caller }) func getAllSales() : async [Sale] {
    requireStaffOrAbove(caller);
    sales.values().toArray();
  };

  public shared ({ caller }) func addSale(sale : Sale) : async SaleId {
    requireStaffOrAbove(caller);
    let saleId = nextSaleId;
    sales.add(saleId, { sale with id = saleId; createdBy = caller });
    nextSaleId += 1;
    saleId;
  };

  public shared ({ caller }) func updateSale(id : SaleId, sale : Sale) : async () {
    requireStaffOrAbove(caller);

    switch (sales.get(id)) {
      case (null) { Runtime.trap("Sale not found") };
      case (?existingSale) {
        // Only the creator or manager+ can update
        if (existingSale.createdBy != caller) {
          requireManagerOrAbove(caller);
        };
        sales.add(id, sale);
      };
    };
  };

  public query ({ caller }) func getSale(id : SaleId) : async ?Sale {
    requireStaffOrAbove(caller);
    sales.get(id);
  };

  // ==== PAYMENTS ==== (STAFF+ can add, MANAGER+ can view all)

  public query ({ caller }) func getAllPayments() : async [Payment] {
    requireManagerOrAbove(caller);
    payments.values().toArray();
  };

  public shared ({ caller }) func addPayment(payment : Payment) : async PaymentId {
    requireStaffOrAbove(caller);
    let paymentId = nextPaymentId;
    payments.add(paymentId, { payment with id = paymentId });
    nextPaymentId += 1;
    paymentId;
  };

  public shared ({ caller }) func updatePayment(paymentId : PaymentId, payment : Payment) : async () {
    requireManagerOrAbove(caller);
    if (not payments.containsKey(paymentId)) { Runtime.trap("Payment not found") };
    payments.add(paymentId, payment);
  };

  public query ({ caller }) func getPayment(id : PaymentId) : async ?Payment {
    requireStaffOrAbove(caller);
    payments.get(id);
  };

  // ==== REPORTS ==== (MANAGER+ only)
  public type Reports = {
    totalSales : Nat;
    totalRevenue : Nat;
    expenses : [Expense];
    topSellingProducts : [Product];
    lowStockReport : [Product];
  };

  public query ({ caller }) func getReports() : async Reports {
    requireManagerOrAbove(caller);

    let topSellingProducts = products.values().toArray();
    let lowStockReport = products.filter(func(p) { p.1.currentStock < p.1.minStockAlert }).values().toArray();

    {
      totalSales = sales.size();
      totalRevenue = payments.values().toArray().foldLeft(0, func(acc, payment) { acc + payment.amount });
      expenses = expenses.values().toArray();
      topSellingProducts;
      lowStockReport;
    };
  };
};
