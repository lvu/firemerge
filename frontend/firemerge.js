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
                descriptions: ref([]),
                inProgress: ref(false),
                selectedFile: ref(null),
                uploading: ref(false),
                sessionInfo: ref({ has_upload: false, transaction_count: 0 }),
                showTaxerPanel: ref(false),
                taxerStartDate: ref(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)), // 3 months ago
                transactionTypes: [
                    {id: "withdrawal", label: "Withdrawal"},
                    {id: "deposit", label: "Deposit"},
                    {id: "transfer-out", label: "Transfer (out)"},
                    {id: "transfer-in", label: "Transfer (in)"},
                ],
                toast: PrimeVue.useToast(),
            }
        },
        methods: {
            async fetch(path, params) {
                try {
                    if (params) {
                        path = path + '?' + new URLSearchParams(params)
                    }
                    const response = await fetch(path);
                    if (!response.ok) {
                        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
                    }
                    return await response.json();
                } catch (error) {
                    this.toast.add({ severity: 'error', summary: 'Error', detail: error, life: 5000 });
                    console.error('Error fetching data:', error);
                }
            },
            async loadAccounts() {
                this.accounts = await this.fetch('/accounts');
                this.accounts.push({id: null, name: null, type: "expense"});
            },
            async loadStaticData() {
                this.inProgress = true;
                try {
                    this.categories = await this.fetch('/categories');
                    this.currencies = await this.fetch('/currencies');
                    await this.loadAccounts();
                    await this.loadSessionInfo();
                    this.toast.add({ severity: 'success', summary: 'Success', detail: "Data loaded", life: 3000 });
                 } finally {
                    this.inProgress = false;
                 }
            },
            async loadSessionInfo() {
                this.sessionInfo = await this.fetch('/session_info');
                if (this.sessionInfo.has_upload && this.assetAccount) {
                    await this.loadTransactions();
                }
            },
            async clearSession() {
                try {
                    await fetch('/clear_session', { method: 'POST' });
                    this.statementTransactions = [];
                    this.transactions = [];
                    this.assetAccount = null;
                    await this.loadSessionInfo();
                    this.toast.add({ severity: 'success', summary: 'Success', detail: "Session cleared", life: 3000 });
                } catch (error) {
                    this.toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 5000 });
                }
            },
            handleFileUpload(event) {
                const file = event.target.files[0];
                if (file && file.type === 'application/pdf') {
                    this.selectedFile = file;
                } else {
                    this.toast.add({ severity: 'error', summary: 'Error', detail: 'Please select a valid PDF file', life: 3000 });
                    this.selectedFile = null;
                }
            },
            async uploadFile() {
                if (!this.selectedFile) return;

                this.uploading = true;
                try {
                    const formData = new FormData();
                    formData.append('statement', this.selectedFile);

                    // Get client timezone
                    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                    const response = await fetch(`/upload?timezone=${encodeURIComponent(timezone)}`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText);
                    }

                    const result = await response.json();
                    this.selectedFile = null;

                    // Reload session info and statement transactions
                    await this.loadSessionInfo();

                    this.toast.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: result.message,
                        life: 5000
                    });

                } catch (error) {
                    this.toast.add({
                        severity: 'error',
                        summary: 'Upload Failed',
                        detail: error.message,
                        life: 5000
                    });
                } finally {
                    this.uploading = false;
                }
            },
            formatFileSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            },
            async searchDescriptions(e) {
                console.log(e);
                this.descriptions = await this.fetch("/descriptions", {"query": e.query, "account_id": this.assetAccount.id});
            },
            async loadTransactions() {
                this.inProgress = true;
                try {
                    this.transactions = (
                        await this.fetch('/transactions', {"account_id": this.assetAccount.id})
                    ).map(this.decodeTransaction);
                    this.toast.add({ severity: 'success', summary: 'Success', detail: "Transactions loaded", life: 3000 });
                } finally {
                    this.inProgress = false;
                }
            },
            async storeTransaction(index) {
                const tr = this.transactions[index];
                tr.inProgress = true;
                try {
                    const resp = await fetch('/transaction', {method: "POST", body: JSON.stringify({
                        account_id: this.assetAccount.id,
                        transaction: this.encodeTransaction(tr),
                    })});
                    if (resp.ok) {
                        this.transactions[index] = this.decodeTransaction(await resp.json());
                        if ((typeof tr.account) === "string")
                            await this.loadAccounts();
                        this.toast.add({ severity: 'success', summary: 'Stored', detail: tr.description, life: 3000 });
                    } else {
                        const err_text = (await resp).text()
                        this.toast.add({ severity: 'error', summary: 'Error', detail: err_text, life: 5000 });
                        console.error(err_text);
                    }
                } finally {
                    tr.inProgress = false;
                }
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
            canStore(tr) {
                return ["new", "enriched", "annotated"].includes(tr.state) && !tr.reconciled;
            },
            async downloadTaxerStatement() {
                if (!this.assetAccount) return;

                try {
                    const startDate = this.taxerStartDate;
                    const url = `/taxer_statement?account_id=${this.assetAccount.id}&start_date=${startDate.toISOString().split('T')[0]}`;

                    // Create a temporary link and trigger download
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `taxer_statement_${this.assetAccount.id}_${startDate.toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    this.toast.add({ severity: 'success', summary: 'Success', detail: 'Taxer statement downloaded', life: 3000 });
                } catch (error) {
                    this.toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 5000 });
                }
            },
            toggleTaxerPanel() {
                this.showTaxerPanel = !this.showTaxerPanel;
            },
            onAccountChange() {
                // Clear transactions when account changes
                this.transactions = [];
                // Auto-load transactions if there's an uploaded statement
                if (this.sessionInfo.has_upload && this.assetAccount) {
                    this.loadTransactions();
                }
            },
            decodeTransaction(tr) {
                return {
                    inProgress: false,
                    id: tr.id,
                    state: tr.state,
                    type: tr.type != "transfer" ? tr.type : (tr.source_id == this.assetAccount.id ? "transfer-out" : "transfer-in"),
                    description: tr.description,
                    amount: tr.amount ? Number(tr.amount) : tr.amount,
                    currency: {id: tr.currency_id, code: tr.currency_code},
                    foreign_amount: tr.foreign_amount ? Number(tr.foreign_amount) : tr.foreign_amount,
                    foreign_currency: {id: tr.foreign_currency_id, code: tr.foreign_currency_code},
                    date: new Date(tr.date),
                    category: {id: tr.category_id, name: tr.category_name},
                    account: tr.type == "withdrawal" || (tr.type == "transfer" && tr.source_id == this.assetAccount.id)
                        ? {id: tr.destination_id, name: tr.destination_name}
                        : {id: tr.source_id, name: tr.source_name},
                    notes: tr.notes,
                    reconciled: tr.reconciled,
                }
            },
            encodeTransaction(tr) {
                const tr_acc = (typeof tr.account) === "string" ? {id: null, name: tr.account} : tr.account;
                const [source_acc, dest_acc] = ["withdrawal", "transfer-out"].includes(tr.type)
                    ? [this.assetAccount, tr_acc] : [tr_acc, this.assetAccount];
                return {
                    id: tr.id,
                    state: tr.state,
                    type: ["transfer-out", "transfer-in"].includes(tr.type) ? "transfer" : tr.type,
                    description: tr.description,
                    amount: tr.amount,
                    currency_id: tr.currency.id,
                    currency_code: tr.currency.code,
                    foreign_amount: tr.foreign_amount,
                    foreign_currency_id: tr.foreign_currency.id,
                    foreign_currency_code: tr.foreign_currency.code,
                    date: tr.date.toISOString(),
                    category_id: tr.category ? tr.category.id : null,
                    category_name: tr.category ? tr.category.name : null,
                    source_id: source_acc.id,
                    source_name: source_acc.name,
                    destination_id: dest_acc.id,
                    destination_name: dest_acc.name,
                    notes: tr.notes,
                }
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
    app.use(PrimeVue.ToastService);
    app.component('autocomplete', PrimeVue.AutoComplete);
    app.component('dropdown', PrimeVue.Select);
    app.component('vbutton', PrimeVue.Button);
    app.component('dataview', PrimeVue.DataView);
    app.component('inputtext', PrimeVue.InputText);
    app.component('inputnumber', PrimeVue.InputNumber);
    app.component('datepicker', PrimeVue.DatePicker);
    app.component('selectbutton', PrimeVue.SelectButton);
    app.component('text-area', PrimeVue.Textarea);
    app.component('toast', PrimeVue.Toast);
    app.component('blockui', PrimeVue.BlockUI);
    app.component('progressspinner', PrimeVue.ProgressSpinner);
    app.mount('#app');
}
