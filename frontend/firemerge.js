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
                    description: tr.description,
                    amount: tr.amount,
                    foreign_amount: tr.foreign_amount,
                    foreign_currency: {id: tr.foreign_currency_id, code: tr.foreign_currency_code},
                    date: new Date(tr.date),
                    type: tr.type != "transfer" ? tr.type : (tr.amunt > 0 ? "transfer-in" : "transfer-out"),
                    category: {id: tr.category_id, name: tr.category_name},
                    account: tr.type == "withdrawal" || (tr.type == "transfer" && tr.amount < 0)
                        ? {id: tr.destination_id, name: tr.destination_name}
                        : {id: tr.source_id, name: tr.source_name},
                    notes: tr.notes,
                }));
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
        },
        async mounted() {
            await this.loadStaticData();
            console.log(this.accounts);
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
    app.mount('#app');
}
