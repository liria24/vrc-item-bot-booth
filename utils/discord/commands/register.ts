import { createConsola } from 'consola'
import {
    type ChatInputCommandInteraction,
    MessageFlags,
    PermissionsBitField,
    SlashCommandBuilder,
} from 'discord.js'

const logger = createConsola({ defaults: { tag: 'register-command' } })

const buildResponse = (result: RegisterNotificationChannelResult): string => {
    if (result.success && result.alreadyRegistered) {
        return 'このチャンネルは既に通知先として登録されています。'
    }

    if (result.success) {
        return 'このチャンネルを通知先として登録しました。'
    }

    if (result.conflictChannelId) {
        return `同じサーバーで別のチャンネル <#${result.conflictChannelId}> が登録されています。先に解除してください。`
    }

    return 'チャンネルの登録に失敗しました。'
}

export const registerCommand = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('このチャンネルを通知の送信先として登録します') as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const { guildId, channel, channelId } = interaction

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
            await interaction.editReply('サーバー管理権限を持つユーザーのみが登録できます。')
            return
        }

        try {
            const result = await registerNotificationChannel(guildId, channelId)
            const response = buildResponse(result)

            if (result.success) {
                logger.success(
                    {
                        guildId,
                        channelId,
                        alreadyRegistered: result.alreadyRegistered ?? false,
                        userId: interaction.user.id,
                    },
                    'Registered notification channel',
                )
            } else {
                logger.warn(
                    {
                        guildId,
                        channelId,
                        conflictChannelId: result.conflictChannelId,
                        userId: interaction.user.id,
                    },
                    'Failed to register notification channel due to conflict',
                )
            }

            await interaction.editReply(response)
        } catch (error) {
            logger.error({ error, guildId, channelId }, 'Failed to register notification channel')
            await interaction.editReply('チャンネルの登録中にエラーが発生しました。')
        }
    },
} satisfies DiscordCommand
