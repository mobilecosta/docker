import { ICellMetadata } from "./ICellMetadata";
import 'reflect-metadata';

export const CELL_PROPERTY_METADA = Symbol('cell_property_metada');

export function cellAnnotation(metadata: ICellMetadata): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
        const allMetadata = Reflect.getMetadata(CELL_PROPERTY_METADA, target) || {};

        allMetadata[propertyKey] = metadata;

        Reflect.defineMetadata(CELL_PROPERTY_METADA, allMetadata, target);
    }
}