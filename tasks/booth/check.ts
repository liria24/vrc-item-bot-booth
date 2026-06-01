import { createConsola } from 'consola'
import { defineTask } from 'nitro/task'

const logger = createConsola({ defaults: { tag: 'booth:check' } })

export default defineTask<string>({
    meta: {
        name: 'booth:check',
        description: 'Check BOOTH for new VRChat items and notify Discord',
    },
    async run() {
        try {
            const controller = getDiscordBotController()
            if (!controller || !controller.isReady()) {
                logger.warn('Discord bot is not ready, skipping check')
                return { result: 'Bot not ready' }
            }

            const registrations = await getNotificationChannels()
            if (registrations.length === 0) {
                logger.warn('No notification channels registered; skipping broadcast')
                return { result: 'No registered channels' }
            }

            logger.info('Checking BOOTH for new VRChat items...')

            // 最新の商品を取得
            const { items, totalCount } = await getLatestBoothItems(60)
            logger.info(`Found ${items.length} items`)
            if (typeof totalCount === 'number') {
                logger.info(`Reported total item count: ${totalCount}`)
            }

            // 既知の商品IDを取得
            const knownIds = await getKnownItemIds()
            logger.info(`Known items: ${knownIds.size}`)

            // 新着商品をフィルタリング
            const newItems = items.filter((item) => !knownIds.has(item.id))

            if (newItems.length > 0) {
                logger.success(`Found ${newItems.length} new items!`)

                // 新着商品を通知
                await notifyNewItemsSummary(newItems)

                // 新しい商品IDを保存
                await addKnownItemIds(newItems.map((item) => item.id))
            } else {
                logger.info('No new items found')
            }

            // 最後のチェック時刻を保存
            await saveLastCheckTime()

            if (typeof totalCount === 'number') {
                await saveTotalItemCount(totalCount)
                await updateBotWatchingStatus(totalCount)
            }

            const responseParts = [`Checked ${items.length} items`, `found ${newItems.length} new`]

            if (typeof totalCount === 'number') {
                responseParts.push(`total ${totalCount}`)
            }

            return { result: responseParts.join(', ') }
        } catch (error) {
            logger.error({ error }, 'Failed to check BOOTH')
            throw error
        }
    },
})
