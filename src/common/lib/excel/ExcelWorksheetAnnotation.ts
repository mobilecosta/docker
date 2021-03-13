import { ITableStyle } from "./ITableStyle";

export function worksheetName(worksheetName: string, tableStyle?: ITableStyle) {
    return function classDecorator<T extends IConstructor>(constructor: T) {
        return class extends constructor {
            worksheetName = worksheetName;
            tableStyle? = tableStyle;
        };
    }
}

interface IConstructor {
    new(...args: any[]): {};
}