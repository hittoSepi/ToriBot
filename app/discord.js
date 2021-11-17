import { Client, Intents } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9'



const defaultOpts = {
	token: "<INSERT BOT TOKEN HERE>", // discord bot token
	clientID: "<INSERT CLIENT ID HERE>",
	checkInterval: 10, // minutes
	channels: [],
	commands: [{
		name: 'latest',
		description: 'Näyttää viimeisin myytävä'
	}]
}

class Discord {
	constructor(options) {
		console.log("[Discord]: Initializing Bot.")
		this.options 	= Object.assign(defaultOpts, options)
		this.client 	= new Client({ intents: [Intents.FLAGS.GUILDS] });
		this.rest 		= new REST({ version: '9' }).setToken(this.options.token);
	}
	async init() {
		await this.buildCommands();
	}
	async buildCommands() {
		const that = this;
		try {
			console.log('[Discord]: Started refreshing application (/) commands.');

			await that.rest.put(
				Routes.applicationCommands(that.options.clientID),
				{ body: that.options.commands },
			);

			console.log('[Discord]: Successfully reloaded application (/) commands.');
		} catch (error) {
			console.error(error);
		}
	}

	shoutGPU(gpu) {
		console.log("[Discord]: New GPU:", gpu)

		if (this.client) {
			const guildID 	= "909912248724631602";
			const guild 	= this.client.guilds.cache.get(guildID)
			if (guild) {
				guild.channels.cache.get("909912248724631605").send("TORISSA UUSI GPU: " + gpu.name)
			}
		}
	}

	connect() {
		console.log("[Discord]: Connecting...")
		const that = this;
		this.client.on('ready', () => {
			console.log(`[Discord]: Logged in as ${that.client.user.tag}!`);
		});

		this.client.on('interactionCreate', async interaction => {
			if (!interaction.isCommand()) return;

			if (interaction.commandName === 'ping') {
				await interaction.reply('Pong!');
			}
		});

		this.client.login(this.options.token);
	}
}

export { Discord }