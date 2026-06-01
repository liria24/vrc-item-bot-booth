import { useRuntimeConfig } from 'nitro/runtime-config'

export interface DiscordRuntimeConfig {
    token: string
    clientId: string
    guildId?: string
    installLink: string
}

const getEnvironmentValue = (name: string, fallback: string): string => {
    return process.env[name] || fallback
}

export const getDiscordRuntimeConfig = (): DiscordRuntimeConfig => {
    const { discord } = useRuntimeConfig()

    return {
        token: getEnvironmentValue('DISCORD_TOKEN', discord.token),
        clientId: getEnvironmentValue('DISCORD_CLIENT_ID', discord.clientId),
        guildId: getEnvironmentValue('DISCORD_GUILD_ID', discord.guildId) || undefined,
        installLink: getEnvironmentValue('DISCORD_INSTALL_LINK', discord.installLink),
    }
}
