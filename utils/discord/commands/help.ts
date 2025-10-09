import {
    type ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js'

export const helpCommand = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Bot の使い方とコマンド一覧を表示します') as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const embed = new EmbedBuilder()
            .setTitle('📚 Help')
            .setDescription('この Bot で利用可能なコマンドと情報です。')
            .setColor(0x5865f2)

        // 全ユーザーが使用できるコマンド
        embed.addFields({
            name: '❓ `/help`',
            value: 'このヘルプメッセージを表示します。',
            inline: false,
        })

        embed.addFields({
            name: '🔍 `/check`',
            value: '新着 VRChat アイテムを今すぐチェックします。',
            inline: false,
        })

        embed.addFields({
            name: '📬 `/register`',
            value: '実行したチャンネルを通知の送信先として登録します。',
            inline: false,
        })

        embed.addFields({
            name: '🗑️ `/unregister`',
            value: '実行したチャンネルを通知の送信先から解除します。',
            inline: false,
        })

        embed.addFields({
            name: '\u200b',
            value: '━━━━━━━━━━━━━━━━━━━━━━',
            inline: false,
        })

        embed.addFields({
            name: '🌐 サービス情報',
            value:
                '・**エンドポイント**: https://discord.liria.me\n' +
                '・**ホスティング**: [railway.com](https://railway.com)',
            inline: false,
        })

        embed.setFooter({
            text: 'ご不明な点があれば管理者にお問い合わせください',
        })

        embed.setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    },
} satisfies DiscordCommand

export type HelpCommand = typeof helpCommand
