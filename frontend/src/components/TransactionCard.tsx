import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { Account, Transaction } from "../types/backend";
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

export const TransactionCard = ({ initialTransaction, currentAccount }: { initialTransaction: Transaction, currentAccount: Account }) => {
    const [transaction, setTransaction] = useState<Transaction>(initialTransaction);
    const theme = useTheme();
    const chipColor = {
        new: theme.palette.info.main,
        matched: theme.palette.text.secondary,
        annotated: theme.palette.success.main,
        unmatched: theme.palette.warning.main,
    }[transaction.state];
    return <Stack sx={{
        p: 2,
        bgcolor: 'background.paper',
        boxShadow: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: alpha(chipColor, 0.1),
    }}>
        <Box sx={{ pb: 2 }}>
            <TransactionTypeInput transaction={transaction} setTransaction={setTransaction} />
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