import ExcelJS from 'exceljs';
import { CELL_PROPERTY_METADA } from './ExcelCellAnnotation';

import { ICellMetadata } from "./ICellMetadata";
import { ITableStyle } from "./ITableStyle";

interface IPropertyCellMetadata {
    property: string,
    cellMetadata: ICellMetadata
}

class Excel {
    async createBufferFile<T>(fileName: string, data: Array<T>): Promise<Buffer> {
        if (data.length === 0) {
            throw new Error('Data can\'t be empty!!!');
        }

        const refData = (data[0] as T & { worksheetName: string, tableStyle?: ITableStyle });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(refData.worksheetName || 'Report');

        const propertiesMetadata = this.getPropertiesMetadata(refData);

        this.loadHeaders(propertiesMetadata, sheet);
        this.loadRows<T>(data, propertiesMetadata, sheet);

        this.setTableStyle(refData.tableStyle, sheet);

        return workbook.xlsx.writeBuffer({
            filename: fileName,
            zip: {
                compression: 'DEFLATE'
            }
        }) as Promise<Buffer>;
    }

    private getPropertiesMetadata<T>(data: T): Array<IPropertyCellMetadata> {
        const metadata = Reflect.getMetadata(CELL_PROPERTY_METADA, data);
        var properties = Object.getOwnPropertyNames(data);

        const propertiesMetadata = new Array<IPropertyCellMetadata>();

        for (let index in properties) {
            const propName = properties[index];
            const propMetadata = metadata[propName];

            if (!propMetadata) {
                continue;
            }

            propertiesMetadata.push({
                property: propName,
                cellMetadata: propMetadata
            })
        }

        return propertiesMetadata.sort((n1, n2) => {
            if (n1.cellMetadata.order > n2.cellMetadata.order) {
                return 1;
            }

            if (n1.cellMetadata.order < n2.cellMetadata.order) {
                return -1;
            }

            return 0;
        });
    }

    private loadHeaders(propertiesMetadata: Array<IPropertyCellMetadata>, sheet: ExcelJS.Worksheet): void {
        const columns = new Array<ExcelJS.Column>();

        propertiesMetadata.forEach(propertyCellMetadata => {
            const cellMetadata = propertyCellMetadata.cellMetadata;
            let columnHeader = {
                header: cellMetadata.headerName,
                key: propertyCellMetadata.property,
                width: cellMetadata.width
            } as ExcelJS.Column;

            if (cellMetadata.numberFormat) {
                columnHeader.style = {
                    numFmt: cellMetadata.numberFormat
                };
            }

            columns.push(columnHeader);
        });

        sheet.columns = columns;
    }

    private loadRows<T>(data: Array<T>, propertiesMetadata: Array<IPropertyCellMetadata>, sheet: ExcelJS.Worksheet): void {
        data.forEach(dataRow => {
            var keys = Object.keys(dataRow);
            let row: any = {};

            keys.forEach(key => {
                const propertyMetadata = propertiesMetadata.find(x => x.property === key);

                if (!propertyMetadata) {
                    return;
                }

                // @ts-ignore
                row[key] = dataRow[key];
            });

            sheet.addRow(row);
        });
    }

    private setTableStyle(tableStyle: ITableStyle | undefined, sheet: ExcelJS.Worksheet): void {
        if (tableStyle === null || tableStyle === undefined) {
            return;
        }

        if (!tableStyle.header || !tableStyle.header.color || !tableStyle.header.font || !tableStyle.header.border ||
            !tableStyle.rows || !tableStyle.rows.even || !tableStyle.rows.odd) {
            return;
        }

        sheet.getRows(1, sheet.rowCount).forEach(row => {
            this.setColumnsStyle(tableStyle, row);
        });
    }

    private setColumnsStyle(tableStyle: ITableStyle, row: ExcelJS.Row) {
        if (row.number === 1) {
            let fill: ExcelJS.Fill;
            let font: ExcelJS.Font;
            let borders: ExcelJS.Borders;

            if (tableStyle.header?.color) {
                fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {
                        argb: tableStyle.header.color.foregroundColor
                    },
                    bgColor: {
                        argb: tableStyle.header.color.backgroundColor
                    }
                } as ExcelJS.Fill;
            }

            if (tableStyle.header?.font) {
                font = {
                    name: tableStyle.header.font.name,
                    size: tableStyle.header.font.size,
                    bold: tableStyle.header.font.bold,
                    color: {
                        argb: tableStyle.header.font.color
                    }
                } as ExcelJS.Font;
            }

            if (tableStyle.header?.border) {
                borders = {
                    top: {
                        style: tableStyle.header.border.style as ExcelJS.BorderStyle,
                        color: {
                            argb: tableStyle.header.border.color
                        }
                    },
                    bottom: {
                        style: tableStyle.header.border.style as ExcelJS.BorderStyle,
                        color: {
                            argb: tableStyle.header.border.color
                        }
                    },
                    left: {
                        style: tableStyle.header.border.style as ExcelJS.BorderStyle,
                        color: {
                            argb: tableStyle.header.border.color
                        }
                    },
                    right: {
                        style: tableStyle.header.border.style as ExcelJS.BorderStyle,
                        color: {
                            argb: tableStyle.header.border.color
                        }
                    },
                    diagonal: {}
                }
            }

            row.eachCell(cell => {
                cell.font = font;
                cell.fill = fill;
                cell.border = borders;
            })
        } else {
            let fill: ExcelJS.Fill;
            let borders: ExcelJS.Borders;

            if (row.number % 2 === 0) {
                fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {
                        argb: tableStyle.rows?.even?.foregroundColor
                    },
                    bgColor: {
                        argb: tableStyle.rows?.even?.backgroundColor
                    }
                } as ExcelJS.Fill;
            } else {
                fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {
                        argb: tableStyle.rows?.odd?.foregroundColor
                    },
                    bgColor: {
                        argb: tableStyle.rows?.odd?.backgroundColor
                    }
                } as ExcelJS.Fill;
            }

            if (tableStyle.rows?.border) {
                borders = {
                    top: {
                        style: tableStyle.rows.border.style as ExcelJS.BorderStyle,
                        color: {
                            argb: tableStyle.rows.border.color
                        }
                    },
                    bottom: {
                        style: tableStyle.rows.border.style as ExcelJS.BorderStyle,
                        color: {
                            argb: tableStyle.rows.border.color
                        }
                    },
                    left: {
                        style: tableStyle.rows.border.style as ExcelJS.BorderStyle,
                        color: {
                            argb: tableStyle.rows.border.color
                        }
                    },
                    right: {
                        style: tableStyle.rows.border.style as ExcelJS.BorderStyle,
                        color: {
                            argb: tableStyle.rows.border.color
                        }
                    },
                    diagonal: {}
                }
            }

            row.eachCell(cell => {
                cell.fill = fill;
                cell.border = borders;
            })
        }
    }
}

export default new Excel();