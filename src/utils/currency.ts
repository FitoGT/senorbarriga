import { Currencies } from '../interfaces';

export type CurrencyRateMap = Partial<Record<Currencies, number>>;

const isFiniteRate = (rate: number | undefined | null): rate is number =>
    typeof rate === 'number' && Number.isFinite(rate) && rate > 0;

const getRate = (currency: Currencies, rates: CurrencyRateMap): number | null => {
    const rate = rates[currency];
    return isFiniteRate(rate) ? rate : null;
};

export const convertCurrency = (
    amount: number,
    fromCurrency: Currencies | null | undefined,
    toCurrency: Currencies,
    rates: CurrencyRateMap,
    base: Currencies = Currencies.EUR,
): number => {
    if (!Number.isFinite(amount)) {
        return 0;
    }

    if (!fromCurrency || fromCurrency === toCurrency) {
        return amount;
    }

    let amountInBase = amount;

    if (fromCurrency !== base) {
        const fromRate = getRate(fromCurrency, rates);
        if (!fromRate) {
            return amount;
        }
        amountInBase = amount / fromRate;
    }

    if (toCurrency === base) {
        return amountInBase;
    }

    const toRate = getRate(toCurrency, rates);
    if (!toRate) {
        return amount;
    }

    return amountInBase * toRate;
};

export const convertToBase = (
    amount: number,
    fromCurrency: Currencies | null | undefined,
    rates: CurrencyRateMap,
    base: Currencies = Currencies.EUR,
): number => convertCurrency(amount, fromCurrency, base, rates, base);

export const convertFromBase = (
    amount: number,
    targetCurrency: Currencies,
    rates: CurrencyRateMap,
    base: Currencies = Currencies.EUR,
): number => convertCurrency(amount, base, targetCurrency, rates, base);

export const convertToEuro = (amount: number, currency: Currencies | null | undefined, rates: CurrencyRateMap) =>
    convertToBase(amount, currency, rates, Currencies.EUR);

export const convertFromEuro = (amount: number, currency: Currencies, rates: CurrencyRateMap) =>
    convertFromBase(amount, currency, rates, Currencies.EUR);

export const needsConversion = (currency: Currencies | null | undefined, base: Currencies = Currencies.EUR): boolean =>
    Boolean(currency && currency !== base);

export const buildRatesMap = (exchange: Partial<Record<string, number>> | undefined): CurrencyRateMap => {
    const map: CurrencyRateMap = { [Currencies.EUR]: 1 };

    if (!exchange) {
        return map;
    }

    Object.entries(exchange).forEach(([code, rate]) => {
        const upperCode = code.toUpperCase();
        switch (upperCode) {
            case Currencies.USD:
                if (isFiniteRate(rate)) {
                    map[Currencies.USD] = rate;
                }
                break;
            case Currencies.EUR:
                if (isFiniteRate(rate)) {
                    map[Currencies.EUR] = rate;
                }
                break;
            default:
                break;
        }
    });

    return map;
};
