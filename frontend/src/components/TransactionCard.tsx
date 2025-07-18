import { Box, Chip, Stack, Typography } from "@mui/material";
import type { Account, Transaction as TransactionType } from "../types/backend";
import { useState } from "react";
import { TransactionTypeInput } from "./TransactionTypeInput";
import { DescriptionInput } from "./DescriptionInput";
import { CategoryInput } from "./CategoryInput";
import { AccountInput } from "./AccountInput";
import { Candidates } from "./Candidates";

const dateFormat = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: 'long',
    timeStyle: 'short',
});

export const TransactionCard = ({ initialTransaction, currentAccount }: { initialTransaction: TransactionType, currentAccount: Account }) => {
    const [transaction, setTransaction] = useState<TransactionType>(initialTransaction);
    const chipColor = {
        new: 'info',
        matched: 'text.disabled',
        annotated: 'success',
        unmatched: 'error',
    }[transaction.state];
    return <Stack sx={{
        p: 2,
        bgcolor: 'background.paper',
        boxShadow: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
            bgcolor: 'action.hover',
        },
    }}>
        <Box sx={{ pb: 2 }}>
            <TransactionTypeInput transaction={transaction} setTransaction={setTransaction} />
            <Chip label={transaction.state} color={chipColor} size="medium" sx={{ width: 0.2, mx: 4 }} />
        </Box>
        <Stack direction="row" spacing={2} sx={{ display: 'flex' }}>
            <Stack direction="column" spacing={2} sx={{ flex: 1 }}>
                <Typography variant="h6">{dateFormat.format(Date.parse(transaction.date))}</Typography>
                <DescriptionInput accountId={currentAccount.id} transaction={transaction} setTransaction={setTransaction} />
                <CategoryInput transaction={transaction} setTransaction={setTransaction} />
                <AccountInput transaction={transaction} setTransaction={setTransaction} />
            </Stack>
            <Stack direction="column" spacing={2} sx={{ flex: 1 }}>
                <Typography variant="h6">{transaction.amount}</Typography>
                <Candidates transaction={transaction} setTransaction={setTransaction} />
            </Stack>
        </Stack>
    </Stack>;
}