/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable @typescript-eslint/camelcase */
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInt,
} from 'graphql';
import {
  /* GraphQLDate,
   GraphQLTime, */
  GraphQLDateTime,
} from 'graphql-iso-date';

import { subscription } from 'gql-query-builder';
import { CustomerInterface } from '../resolvers/customers/typings';
import {
  getCustomerById,
  getCustomers,
  getCustomerByDocument,
} from '../resolvers/customers';

import { getCustomerPhoneByCustomerId } from '../resolvers/customers-phones';
import {
  getSubscriptionByCustomerId,
  getSubscriptionByDocument,
} from '../resolvers/subscriptions';
import { getDiscountBySubscriptionId } from '../resolvers/discount';
import {
  getBillBySubscriptionId,
  getLastBillBySubscriptionId,
} from '../resolvers/bills';
import { getLastPeriodBySubscription } from '../resolvers/period';

const addressType = new GraphQLObjectType({
  name: 'Address',
  fields: {
    street: { type: new GraphQLNonNull(GraphQLString) },
    number: { type: new GraphQLNonNull(GraphQLString) },
    additional_details: { type: GraphQLString },
    zipcode: { type: new GraphQLNonNull(GraphQLString) },
    neighborhood: { type: new GraphQLNonNull(GraphQLString) },
    city: { type: new GraphQLNonNull(GraphQLString) },
    state: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const over16Type = new GraphQLObjectType({
  name: 'Over16Metadata',
  fields: {
    ip: { type: new GraphQLNonNull(GraphQLString) },
    details: { type: new GraphQLNonNull(GraphQLDateTime) },
  },
});

const authorizedMessagesType = new GraphQLObjectType({
  name: 'AuthorizedMessages',
  fields: {
    accepted_receive: { type: new GraphQLNonNull(GraphQLBoolean) },
    acceptance_date: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const customerPhoneType = new GraphQLObjectType({
  name: 'CustomerPhone',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    number: { type: new GraphQLNonNull(GraphQLString) },
    customer_id: { type: new GraphQLNonNull(GraphQLString) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    extension: { type: GraphQLString },
    sms: { type: GraphQLNonNull(authorizedMessagesType) },
    whatsapp: { type: GraphQLNonNull(authorizedMessagesType) },
    default: { type: GraphQLBoolean },
    validated: { type: GraphQLBoolean },
    validation_date: { type: GraphQLDateTime },
    created_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    updated_at: { type: new GraphQLNonNull(GraphQLDateTime) },
  },
});

const cancelReasonType = new GraphQLObjectType({
  name: 'SubscriptionCancelReason',
  fields: {
    main: { type: new GraphQLNonNull(GraphQLString) },
    sub: { type: new GraphQLNonNull(GraphQLString) },
    details: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const discountType = new GraphQLObjectType({
  name: 'Discount',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    subscriptionId: { type: new GraphQLNonNull(GraphQLString) },
    amount: { type: new GraphQLNonNull(GraphQLString) },
    cycles: { type: new GraphQLNonNull(GraphQLString) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    created_at: { type: new GraphQLNonNull(GraphQLDateTime) },
  },
});

const billType = new GraphQLObjectType({
  name: 'Bill',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    id_vindi: { type: new GraphQLNonNull(GraphQLInt) },
    amount: { type: new GraphQLNonNull(GraphQLString) },
    installments: { type: new GraphQLNonNull(GraphQLInt) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    due_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    url: { type: new GraphQLNonNull(GraphQLString) },
    subscription_id: { type: new GraphQLNonNull(GraphQLString) },
    updated_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    created_at: { type: new GraphQLNonNull(GraphQLDateTime) },
  },
});

const periodType = new GraphQLObjectType({
  name: 'Period',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    id_vindi: { type: new GraphQLNonNull(GraphQLInt) },
    start_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    end_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    cycle: { type: new GraphQLNonNull(GraphQLInt) },
    subscription_id: { type: new GraphQLNonNull(GraphQLString) },
    updated_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    created_at: { type: new GraphQLNonNull(GraphQLDateTime) },
  },
});

const customerType = new GraphQLObjectType({
  name: 'Customer',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    trade: { type: GraphQLString },
    email: { type: new GraphQLNonNull(GraphQLString) },
    is_legal_entity: { type: GraphQLBoolean },
    registry_code: { type: new GraphQLNonNull(GraphQLString) },
    registry_state_code: { type: GraphQLString },
    cnae: { type: GraphQLString },
    notes: { type: GraphQLString },
    contact_person: { type: GraphQLString },
    website: { type: GraphQLString },
    address: { type: new GraphQLNonNull(addressType) },
    is_over_16: { type: GraphQLBoolean },
    over_16_metadata: { type: new GraphQLNonNull(over16Type) },
    email_confirmed_at: { type: GraphQLDateTime },
    vindi_sent_at: { type: GraphQLDateTime },
    store_sent_at: { type: GraphQLDateTime },
    protheus_sent_at: { type: GraphQLDateTime },
    licenciador_sent_at: { type: GraphQLDateTime },
    code_licenciador: { type: new GraphQLNonNull(GraphQLString) },
    code_t: { type: new GraphQLNonNull(GraphQLString) },
    vindi_code: { type: new GraphQLNonNull(GraphQLString) },
    created_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    updated_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    phones: {
      type: new GraphQLList(customerPhoneType),
      resolve: (customer: any) => {
        return getCustomerPhoneByCustomerId(customer.id);
      },
    },
    // subscriptions: {
    //   type: new GraphQLList(subscriptionType),
    //   resolve: (customer: any) => {
    //     return getSubscriptionByCustomerId(customer.id);
    //   },
    // },
  },
});

const subscriptionType = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    vindi_id: { type: GraphQLString },
    customer: {
      type: customerType,
      resolve: (sub: any) => {
        return getCustomerById(sub.customer_id);
      },
    },
    // customer_id: { type: new GraphQLNonNull(GraphQLString) },
    sales_order: { type: GraphQLString },
    plan_code: { type: new GraphQLNonNull(GraphQLString) },
    payment_method_code: { type: new GraphQLNonNull(GraphQLString) },
    price: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    installments: { type: new GraphQLNonNull(GraphQLInt) },
    vindi_sent_at: { type: GraphQLDateTime },
    licenciador_sent_at: { type: GraphQLDateTime },
    code_licenciador: { type: GraphQLString },
    created_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    updated_at: { type: new GraphQLNonNull(GraphQLDateTime) },
    reason: { type: cancelReasonType },
    last_transaction: {
      type: billType,
      resolve: (sub: any) => {
        return getLastBillBySubscriptionId(sub.id);
      },
    },
    last_period: {
      type: periodType,
      resolve: (sub: any) => {
        return getLastPeriodBySubscription(sub.id);
      },
    },
    bills: {
      type: new GraphQLList(billType),
      resolve: (sub: any) => {
        return getBillBySubscriptionId(sub.id);
      },
    },
    discounts: {
      type: new GraphQLList(discountType),
      resolve: (sub: any) => {
        return getDiscountBySubscriptionId(sub.id);
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      customers: {
        type: new GraphQLList(customerType),
        resolve: parent => {
          return getCustomers();
        },
      },
      customer: {
        args: {
          id: { type: new GraphQLNonNull(GraphQLString) },
        },
        type: customerType,
        // @ts-ignore
        resolve: (parent, args: { id: string }) => {
          return getCustomerById(args.id);
        },
      },
      customerByDocument: {
        args: {
          document: { type: new GraphQLNonNull(GraphQLString) },
        },
        type: customerType,
        // @ts-ignore
        resolve: async (parent, args: { document: string }) => {
          const data = await getCustomerByDocument(args.document);
          return data[0];
        },
      },
      subscriptionByDocument: {
        args: {
          document: { type: new GraphQLNonNull(GraphQLString) },
        },
        type: subscriptionType,
        // @ts-ignore
        resolve: async (parent, args: { document: string }) => {
          const data = await getSubscriptionByDocument(args.document);
          return data[0];
        },
      },
    },
  }),
});
export default schema;
