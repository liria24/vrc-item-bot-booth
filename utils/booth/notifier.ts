import { createConsola } from 'consola'
import { EmbedBuilder, type TextChannel } from 'discord.js'

const logger = createConsola({ defaults: { tag: 'booth-notifier' } })

const MAX_EMBEDS_PER_MESSAGE = 10
const MESSAGE_DELAY_MS = 1000

/**
 * Helper: Split array into batches
 */
const createBatches = <T>(items: T[], batchSize: number): T[][] => {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize))
    }
    return batches
}

/**
 * Helper: Get text channel with validation
 */
const getTextChannel = async (channelId: string): Promise<TextChannel | null> => {
    const controller = getDiscordBotController()
    if (!controller?.isReady()) {
        logger.warn('Discord bot is not ready, skipping notification')
        return null
    }

    try {
        const channel = await controller.client.channels.fetch(channelId)
        if (!channel?.isTextBased()) {
            logger.error(`Channel ${channelId} not found or not text-based`)
            return null
        }
        return channel as TextChannel
    } catch (error) {
        logger.error({ error }, `Failed to fetch channel ${channelId}`)
        return null
    }
}

const getRegisteredChannelIds = async (): Promise<string[]> => {
    const registrations = await getNotificationChannels()
    const unique = new Set(registrations.map((entry) => entry.channelId))
    return [...unique]
}

const notifyNewItemsForChannel = async (channelId: string, items: BoothItem[]): Promise<void> => {
    if (items.length === 0) {
        logger.info('No new items to notify')
        return
    }

    const textChannel = await getTextChannel(channelId)
    if (!textChannel) return

    try {
        logger.info(`Notifying ${items.length} new items to channel ${channelId}`)

        const batches = createBatches(items, MAX_EMBEDS_PER_MESSAGE)

        for (let i = 0; i < batches.length; i++) {
            const embeds = batches[i].map((item) => createItemEmbed(item))
            await textChannel.send({ embeds })

            if (i < batches.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, MESSAGE_DELAY_MS))
            }
        }

        logger.success(
            `Successfully notified ${items.length} items in ${batches.length} message(s)`
        )
    } catch (error) {
        logger.error({ error, channelId }, 'Failed to notify new items')
    }
}

const notifyNewItemsSummaryForChannel = async (
    channelId: string,
    items: BoothItem[]
): Promise<void> => {
    if (items.length === 0) return

    const textChannel = await getTextChannel(channelId)
    if (!textChannel) return

    try {
        const batches = createBatches(items, MAX_EMBEDS_PER_MESSAGE)

        for (let i = 0; i < batches.length; i++) {
            // ヘッダーテキスト(最初のメッセージのみ)
            let content = ''
            if (i === 0) {
                content = `## BOOTH新着アイテム\nVRChatタグ付き商品が${items.length}件追加されました！`
            } else {
                // 2メッセージ目以降はページ情報を表示
                const startIndex = i * MAX_EMBEDS_PER_MESSAGE + 1
                const endIndex = Math.min((i + 1) * MAX_EMBEDS_PER_MESSAGE, items.length)
                content = `続き (${startIndex}〜${endIndex}件目)`
            }

            // 商品Embedを作成
            const embeds = batches[i].map((item) => createItemEmbed(item))

            await textChannel.send({ content, embeds })

            if (i < batches.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, MESSAGE_DELAY_MS))
            }
        }

        logger.success(`Sent ${items.length} items in ${batches.length} message(s)`)
    } catch (error) {
        logger.error({ error, channelId }, 'Failed to notify summary')
    }
}

const broadcastToRegisteredChannels = async (
    sender: (channelId: string) => Promise<void>
): Promise<void> => {
    const channelIds = await getRegisteredChannelIds()

    if (channelIds.length === 0) {
        logger.warn('No registered notification channels found; skipping broadcast')
        return
    }

    logger.info(`Broadcasting to ${channelIds.length} channel(s)`)

    for (const channelId of channelIds) {
        await sender(channelId)
    }
}

/**
 * 新着商品をDiscordチャンネルに通知
 * 複数のアイテムを1つのメッセージにまとめて送信（最大10個のEmbedまで）
 */
export const notifyNewItems = async (items: BoothItem[]): Promise<void> => {
    await broadcastToRegisteredChannels(async (channelId) => {
        await notifyNewItemsForChannel(channelId, items)
    })
}

/**
 * 新着商品の要約を通知
 * 個別のEmbedとして送信（最大10件まで1メッセージ、それ以上は複数メッセージ）
 */
export const notifyNewItemsSummary = async (items: BoothItem[]): Promise<void> => {
    await broadcastToRegisteredChannels(async (channelId) => {
        await notifyNewItemsSummaryForChannel(channelId, items)
    })
}

/**
 * BoothItemからDiscord Embedを作成
 */
const createItemEmbed = (item: BoothItem): EmbedBuilder => {
    const embed = new EmbedBuilder()
        .setTitle(item.title.substring(0, 256))
        .setURL(item.url)
        .setColor(0xfc4d50)
        .addFields({ name: '価格', value: item.price, inline: true })
        .setTimestamp()

    // ショップ情報をAuthorとして表示
    if (item.shopUrl) {
        embed.setAuthor({ name: item.shopName, url: item.shopUrl })
    } else {
        embed.setAuthor({ name: item.shopName })
    }

    if (item.thumbnailUrl) {
        embed.setImage(item.thumbnailUrl)
    }

    return embed
}

/**
 * テスト通知を送信
 */
export const sendTestNotification = async (channelId?: string): Promise<void> => {
    const testItem: BoothItem = {
        id: 'test',
        title: 'テスト商品',
        price: '¥ 1,000',
        shopName: 'テストショップ',
        shopUrl: 'https://booth.pm',
        url: 'https://booth.pm',
        thumbnailUrl: null,
    }

    if (channelId) {
        await notifyNewItemsForChannel(channelId, [testItem])
        return
    }

    await notifyNewItems([testItem])
}
