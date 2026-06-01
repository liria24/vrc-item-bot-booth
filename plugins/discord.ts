import { createConsola } from 'consola'
import { definePlugin } from 'nitro'

import { getDiscordRuntimeConfig } from '../utils/discord/runtime-config'

const logger = createConsola({ defaults: { tag: 'discord' } })

const startBot = async (): Promise<DiscordBotController | undefined> => {
    const existingController = getDiscordBotController()

    if (existingController?.isReady()) {
        logger.info('Discord bot is already running. Reusing existing instance.')
        return undefined
    }

    const discord = getDiscordRuntimeConfig()

    if (!discord.token) {
        logger.warn('DISCORD_TOKEN is not set. Discord bot will not be started.')
        return
    }

    if (!discord.clientId) {
        logger.warn('DISCORD_CLIENT_ID is not set. Discord bot will not be started.')
        return
    }

    try {
        try {
            const knownItemsReady = await hasKnownItemKey()
            if (!knownItemsReady) {
                logger.info('Known items key not found; running initial prepare step')
                await prepareKnownItems()
            }
        } catch (prepError) {
            logger.error({ error: prepError }, 'Failed to prepare known items before starting bot')
        }

        const controller = await startDiscordBot({
            token: discord.token,
            clientId: discord.clientId,
            guildId: discord.guildId,
            commands: discordCommands,
        })

        setDiscordBotController(controller)
        return controller
    } catch (error) {
        logger.error({ error }, 'Failed to start Discord bot')
        return undefined
    }
}

export default definePlugin((nitroApp) => {
    const controllerPromise = startBot()

    nitroApp.hooks.hook('close', async () => {
        const controller = await controllerPromise
        if (!controller) return

        await controller.shutdown()
        clearDiscordBotController()
    })
})
