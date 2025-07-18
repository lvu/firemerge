import { Autocomplete, TextField } from "@mui/material";
import type { Category, Transaction } from "../types/backend";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../services/backend";

export const CategoryInput = ({ transaction, setTransaction }: { transaction: Transaction, setTransaction: (transaction: Transaction) => void }) => {
    const { data: categories, isLoading } = useQuery<Category[]>({
        queryKey: ['global', 'categories'],
        queryFn: () => getCategories(),
        staleTime: Infinity,
    });
    return <Autocomplete
        options={categories ?? []}
        getOptionLabel={(option) => option.name}
        value={categories?.find(c => c.id === transaction.category_id) ?? { id: -1, name: "" }}
        renderInput={(params) => <TextField {...params} label="Category" />}
        loading={isLoading}
        onChange={(_, value) => setTransaction({ ...transaction, category_id: value?.id })}
    />
}