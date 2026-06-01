import { type CheerioAPI, load } from 'cheerio'
import { createConsola } from 'consola'

const logger = createConsola({ defaults: { tag: 'booth-scraper' } })

const BOOTH_BASE_URL = 'https://booth.pm'
const BOOTH_VRCHAT_URL = `${BOOTH_BASE_URL}/ja/items?tags%5B%5D=VRChat&sort=new`

export interface BoothScrapeResult {
    items: BoothItem[]
    totalCount: number | null
}

export interface ScrapeOptions {
    maxPages?: number
    itemsPerPage?: number
    fetchFn?: (url: string) => Promise<string | null>
}

const extractTotalItemCount = ($: CheerioAPI): number | null => {
    const candidates = [
        $('b')
            .filter((_, element) => $(element).text().includes('対象商品'))
            .first()
            .text()
            .trim(),
        $('p')
            .filter((_, element) => $(element).text().includes('件あります'))
            .first()
            .text()
            .trim(),
    ].filter((text): text is string => Boolean(text))

    for (const text of candidates) {
        const match = text.match(/([\d,]+)\s*件/)
        if (match) {
            const value = Number(match[1].replace(/[^0-9]/g, ''))
            if (!Number.isNaN(value)) {
                return value
            }
        }
    }

    return null
}

/**
 * Fetch HTML from URL (デフォルト実装)
 */
export const defaultFetchFn = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`)
        }

        return await response.text()
    } catch (error) {
        logger.error({ error }, `Failed to fetch ${url}`)
        return null
    }
}

/**
 * BOOTHのVRChatタグ付き商品ページをスクレイピング
 */
export const scrapeBoothVRChatItems = async (
    options: ScrapeOptions = {},
): Promise<BoothScrapeResult> => {
    const { maxPages = 1, itemsPerPage = 60, fetchFn = defaultFetchFn } = options
    const allItems: BoothItem[] = []
    let totalCount: number | null = null

    try {
        for (let page = 1; page <= maxPages; page++) {
            const url = page === 1 ? BOOTH_VRCHAT_URL : `${BOOTH_VRCHAT_URL}&page=${page}`
            logger.info(`Scraping page ${page}: ${url}`)

            const html = await fetchFn(url)

            if (!html) continue

            const $ = load(html)

            if (totalCount === null) {
                totalCount = extractTotalItemCount($)
            }

            // 商品リストを抽出
            const items: BoothItem[] = []
            const seenIds = new Set<string>()

            // BOOTHの商品カードを検索
            $('li.item-card').each((_, element) => {
                try {
                    const $card = $(element)

                    // 商品IDを取得
                    const itemId = $card.attr('data-product-id')
                    if (!itemId || seenIds.has(itemId)) return
                    seenIds.add(itemId)

                    // タイトルを取得
                    const $titleLink = $card.find(
                        '.item-card__title-anchor--multiline, .item-card__title-anchor',
                    )
                    const title = $titleLink.text().trim()
                    if (!title || title.length < 3) return

                    // 商品URLを取得
                    const itemLink = $titleLink.attr('href')
                    if (!itemLink) return

                    // 価格を取得
                    const priceText = $card
                        .find('.price, .u-tpg-caption2.text-primary400')
                        .text()
                        .trim()
                    const price = priceText || '価格不明'

                    // ショップ名を取得
                    const shopName = $card.find('.item-card__shop-name').text().trim() || 'Unknown'

                    // ショップURLを取得
                    const $shopLink = $card.find('.item-card__shop-name-anchor')
                    const shopLink = $shopLink.attr('href')
                    const shopUrl = shopLink?.startsWith('http')
                        ? shopLink
                        : shopLink
                          ? `${BOOTH_BASE_URL}${shopLink}`
                          : null

                    // サムネイル画像を取得
                    const $thumbnail = $card
                        .find('.item-card__thumbnail-image, .js-thumbnail-image')
                        .first()
                    let thumbnailUrl: string | null = null

                    // data-original属性から取得
                    thumbnailUrl = $thumbnail.attr('data-original') || null

                    // style属性から取得 (クォートあり/なし両方に対応)
                    if (!thumbnailUrl) {
                        const styleAttr = $thumbnail.attr('style')
                        const match = styleAttr?.match(/url\(['""]?(.+?)['""]?\)/)
                        thumbnailUrl = match?.[1] || null
                    }

                    const fullUrl = itemLink.startsWith('http')
                        ? itemLink
                        : `${BOOTH_BASE_URL}${itemLink}`

                    items.push({
                        id: itemId,
                        title: title.substring(0, 256),
                        price,
                        shopName,
                        shopUrl,
                        url: fullUrl,
                        thumbnailUrl,
                    })
                } catch (error) {
                    logger.error({ error }, 'Failed to parse item')
                }
            })

            logger.info(`Found ${items.length} items on page ${page}`)
            allItems.push(...items)

            // ページあたりの商品数が少ない場合は終了
            if (items.length < itemsPerPage / 2) {
                logger.info('Reached end of results')
                break
            }
        }

        return { items: allItems, totalCount }
    } catch (error) {
        logger.error({ error }, 'Failed to scrape BOOTH')
        throw error
    }
}

/**
 * 最新の商品のみを取得（最初のページのみ）
 */
export const getLatestBoothItems = async (limit = 60): Promise<BoothScrapeResult> => {
    const result = await scrapeBoothVRChatItems({ maxPages: 1 })
    return {
        items: result.items.slice(0, limit),
        totalCount: result.totalCount,
    }
}
