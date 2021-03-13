import { SendType, TemplateType } from "../../../models/MessageTemplate";

export interface ISendMessage {
    templateType: TemplateType;
    sendType: SendType;
    sendTo: Array<string>;
    variables: Record<string, any>;
}