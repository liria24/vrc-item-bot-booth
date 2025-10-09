import { createConsola } from 'consola'
import {
    ActivityType,
    type ChatInputCommandInteraction,
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    MessageFlags,
    REST,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
    Routes,
    type Snowflake,
} from 'discord.js'

const logger = createConsola({ defaults: { tag: 'discord' } })

export interface DiscordBotOptions {
    token: string
    clientId: Snowflake
    guildId?: Snowflake
    commands: DiscordCommand[]
}

export interface DiscordBotController {
    client: Client
    isReady: () => boolean
    shutdown: () => Promise<void>
}

let discordBotController: DiscordBotController | undefined

export const getDiscordBotController = (): DiscordBotController | undefined => discordBotController

export const setDiscordBotController = (controller: DiscordBotController): void => {
    discordBotController = controller
}

export const clearDiscordBotController = (): void => {
    discordBotController = undefined
}

const formatWatchingStatus = (count: number | null): string => {
    if (typeof count === 'number' && Number.isFinite(count)) {
        const formatted = count.toLocaleString('ja-JP')
        return `${formatted} 件のアイテムを監視中`
    }

    return 'BOOTH アイテムを監視中'
}

const setClientPresence = (client: Client, count: number | null): void => {
    const activityName = formatWatchingStatus(count)

    if (!client.user) {
        logger.warn('Cannot set presence before client user is available')
        return
    }

    client.user.setPresence({
        activities: [
            {
                name: activityName,
                type: ActivityType.Custom,
                state: activityName,
            },
        ],
        status: 'online',
    })
    logger.info(`Updated bot presence: ${activityName}`)
}

export const updateBotWatchingStatus = async (count: number | null): Promise<void> => {
    const controller = getDiscordBotController()
    if (!controller?.isReady()) {
        logger.debug('Discord bot is not ready; skipping presence update')
        return
    }

    setClientPresence(controller.client, count)
}

const registerSlashCommands = async (options: DiscordBotOptions): Promise<void> => {
    const { token, clientId, guildId, commands } = options
    const rest = new REST({ version: '10' }).setToken(token)

    const slashPayload: RESTPostAPIChatInputApplicationCommandsJSONBody[] = commands.map(
        (command) => command.data.toJSON()
    )

    const route = guildId
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId)

    logger.log(
        `Registering ${slashPayload.length} slash command(s) on ${
            guildId ? `guild ${guildId}` : 'global scope'
        }`
    )

    await rest.put(route, { body: slashPayload })
    logger.success('Slash commands registered successfully')
}

const createInteractionHandler = (
    commandMap: Collection<string, DiscordCommand>
): ((interaction: ChatInputCommandInteraction) => Promise<void>) => {
    return async (interaction: ChatInputCommandInteraction) => {
        const command = commandMap.get(interaction.commandName)

        if (!command) {
            logger.warn(`Received interaction for unknown command: ${interaction.commandName}`)
            await interaction.reply({
                content: 'This command is not available anymore.',
                flags: MessageFlags.Ephemeral,
            })
            return
        }

        try {
            logger.info(
                {
                    command: interaction.commandName,
                    userId: interaction.user.id,
                    userTag: interaction.user.tag,
                    guildId: interaction.guildId,
                    channelId: interaction.channelId,
                },
                'Slash command invoked'
            )
            await command.execute(interaction)
        } catch (error) {
            logger.error({ error }, `Error while executing command ${interaction.commandName}`)

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'コマンド実行中にエラーが発生しました。',
                    flags: MessageFlags.Ephemeral,
                })
            } else {
                await interaction.reply({
                    content: 'コマンド実行中にエラーが発生しました。',
                    flags: MessageFlags.Ephemeral,
                })
            }
        }
    }
}

export const startDiscordBot = async (
    options: DiscordBotOptions
): Promise<DiscordBotController> => {
    const { token, commands } = options

    if (!commands.length) {
        throw new Error('At least one Discord command must be provided.')
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] })

    const commandMap = new Collection<string, DiscordCommand>()
    for (const command of commands) {
        commandMap.set(command.data.name, command)
    }

    client.once(Events.ClientReady, async (readyClient) => {
        logger.success(`Bot logged in as ${readyClient.user.tag}`)

        try {
            const storedCount = await getTotalItemCount()
            setClientPresence(readyClient, storedCount)

            if (storedCount === null) {
                logger.info('Total item count not found; running initial booth:check task')
                try {
                    await runTask('booth:check')
                } catch (taskError) {
                    logger.error({ error: taskError }, 'Failed to run initial booth:check task')
                }
            }
        } catch (error) {
            logger.error({ error }, 'Failed to initialize bot presence')
        }
    })

    const interactionHandler = createInteractionHandler(commandMap)

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isChatInputCommand()) {
            await interactionHandler(interaction)
            return
        }
    })

    try {
        await registerSlashCommands(options)
    } catch (error) {
        logger.error({ error }, 'Failed to register slash commands')
        throw error
    }

    logger.info('Logging in to Discord API…')
    await client.login(token)

    return {
        client,
        isReady: () => client.isReady(),
        async shutdown() {
            logger.info('Shutting down Discord bot')
            await client.destroy()
        },
    }
}
