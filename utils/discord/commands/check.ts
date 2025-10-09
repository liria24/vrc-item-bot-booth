import { createConsola } from 'consola'
import {
    type ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js'

const logger = createConsola({ defaults: { tag: 'check-booth-command' } })

export const checkBoothCommand = {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription(
            'BOOTH の新着 VRChat アイテムを今すぐチェックします'
        ) as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        try {
            logger.info(`Running booth:check task from command by user ${interaction.user.tag}`)

            // タスクを実行
            const { result } = await runTask('booth:check')

            const embed = new EmbedBuilder()
                .setTitle('✅ チェック完了')
                .setDescription('新着アイテムのチェックが完了しました。')
                .setColor(0x43b581)
                .addFields({
                    name: '結果',
                    value: result?.toString() || 'チェック完了',
                    inline: false,
                })
                .setTimestamp()

            await interaction.editReply({ embeds: [embed] })
            logger.success('Booth check task completed successfully')
        } catch (error) {
            logger.error({ error }, 'Failed to run booth:check task')

            const embed = new EmbedBuilder()
                .setTitle('❌ エラーが発生しました')
                .setDescription('チェックの実行中にエラーが発生しました。')
                .setColor(0xf04747)
                .addFields({
                    name: 'エラー詳細',
                    value: error instanceof Error ? error.message : 'Unknown error',
                    inline: false,
                })
                .setTimestamp()

            await interaction.editReply({ embeds: [embed] })
        }
    },
} satisfies DiscordCommand
