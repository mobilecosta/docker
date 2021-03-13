import { SQSEvent, SQSHandler } from "aws-lambda";
import { removeFromQueue } from "../../../common/lib/sqs";
import { SendType } from "../../../models/MessageTemplate";
import { ISendMessage } from "../interfaces/ISendMessage";
import EmailService from "../services/EmailService";

export const handler: SQSHandler = async ({ Records, }: SQSEvent): Promise<void> => {
    for await (const record of Records) {


       const  body  = record.body;
       const sendMessage = JSON.parse(body) as ISendMessage;
       
       try {
            const sendMessage = JSON.parse(body) as ISendMessage;
            
            switch (sendMessage.sendType) {
                case SendType.email:
                    EmailService.sendEmail(sendMessage);           
                    break;
                case SendType.sms:
                    break;
                case SendType.whatsapp:
                    break;
                default:
                    console.warn(`Invalid SendType option - ${sendMessage.sendType}`);
                    break;
            }
        } catch (error) {
            
        }

        await removeFromQueue(record, `${process.env.MESSAGE_GATEWAY_QUEUE}`);
    }
};
