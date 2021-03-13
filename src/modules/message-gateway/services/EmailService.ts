import { ISendMessage } from "../interfaces/ISendMessage";
import MessageService from "./MessageService";

class EmailService {
    async sendEmail(sendMessage: ISendMessage) : Promise<void> {
        // TODO
        const nodemailer = require("nodemailer");
       
        var messageBody = await MessageService.getMessage(sendMessage);
        let totxt = sendMessage.sendTo;
        let subtxt = sendMessage.variables['subject'];
        let bodytxt = sendMessage.variables['body'];

        let transporter = nodemailer.createTransport({
            host: "mail.conceitho.com", //"smtp.gmail.com",
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
              user: "mobile@conceitho.com", // generated ethereal user
              pass: "303351@Wag", // generated ethereal password
            },
          });

        // send mail with defined transport object
        let info = await transporter.sendMail({
            from: '"Wf TOTVS" <mobile@conceitho.com>', // sender address
            to: totxt, // list of receivers
            subject: subtxt, // Subject line
            html: bodytxt, // html body
        });

 //text: "Hello world?", // plain text body
    }
}

export default new EmailService();