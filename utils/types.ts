import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export interface DiscordCommand {
    data: SlashCommandBuilder
    execute(interaction: ChatInputCommandInteraction): Promise<void>
}

export interface BoothItem {
    id: string
    title: string
    price: string
    shopName: string
    shopUrl: string | null
    url: string
    thumbnailUrl: string | null
}
