import { defineHandler } from 'nitro'
import { redirect } from 'nitro/h3'

import { getDiscordRuntimeConfig } from '../utils/discord/runtime-config'

export default defineHandler(() => {
    const { installLink } = getDiscordRuntimeConfig()
    return redirect(installLink || '/health')
})
