import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { sendToQueue } from '../../../common/lib/sqs';
import ChangePriceService from '../services/ChangePriceService';

export const handler: APIGatewayProxyHandler = async (
    event,
    context
): Promise<APIGatewayProxyResult> => {
    let response: APIGatewayProxyResult = {
        statusCode: 201,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
        body: '',
    };

    try {

        const service = new ChangePriceService(event.body);
        const result = await service.run();

        response.body = JSON.stringify({
            customerId: result.customerId,
            subscriptionId: result.subscriptionId,
            status: result.status,
            request: result.request,
            transaction: context.awsRequestId,
        });
    } catch (error) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                status: 'error',
                message: error.message,
            }),
        };
    }

    await sendToQueue(
        JSON.stringify({
            method: event.httpMethod,
            url: event.path,
            origin: event.headers['User-Agent'],
            identity: event.requestContext.identity,
            payload: JSON.parse(event.body!) || { body: 'no body' },
            response: {
                body: JSON.parse(response.body),
                statusCode: response.statusCode,
            },
        }),
        `${process.env.PAYLOAD_QUEUE}`
    );
    return response;
};