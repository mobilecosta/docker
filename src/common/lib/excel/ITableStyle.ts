interface ICellColor {
    foregroundColor?: string;
    backgroundColor?: string;
}

interface IBorderStyle {
    style: string;
    color?: string
}

export interface ITableStyle {
    header?: {
        font?: {
            name?: string;
            size?: number;
            bold?: boolean;
            color?: string;
        },
        color?: ICellColor;
        border?: IBorderStyle
    };
    rows?: {
        odd?: ICellColor;
        even?: ICellColor;
        border?: IBorderStyle
    }
}