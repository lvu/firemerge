import { Autocomplete, TextField } from "@mui/material";
import type { Transaction } from "../types/backend";
import { searchDescriptions } from "../services/backend";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";

export const DescriptionInput = ({ accountId, transaction, setTransaction }: { accountId: number, transaction: Transaction, setTransaction: (transaction: Transaction) => void }) => {
    const [partialDescription, setPartialDescription] = useState<string>("");
    const debouncedDescription = useDebounce(partialDescription, 500);
    const { data: options, isLoading } = useQuery({
        queryKey: ['descriptions', accountId, partialDescription],
        queryFn: () => searchDescriptions(accountId, partialDescription),
        enabled: debouncedDescription?.length > 2,
    });
    return <Autocomplete
        freeSolo
        value={transaction.description ?? ""}
        options={options ?? []}
        renderInput={(params) => <TextField {...params} label="Description" />}
        loading={isLoading}
        onInputChange={(_, value) => setPartialDescription(value)}
        onChange={(_, value) => setTransaction({ ...transaction, description: value ?? "" })}
    />
}