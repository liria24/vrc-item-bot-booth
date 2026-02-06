export default defineNitroConfig({
    compatibilityDate: 'latest',

    preset: 'bun',

    runtimeConfig: {
        discord: {
            token: import.meta.env.DISCORD_TOKEN || '',
            clientId: import.meta.env.DISCORD_CLIENT_ID || '',
            guildId: import.meta.env.DISCORD_GUILD_ID || '',
            installLink: import.meta.env.DISCORD_INSTALL_LINK || '',
        },
        public: {
            appName: 'VRC Item Bot',
        },
    },

    routeRules: {
        '/': { redirect: import.meta.env.DISCORD_INSTALL_LINK || '' },
    },

    storage: {
        kv: {
            driver: 'fs-lite',
            base: import.meta.env.KV_PATH || './data/kv',
        },
    },

    scheduledTasks: {
        '*/10 * * * *': ['booth:check'],
    },

    experimental: {
        asyncContext: true,
        openAPI: true,
        wasm: true,
        tasks: true,
    },
})
