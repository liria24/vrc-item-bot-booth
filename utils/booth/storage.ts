import { createConsola } from 'consola'
import { useStorage } from 'nitro/storage'

const logger = createConsola({ defaults: { tag: 'booth-storage' } })

const KNOWN_ITEMS_KEY = 'booth:known_items'
const LAST_CHECK_KEY = 'booth:last_check'
const TOTAL_ITEMS_KEY = 'booth:total_items'
const NOTIFICATION_CHANNELS_KEY = 'booth:notification_channels'

type NotificationChannelMap = Record<string, string>

export interface NotificationChannelRegistration {
    guildId: string
    channelId: string
}

export interface RegisterNotificationChannelResult {
    success: boolean
    conflictChannelId?: string
    alreadyRegistered?: boolean
}

export interface UnregisterNotificationChannelResult {
    success: boolean
    reason?: 'not-found' | 'mismatch'
}

const readNotificationChannelMap = async (): Promise<NotificationChannelMap> => {
    try {
        const storage = useStorage('kv')
        const data = await storage.getItem<NotificationChannelMap>(NOTIFICATION_CHANNELS_KEY)
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            return data
        }
    } catch (error) {
        logger.error({ error }, 'Failed to read notification channel map')
    }

    return {}
}

const writeNotificationChannelMap = async (map: NotificationChannelMap): Promise<void> => {
    try {
        const storage = useStorage('kv')
        await storage.setItem(NOTIFICATION_CHANNELS_KEY, map)
    } catch (error) {
        logger.error({ error }, 'Failed to write notification channel map')
        throw error
    }
}

export const getNotificationChannels = async (): Promise<NotificationChannelRegistration[]> => {
    const map = await readNotificationChannelMap()
    return Object.entries(map).map(([guildId, channelId]) => ({ guildId, channelId }))
}

export const getNotificationChannelForGuild = async (guildId: string): Promise<string | null> => {
    if (!guildId) return null
    const map = await readNotificationChannelMap()
    const channelId = map[guildId]
    return channelId ?? null
}

export const registerNotificationChannel = async (
    guildId: string,
    channelId: string,
): Promise<RegisterNotificationChannelResult> => {
    if (!guildId || !channelId) {
        throw new Error('guildId and channelId are required')
    }

    const map = await readNotificationChannelMap()
    const existing = map[guildId]

    if (existing) {
        if (existing === channelId) {
            return { success: true, alreadyRegistered: true }
        }

        return { success: false, conflictChannelId: existing }
    }

    map[guildId] = channelId
    await writeNotificationChannelMap(map)

    logger.info({ guildId, channelId }, 'Registered notification channel')
    return { success: true }
}

export const unregisterNotificationChannel = async (
    guildId: string,
    channelId: string,
): Promise<UnregisterNotificationChannelResult> => {
    if (!guildId || !channelId) {
        throw new Error('guildId and channelId are required')
    }

    const map = await readNotificationChannelMap()
    const existing = map[guildId]

    if (!existing) {
        return { success: false, reason: 'not-found' }
    }

    if (existing !== channelId) {
        return { success: false, reason: 'mismatch' }
    }

    Reflect.deleteProperty(map, guildId)
    await writeNotificationChannelMap(map)

    logger.info({ guildId, channelId }, 'Unregistered notification channel')
    return { success: true }
}

/**
 * 既知の商品IDのセットを取得
 */
export const getKnownItemIds = async (): Promise<Set<string>> => {
    try {
        const storage = useStorage('kv')
        const data = await storage.getItem<string[]>(KNOWN_ITEMS_KEY)
        return new Set(data || [])
    } catch (error) {
        logger.error({ error }, 'Failed to get known item IDs')
        return new Set()
    }
}

export const hasKnownItemKey = async (): Promise<boolean> => {
    try {
        const storage = useStorage('kv')
        return await storage.hasItem(KNOWN_ITEMS_KEY)
    } catch (error) {
        logger.error({ error }, 'Failed to check known item key existence')
        return false
    }
}

/**
 * 既知の商品IDを保存
 */
export const saveKnownItemIds = async (itemIds: Set<string>): Promise<void> => {
    try {
        const storage = useStorage('kv')
        await storage.setItem(KNOWN_ITEMS_KEY, Array.from(itemIds))
        logger.info(`Saved ${itemIds.size} known item IDs`)
    } catch (error) {
        logger.error({ error }, 'Failed to save known item IDs')
        throw error
    }
}

/**
 * 新しい商品IDを既知のリストに追加
 */
export const addKnownItemIds = async (newItemIds: string[]): Promise<void> => {
    const knownIds = await getKnownItemIds()
    for (const id of newItemIds) {
        knownIds.add(id)
    }
    await saveKnownItemIds(knownIds)
}

/**
 * 最後のチェック時刻を取得
 */
export const getLastCheckTime = async (): Promise<Date | null> => {
    try {
        const storage = useStorage('kv')
        const timestamp = await storage.getItem<number>(LAST_CHECK_KEY)
        return timestamp ? new Date(timestamp) : null
    } catch (error) {
        logger.error({ error }, 'Failed to get last check time')
        return null
    }
}

/**
 * 最後のチェック時刻を保存
 */
export const saveLastCheckTime = async (time: Date = new Date()): Promise<void> => {
    try {
        const storage = useStorage('kv')
        await storage.setItem(LAST_CHECK_KEY, time.getTime())
        logger.info(`Saved last check time: ${time.toISOString()}`)
    } catch (error) {
        logger.error({ error }, 'Failed to save last check time')
        throw error
    }
}

/**
 * 総アイテム数を取得
 */
export const getTotalItemCount = async (): Promise<number | null> => {
    try {
        const storage = useStorage('kv')
        const count = await storage.getItem<number>(TOTAL_ITEMS_KEY)
        return typeof count === 'number' ? count : null
    } catch (error) {
        logger.error({ error }, 'Failed to get total item count')
        return null
    }
}

/**
 * 総アイテム数を保存
 */
export const saveTotalItemCount = async (count: number): Promise<void> => {
    if (!Number.isFinite(count) || count < 0) {
        throw new Error('Total item count must be a non-negative finite number')
    }

    try {
        const storage = useStorage('kv')
        await storage.setItem(TOTAL_ITEMS_KEY, count)
        logger.info(`Saved total item count: ${count}`)
    } catch (error) {
        logger.error({ error }, 'Failed to save total item count')
        throw error
    }
}

/**
 * 既知の商品数を取得
 */
export const getKnownItemCount = async (): Promise<number> => {
    const knownIds = await getKnownItemIds()
    return knownIds.size
}

/**
 * 古い商品IDをクリーンアップ（最新のN件のみ保持）
 */
export const cleanupOldItems = async (keepCount = 1000): Promise<void> => {
    try {
        const storage = useStorage('kv')
        const data = await storage.getItem<string[]>(KNOWN_ITEMS_KEY)
        if (!data || data.length <= keepCount) {
            return
        }

        // 最新のN件のみ保持
        const newData = data.slice(-keepCount)
        await storage.setItem(KNOWN_ITEMS_KEY, newData)
        logger.info(`Cleaned up old items: ${data.length} -> ${newData.length}`)
    } catch (error) {
        logger.error({ error }, 'Failed to cleanup old items')
    }
}
