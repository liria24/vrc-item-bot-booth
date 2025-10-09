import { createConsola } from 'consola'
import {
    type ChatInputCommandInteraction,
    MessageFlags,
    PermissionsBitField,
    SlashCommandBuilder,
} from 'discord.js'

const logger = createConsola({ defaults: { tag: 'unregister-command' } })

const buildResponse = (result: UnregisterNotificationChannelResult): string => {
    if (result.success) {
        return 'このチャンネルの通知登録を解除しました。'
    }

    if (result.reason === 'not-found') {
        return 'このサーバーには通知が登録されていません。'
    }

    if (result.reason === 'mismatch') {
        return 'このチャンネルは通知に登録されていません。'
    }

    return 'チャンネルの登録解除に失敗しました。'
}

export const unregisterCommand = {
    data: new SlashCommandBuilder()
        .setName('unregister')
        .setDescription('このチャンネルを通知の送信先から解除します') as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const { guildId, channelId, channel } = interaction

        if (!guildId) {
            await interaction.editReply('サーバー内でのみ使用できるコマンドです。')
            return
        }

        if (!channel || !channel.isTextBased()) {
            await interaction.editReply('テキストチャンネルでのみ実行できます。')
            return
        }

        const memberPermissions = interaction.memberPermissions
        if (memberPermissions && !memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
            await interaction.editReply('サーバー管理権限を持つユーザーのみが解除できます。')
            return
        }

        try {
            const result = await unregisterNotificationChannel(guildId, channelId)
            const response = buildResponse(result)

            if (result.success) {
                logger.success(
                    { guildId, channelId, userId: interaction.user.id },
                    'Unregistered notification channel'
                )
            } else {
                logger.warn(
                    { guildId, channelId, reason: result.reason, userId: interaction.user.id },
                    'Failed to unregister notification channel'
                )
            }

            await interaction.editReply(response)
        } catch (error) {
            logger.error({ error, guildId, channelId }, 'Failed to unregister notification channel')
            await interaction.editReply('チャンネルの登録解除中にエラーが発生しました。')
        }
    },
} satisfies DiscordCommand
