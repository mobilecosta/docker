import { APIGatewayProxyEvent } from 'aws-lambda';
import { query } from 'gql-query-builder';
import InvokeLambda from '../../../common/lib/lambdaAdapter';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';
import CustomerPhonesRepository from '../../../repositories/CustomersPhoneRepository';

interface Result {
  body: string;
  statusCode: number;
}

export const getCustomerByDocument = async (
  document: string,
  event: APIGatewayProxyEvent,
  awsRequestId: string
): Promise<Result> => {
  // const functionName = `${process.env.APPNAME}-${process.env.ENV}-graphql`;
  // const getCustomer = event;

  const result: Result = {
    body: '',
    statusCode: 200,
  };
  const customer = await CustomerRepository.findOne({
    value: document,
    field: 'registry_code',
  });
  if (!customer) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        customer: 'not found',
        transaction: awsRequestId,
      }),
    };
  }

  const customerPhones = await CustomerPhonesRepository.find({
    value: customer.id,
    field: 'customer_id',
  });
  if (customerPhones.length === 0) {
    result.body = JSON.stringify({
      phones: 'not found',
      transaction: awsRequestId,
    });
    return result;
  }
  // getCustomer.body = JSON.stringify(
  //  query({
  //    operation: 'customer',
  //    variables: { id: { value: customer[0].id, required: true } },
  //    fields: [
  //      'id',
  //      'name',
  //      'trade',
  //      'email',
  //      'is_legal_entity',
  //      'registry_code',
  //      'registry_state_code',
  //      'cnae',
  //      'notes',
  //      'contact_person',
  //      'website',
  //      {
  //        address: [
  //          'street',
  //          'number',
  //          'additional_details',
  //          'zipcode',
  //          'neighborhood',
  //          'city',
  //          'state',
  //        ],
  //      },
  //      {
  //        phones: [
  //          'type',
  //          'number',
  //          'extension',
  //          'default',
  //          'validated',
  //          { sms: ['accepted_receive'] },
  //          { whatsapp: ['accepted_receive'] },
  //        ],
  //      },
  //      'created_at',
  //    'updated_at',
  //    ],
  //  })
  // );

  // const documentResponse = await InvokeLambda.invoke(functionName, getCustomer);
  // const payload = JSON.parse(documentResponse.Payload as string);
  // const body = JSON.parse(payload.body);
  // if (payload.statusCode > 200) {
  //  result.body = JSON.stringify({
  //    status: 'error',
  //    error: body.errors[0].message,
  //    transaction: awsRequestId,
  //  });
  // } else if (!body.data.customer) {
  //  result.statusCode = 200;
  //  result.body = JSON.stringify({
  //    customer: 'not found',
  //    transaction: awsRequestId,
  //  });
  // } else {

  result.body = JSON.stringify({
    customer: {
      id: customer.id,
      name: customer.name,
      trade: customer.trade,
      email: customer.email,
      isLegalEntity: customer.isLegalEntity,
      registryCode: customer.registryCode,
      registryStateCode: customer.registryStateCode,
      cnae: customer.cnae,
      notes: customer.notes,
      contactPerson: customer.contactPerson,
      website: customer.website,
      address: {
        street: customer.address.street,
        number: customer.address.number,
        additionalDetails: customer.address.additionalDetails,
        zipcode: customer.address.zipcode,
        neighborhood: customer.address.neighborhood,
        city: customer.address.city,
        state: customer.address.state,
      },
      phones: customerPhones.map((item: any) => {
        return {
          phoneType: item.type,
          authorizesSMS: item.sms.acceptedReceive,
          authorizesWhatsApp: item.whatsapp.acceptedReceive,
          default: item.default,
          validated: item.validated,
          phone: {
            country: item.number.substring(0, 2),
            area: item.number.substring(2, 4),
            number: item.number.substring(4, 13),
            extension: item.extension,
          },
        };
      }),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    },
    transaction: awsRequestId,
  });
  // }
  return result;
};
