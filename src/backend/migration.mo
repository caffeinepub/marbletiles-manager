import Map "mo:core/Map";
import Time "mo:core/Time";

module {
  // Old types - defined inline from .old/src/backend/dist/backend.most
  type OldUserRole = { #admin; #guest; #user };
  type OldAccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, OldUserRole>;
  };
  type OldProductCategory = { #granite; #marble; #other; #tile };
  type OldProduct = {
    basePrice : Nat;
    category : OldProductCategory;
    createdAt : Time.Time;
    currentStock : Nat;
    id : Nat;
    minStockAlert : Nat;
    name : Text;
    qrCode : Text;
  };
  type OldCustomer = {
    address : Text;
    createdAt : Time.Time;
    email : Text;
    id : Nat;
    name : Text;
    outstandingDue : Nat;
    phone : Text;
    totalPurchases : Nat;
  };
  type OldGSTRate = { name : Text; percentage : Nat };
  type OldPaymentMode = { #bank; #cash; #cheque; #upi };
  type OldPayment = {
    amount : Nat;
    date : Time.Time;
    id : Nat;
    mode : OldPaymentMode;
    notes : Text;
    saleId : Nat;
  };
  type OldExpenseCategory = { #electricity; #labour; #other; #rent; #transport };
  type OldExpense = {
    amount : Nat;
    category : OldExpenseCategory;
    date : Time.Time;
    description : Text;
    id : Nat;
    recordedBy : Principal;
  };
  type OldSaleStatus = { #paid; #partial; #unpaid };
  type OldSaleItem = {
    gstAmount : Nat;
    gstRate : OldGSTRate;
    productId : Nat;
    quantity : Nat;
    unitPrice : Nat;
  };
  type OldSale = {
    createdAt : Time.Time;
    createdBy : Principal;
    customerId : Nat;
    discount : Nat;
    grandTotal : Nat;
    id : Nat;
    invoiceNumber : Text;
    items : [OldSaleItem];
    paymentStatus : OldSaleStatus;
    subtotal : Nat;
    totalGST : Nat;
    transportCharge : Nat;
  };
  type OldUserProfileStored = { name : Text; role : Text };

  // New actor expands ProductCategory with #travertine and #onyx
  type NewProductCategory = { #granite; #marble; #other; #tile; #travertine; #onyx };

  // Old actor stable state
  type OldActor = {
    accessControlState : OldAccessControlState;
    var companySettingsAccountNumber : Text;
    var companySettingsAddress : Text;
    var companySettingsBankName : Text;
    var companySettingsBranch : Text;
    var companySettingsCity : Text;
    var companySettingsGstin : Text;
    var companySettingsIfscCode : Text;
    var companySettingsName : Text;
    var companySettingsPhone : Text;
    customCategoriesMap : Map.Map<Text, Text>;
    customers : Map.Map<Nat, OldCustomer>;
    expenses : Map.Map<Nat, OldExpense>;
    gstRates : Map.Map<Text, OldGSTRate>;
    lots : Map.Map<Text, OldProduct>;
    var nextCustomerId : Nat;
    var nextExpenseId : Nat;
    var nextPaymentId : Nat;
    var nextProductId : Nat;
    var nextSaleId : Nat;
    payments : Map.Map<Nat, OldPayment>;
    productCategories : Map.Map<Text, OldProductCategory>;
    products : Map.Map<Text, OldProduct>;
    sales : Map.Map<Nat, OldSale>;
    userPasswords : Map.Map<Principal, Text>;
    userProfiles : Map.Map<Principal, OldUserProfileStored>;
    userUsernames : Map.Map<Principal, Text>;
    wastage : Map.Map<Text, OldProduct>;
  };

  // New actor stable state (no accessControlState; ProductCategory extended)
  // OldProduct/OldCustomer/OldSale types are supertypes of new ones for migration
  type NewActor = {
    var companySettingsAccountNumber : Text;
    var companySettingsAddress : Text;
    var companySettingsBankName : Text;
    var companySettingsBranch : Text;
    var companySettingsCity : Text;
    var companySettingsGstin : Text;
    var companySettingsIfscCode : Text;
    var companySettingsName : Text;
    var companySettingsPhone : Text;
    customCategoriesMap : Map.Map<Text, Text>;
    customers : Map.Map<Nat, OldCustomer>;
    expenses : Map.Map<Nat, OldExpense>;
    gstRates : Map.Map<Text, OldGSTRate>;
    lots : Map.Map<Text, OldProduct>;
    var nextCustomerId : Nat;
    var nextExpenseId : Nat;
    var nextPaymentId : Nat;
    var nextProductId : Nat;
    var nextSaleId : Nat;
    payments : Map.Map<Nat, OldPayment>;
    productCategories : Map.Map<Text, OldProductCategory>;
    products : Map.Map<Text, OldProduct>;
    sales : Map.Map<Nat, OldSale>;
    userPasswords : Map.Map<Principal, Text>;
    userProfiles : Map.Map<Principal, OldUserProfileStored>;
    userUsernames : Map.Map<Principal, Text>;
    wastage : Map.Map<Text, OldProduct>;
  };

  // Drop accessControlState, pass everything else through
  public func run(old : OldActor) : NewActor {
    {
      var companySettingsAccountNumber = old.companySettingsAccountNumber;
      var companySettingsAddress = old.companySettingsAddress;
      var companySettingsBankName = old.companySettingsBankName;
      var companySettingsBranch = old.companySettingsBranch;
      var companySettingsCity = old.companySettingsCity;
      var companySettingsGstin = old.companySettingsGstin;
      var companySettingsIfscCode = old.companySettingsIfscCode;
      var companySettingsName = old.companySettingsName;
      var companySettingsPhone = old.companySettingsPhone;
      customCategoriesMap = old.customCategoriesMap;
      customers = old.customers;
      expenses = old.expenses;
      gstRates = old.gstRates;
      lots = old.lots;
      var nextCustomerId = old.nextCustomerId;
      var nextExpenseId = old.nextExpenseId;
      var nextPaymentId = old.nextPaymentId;
      var nextProductId = old.nextProductId;
      var nextSaleId = old.nextSaleId;
      payments = old.payments;
      productCategories = old.productCategories;
      products = old.products;
      sales = old.sales;
      userPasswords = old.userPasswords;
      userProfiles = old.userProfiles;
      userUsernames = old.userUsernames;
      wastage = old.wastage;
    }
  };
};
