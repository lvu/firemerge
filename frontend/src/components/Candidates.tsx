import { Table, TableCell, TableRow, TableHead, TableBody } from "@mui/material";
import type { Transaction, TransactionCandidate } from "../types/backend";
import { useQuery } from "@tanstack/react-query";
import { getAccounts, getCategories } from "../services/backend";
import { TransactionTypeLabel } from "./TransactionTypeLabel";

export const Candidates = ({ transaction, setTransaction }: { transaction: Transaction, setTransaction: (transaction: Transaction) => void }) => {
    const { data: categories } = useQuery({
        queryKey: ['global', 'categories'],
        queryFn: () => getCategories(),
        staleTime: Infinity,
    });
    const { data: accounts } = useQuery({
        queryKey: ['global', 'accounts'],
        queryFn: () => getAccounts(),
        staleTime: Infinity,
    });

    const onRowDoubleClick = (candidate: TransactionCandidate) => {
        setTransaction({
            ...transaction,
            type: candidate.type,
            account_id: candidate.account_id,
            category_id: candidate.category_id,
        });
    }

    if (transaction.state !== "new" || !transaction.candidates) {
        return null;
    }
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Account</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {transaction.candidates.map((candidate, index) => (
                    <TableRow
                        key={index}
                        sx={{
                            '&:hover': {
                                bgcolor: 'action.hover',
                            },
                        }}
                        onDoubleClick={() => onRowDoubleClick(candidate)}
                    >
                        <TableCell><TransactionTypeLabel type={candidate.type} /></TableCell>
                        <TableCell>{candidate.description}</TableCell>
                        <TableCell>{categories?.find(c => c.id === candidate.category_id)?.name}</TableCell>
                        <TableCell>{accounts?.find(a => a.id === candidate.account_id)?.name}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}