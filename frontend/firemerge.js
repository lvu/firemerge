onload = (event) => {
    const { createApp, ref } = Vue;

    const app = createApp({
        setup() {
            return {
                assetAccount: ref(null),
                statementTransactions: ref([]),
                transactions: ref([]),
                accounts: ref([]),
                categories: ref([]),
                currencies: ref([]),
                transactionTypes: [
                    {id: "withdrawal", label: "Withdrawal"},
                    {id: "deposit", label: "Deposit"},
                    {id: "transfer-out", label: "Transfer (out)"},
                    {id: "transfer-in", label: "Transfer (in)"},
                ],
            }
        },
        methods: {
            async fetch(path, params) {
                try {
                    if (params) {
                        path = path + '?' + new URLSearchParams(params)
                    }
                    var response = await fetch(path);
                    if (!response.ok) {
                        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
                    }
                    return await response.json();
                } catch (error) {
                    console.error('Error fetching data:', error);
                }
            },
            async loadStaticData() {
                this.statementTransactions = await this.fetch('/statement');
                this.statementTransactions.forEach((tr) => {if (tr.fee) tr.meta.Fee = tr.fee})
                this.accounts = await this.fetch('/accounts');
                this.categories = await this.fetch('/categories');
                this.currencies = await this.fetch('/currencies');
            },
            async loadTransactions() {
                this.transactions = (
                    await this.fetch('/transactions', {"account_id": this.assetAccount.id})
                ).map((tr) => ({
                    active: ["new", "enriched", "annotated"].includes(tr.state),
                    state: tr.state,
                    type: tr.type != "transfer" ? tr.type : (tr.source_id == this.assetAccount.id ? "transfer-out" : "transfer-in"),
                    description: tr.description,
                    amount: tr.amount ? Number(tr.amount) : tr.amount,
                    foreign_amount: tr.foreign_amount ? Number(tr.foreign_amount) : tr.foreign_amount,
                    foreign_currency: {id: tr.foreign_currency_id, code: tr.foreign_currency_code},
                    date: new Date(tr.date),
                    category: {id: tr.category_id, name: tr.category_name},
                    account: tr.type == "withdrawal" || (tr.type == "transfer" && tr.source_id == this.assetAccount.id)
                        ? {id: tr.destination_id, name: tr.destination_name}
                        : {id: tr.source_id, name: tr.source_name},
                    notes: tr.notes,
                }));
            },
            async storeTransactions() {
                this.transactions.filter((tr) => tr.active).forEach((tr) => console.log(tr));
            },
            getAccountTypes(transactionType) {
                switch (transactionType) {
                    case "withdrawal":
                        return ["expense"];
                    case "deposit":
                        return ["revenue"];
                    case "transfer-in":
                    case "transfer-out":
                        return ["asset"];
                }
            },
            getAccounts(accountTypes) {
                return this.accounts.filter((acc) => accountTypes.includes(acc.type));
            },
            getStateClasses(state) {
                return [
                    'inline-block', 'px-3', 'py-1', 'rounded', 'text-white', 'text-sm', 'font-medium',
                    {
                      'bg-teal-500': state === 'annotated',
                      'bg-slate-500': state === 'matched',
                      'bg-green-500': state === 'new',
                      'bg-yellow-500': state === 'unmatched',
                      'bg-blue-500': state === 'enriched',
                    }
                ];
            },
        },
        async mounted() {
            await this.loadStaticData();
        },
    });

    app.use(PrimeVue.Config, {
        theme: {
            preset: PrimeVue.Themes.Aura
        },
        pt: {
            DataView: {
                content: "!bg-slate-50",
            },
        },
    });
    app.component('dropdown', PrimeVue.Select);
    app.component('vbutton', PrimeVue.Button);
    app.component('dataview', PrimeVue.DataView);
    app.component('inputtext', PrimeVue.InputText);
    app.component('inputnumber', PrimeVue.InputNumber);
    app.component('datepicker', PrimeVue.DatePicker);
    app.component('selectbutton', PrimeVue.SelectButton);
    app.component('text-area', PrimeVue.Textarea);
    app.component('toggleswitch', PrimeVue.ToggleSwitch);
    app.mount('#app');
}
