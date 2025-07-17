import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/backend';
import { Alert } from '@mui/material';
import type { Account } from '../types/backend';

export const Transactions = ({ currentAccount }: { currentAccount: Account | null }) => {
    const { data: transactions, error } = useQuery({
        queryKey: ['transactions', currentAccount?.id],
        queryFn: () => {
            if (!currentAccount) {
                return null;
            }
            return getTransactions(currentAccount.id);
        },
    });

    if (error) {
        return <Alert severity="error">Error: {error.message}</Alert>;
    }
    if (!transactions) {
        return <Alert severity="info">No transactions found</Alert>;
    }

    return (
        <div>
            <h1>Transactions: {transactions?.length}</h1>
        </div>
    )
}