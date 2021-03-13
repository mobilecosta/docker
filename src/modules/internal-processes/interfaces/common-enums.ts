export enum Events {
  // Vindi Events
  VINDI_NEWCUSTOMER = 'vindi_new_customer',
  VINDI_UPDATECUSTOMER = 'vindi_update_customer',
  VINDI_NEWSUBSCRIPTION = 'vindi_new_subscription',
  VINDI_UPDATE_PAYMENT_METHOD = 'vindi_update_payment_method',
  VINDI_CANCELSUBSCRIPTION = 'vindi_cancel_subscription',
  VINDI_NEWITEM_BILL = 'vindi_newitem_bill',
  VINDI_UPDATE_PRICE = 'vindi_update_price',
  VINDI_ADD_DISCOUNT = 'vindi_add_discount',
  VINDI_MIGRATION_PERIOD = 'vindi_migration_period',
  VINDI_CHANGE_PRICE = 'vindi_change_price',
  // Empodera Events
  EMPODERA_ADD_CONTRACT = 'empodera_add_contract',
  EMPODERA_ADD_CUSTOMER = 'empodera_add_customer',
  EMPODERA_ADD_CUSTOM = 'empodera_add_custom_fields',
  EMPODERA_ADD_CONTACT = 'empodera_add_contact',
  EMPODERA_ADD_BILL = 'empodera_add_bill',
  EMPODERA_ACTIVATE_CUSTOMER = 'empodera_activate_customer',
  EMPODERA_INACTIVATE_CUSTOMER = 'empodera_inactivate_customer',
  
  EMPODERA_CANCEL_CONTRACT = 'empodera_cancel_contract',
  EMPODERA_CANCELED_CUSTOM = 'empodera_canceled_custom_fields',
  // Licenciador Events
  LICENCIADOR_ADD_CUSTOMER = 'licenciador_add_customer',
  LICENCIADOR_UPDATE_CUSTOMER = 'licenciador_update_customer',
  LICENCIADOR_NEW_SUBSCRIPTION = 'licenciador_new_subscription',
  LICENCIADOR_BILL_PAID = 'licenciador_bill_paid',
  LICENCIADOR_UPDATE_PAYMENT_METHOD = 'licenciador_update_payment_method',
  LICENCIADOR_SUBSCRIPTION_CANCELED = 'licenciador_subscription_canceled',
  LICENCIADOR_ADD_OFFERS = 'licenciador_add_offers',
  LICENCIADOR_UPDATE_PRICE = 'licenciador_update_price',
  LICENCIADOR_ADD_RESELLER = 'licenciador_add_reseller',
  LICENCIADOR_ADD_DISCOUNT = 'licenciador_add_discount',
  LICENCIADOR_CHANGE_PRICE = 'licenciador_change_price',
  // Protheus Events
  PROTHEUS_ADD_CUSTOMER = 'protheus_add_customer',
  PROTHEUS_BILL_PAID = 'protheus_bill_paid',
  PROTHEUS_ADD_RESELLER = 'protheus_add_reseller',
  // Protheus Corp
  PROTHEUS_CORP_ADD_CUSTOMER = 'protheus_corp_add_customer',
  // Store Events
  STORE_NEW_CUSTOMER = 'store_new_customer',
  STORE_BILL_CREATED = 'store_bill_created',
  STORE_BILL_PAID = 'store_bill_paid',
  STORE_SUBSCRIPTION_CREATED = 'store_subscription_created',
  STORE_SUBSCRIPTION_CANCELED = 'store_subscription_canceled',
  STORE_PAYMENT_PROFILE_CREATED = 'store_payment_profile_created',
  STORE_CHARGE_REJECTED = 'store_charge_rejected',
  STORE_CHARGE_CREATED = 'store_charge_created',
  STORE_SUBSCRIPTION_MIGRATED = 'store_subscription_migrated',
  STORE_ADD_RESELLER = 'store_add_reseller',
  // Zenvia Events
  SMS_BILL_CREATED = 'sms_bill_created',
  SMS_BILL_PAID = 'sms_bill_paid',
}

export enum Recurrence {
  MENSAL = 1,
  BIMESTRAL = 2,
  TRIMESTRAL = 3,
  QUADRIMESTRAL = 4,
  SEMESTRAL = 6,
  ANUAL = 12,
}
