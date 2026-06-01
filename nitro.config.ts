import { defineConfig } from 'nitro'

export default defineConfig({
    compatibilityDate: 'latest',

    preset: 'bun',

    serverDir: './',

    buildDir: '.nitro',

    imports: {},

    runtimeConfig: {
        discord: {
            token: '',
            clientId: '',
            guildId: '',
            installLink: '',
        },
    },

    storage: {
        kv: {
            driver: 'fs-lite',
            base: './data/kv',
        },
    },

    scheduledTasks: {
        '*/10 * * * *': ['booth:check'],
    },

    openAPI: {},

    experimental: {
        asyncContext: true,
        tasks: true,
    },
})
