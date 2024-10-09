onload = (event) => {
    const { createApp, ref } = Vue;

    const app = createApp({
        setup() {
            return {
                items: ref([]),
                config: ref({assetAccount: {}}),
                accounts: ref([]),
            }
        },
        methods: {
            async fetchData() {
                try {
                    var response = await fetch('/statement');
                    this.items = await response.json();
                    response = await fetch('/accounts');
                    this.accounts = await response.json();
                    response = await fetch('/config');
                    this.config = await response.json();
                } catch (error) {
                    console.error('Error fetching data:', error);
                }
            },
            async saveConfig() {
                const response = await fetch('/config', {
                    method: "POST",
                    body: JSON.stringify(this.config),
                });
                if (!response.ok) {
                    throw new Error(await response.text());
                }
            }
        },
        async mounted() {
            await this.fetchData();
            console.log(this.accounts);
        },
    });

    app.use(PrimeVue.Config, {
        theme: {
            preset: PrimeVue.Themes.Aura
        }
    });
    app.component('tabs', PrimeVue.Tabs);
    app.component('tab', PrimeVue.Tab);
    app.component('tablist', PrimeVue.TabList);
    app.component('tabpanels', PrimeVue.TabPanels);
    app.component('tabpanel', PrimeVue.TabPanel);
    app.component('dropdown', PrimeVue.Select);
    app.component('vbutton', PrimeVue.Button);
    app.mount('#app');
}
