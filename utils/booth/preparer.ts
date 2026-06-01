import { createConsola } from 'consola'

const logger = createConsola({ defaults: { tag: 'booth-prepare' } })

export interface PrepareKnownItemsOptions {
    limit?: number
}

export interface PrepareKnownItemsResult {
    fetched: number
    newlyAdded: number
    knownCount: number
    totalCount: number | null
}

export const prepareKnownItems = async (
    options: PrepareKnownItemsOptions = {},
): Promise<PrepareKnownItemsResult> => {
    const { limit = 60 } = options

    logger.info(`Preparing known items (limit=${limit})`)

    const [knownItemIds, { items, totalCount }, keyExists] = await Promise.all([
        getKnownItemIds(),
        getLatestBoothItems(limit),
        hasKnownItemKey(),
    ])

    let newlyAdded = 0

    for (const item of items) {
        if (!knownItemIds.has(item.id)) {
            knownItemIds.add(item.id)
            newlyAdded += 1
        }
    }

    if (newlyAdded > 0 || !keyExists) {
        await saveKnownItemIds(knownItemIds)
        logger.info(`Registered known items snapshot with ${knownItemIds.size} entries`)
    } else {
        logger.info('Known items already up to date; no changes applied')
    }

    if (typeof totalCount === 'number') {
        await saveTotalItemCount(totalCount)
    }

    return {
        fetched: items.length,
        newlyAdded,
        knownCount: knownItemIds.size,
        totalCount,
    }
}
