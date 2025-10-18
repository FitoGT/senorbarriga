import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';

export default function ExchangeRateCard() {
  const { data, isLoading, isError } = useGetCurrentExchangeRate();

  if (isLoading) return <p>Loading exchange rate...</p>;
  if (isError) return <p>Error fetching exchange rate 😥</p>;
  return (
    <div className='p-4 border rounded-lg shadow-md'>
      <p className='text-lg flex items-center gap-2'>
        <img src='https://flagcdn.com/w20/eu.png' alt='EU flag' className='w-5 h-5 rounded-full shadow-sm' />
        &nbsp;<strong>1.00</strong>&nbsp;= &nbsp;
        <strong>{data?.USD?.toFixed(2)}</strong>&nbsp;
        <img src='https://flagcdn.com/w20/us.png' alt='US flag' className='w-5 h-5 rounded-full shadow-sm' />
      </p>
    </div>
  );
}
