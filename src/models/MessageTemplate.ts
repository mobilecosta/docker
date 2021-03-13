import { attribute, hashKey, table } from "@aws/dynamodb-data-mapper-annotations";

export enum TemplateType {
    cancelreport = 'CANCEL_REPORT'
}

export enum SendType {
    whatsapp = 'WHATSAPP',
    sms = 'SMS',
    email = 'EMAIL'
}

export interface Template {
    subject?: string;
    body: string
}

@table('message_template')
class MessageTemplate {
    @hashKey()
    id: string;

    @attribute({attributeName: 'template_type'})
    templateType: TemplateType;

    templates: Record<SendType, Template>
}

export default MessageTemplate;  