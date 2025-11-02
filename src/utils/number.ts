const DEFAULT_LOCALE = 'de-DE';
const DEFAULT_DECIMALS = 2;

export const formatDecimal = (value: number, decimals = DEFAULT_DECIMALS, locale = DEFAULT_LOCALE): string => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(safeValue);
};

export const formatCurrency = (
    value: number,
    currency: string,
    locale = DEFAULT_LOCALE,
    decimals = DEFAULT_DECIMALS,
): string => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(safeValue);
};

export const roundToDecimals = (value: number, decimals = DEFAULT_DECIMALS): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

export const toFixedString = (value: number, decimals = DEFAULT_DECIMALS): string =>
    Number.isFinite(value) ? value.toFixed(decimals) : '';

export const formatPercentage = (value: number, decimals = DEFAULT_DECIMALS): string => toFixedString(value, decimals);

export const normalizeDecimalInput = (value: string): string => (value ?? '').replace(',', '.');

export const parseDecimal = (value: string): number | null => {
    if (!value) {
        return null;
    }

    const normalized = normalizeDecimalInput(value);
    const parsed = parseFloat(normalized);

    return Number.isNaN(parsed) ? null : parsed;
};

export const formatDecimalInput = (value: number, decimals = DEFAULT_DECIMALS): string => {
    if (!Number.isFinite(value)) {
        return '';
    }

    return toFixedString(value, decimals).replace('.', ',');
};
