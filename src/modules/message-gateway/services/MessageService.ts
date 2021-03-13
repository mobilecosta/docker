import { ISendMessage } from "../interfaces/ISendMessage";

class MessageService {
    async getMessage(sendMessage: ISendMessage): Promise<string> {
        // Recuperar o template
        // Trocar as variáveis

        return ""; // Retorna o template pronto
    }
}

export default new MessageService();