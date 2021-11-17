import { Client, Intents } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9'



const defaultDiscordOpts = {
	token: "<INSERT BOT TOKEN HERE>", 		// Discord bot token
	clientID: "<INSERT CLIENT ID HERE>",	// Discord client id
	channels: [],
	commands: [{
		name: 'latest',
		description: 'Näyttää viimeisin myytävä'
	}]
}

class Server {
	constructor(server) {
		this.server 	= server;
		this.channels = [];
		this.getChannels();
	}

	getChannels() {
		const _self = this;
		this.server.channels.cache.forEach((channel) => {
			_self.addChannel(channel);
		})
	}
	addChannel(channel) {
		this.channels.push(new Channel(channel))
	}
}

class Channel {
	constructor(options) {
		this.options = options;
	}
}

class Discord {
	constructor(options) {
		console.log("[Discord]: Initializing Bot.")
		this.options 	= Object.assign(defaultDiscordOpts, options)
		this.client 	= new Client({ intents: [Intents.FLAGS.GUILDS] });
		this.rest 		= new REST({ version: '9' }).setToken(this.options.token);
		this.servers 	= [];

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

	updateServerList() {
		const _self = this;
		//let servertext = "[Discord]: Servers:\n\n";
		this.client.guilds.cache.forEach(server => {
			_self.servers.push(new Server(server))
			//servertext += '\t\t  Server: ' + server.name + "\t(id: " + server.id + ")\n"
			//servertext += _self.listChannels(server)
		});
		//console.log(servertext)
	}

	listChannels(server) {
		let channeltext = "\t\t  Channels:\n"
		server.channels.cache.forEach((channel) => {
			if (channel.type == 'GUILD_TEXT')
				channeltext += "\t\t\t" + channel.type + " " + channel.name + "\t(id: " + channel.id + ")\n"
		})
		return channeltext;
		//console.log(channeltext)
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
			that.updateServerList()
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