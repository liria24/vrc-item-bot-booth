export default defineNitroConfig({
    compatibilityDate: '2025-09-29',

    preset: 'node-server',

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
            base: './data/kv',
        },
    },

    imports: {
        imports: [
            {
                name: 'z',
                from: 'zod',
            },
        ],
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
