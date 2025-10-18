import { EXCHANGE_RATE_KEYS } from '../../constants/query-keys';
import { useQuery } from '@tanstack/react-query';
import { ExchangeRate } from '../../interfaces/ExchangeRate';

export const useGetCurrentExchangeRate = () => {
  return useQuery({
    queryKey: [EXCHANGE_RATE_KEYS.EXCHANGE_RATE],
    queryFn: async (): Promise<ExchangeRate> => {
      const response = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD');
      const data = await response.json();
      return data.rates;
    },
  });
};
