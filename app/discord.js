/*global process*/

import { Client, Intents, Constants } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9'
import { StatsApi } from './../app/statsApi.js'

import dotenv from 'dotenv'
dotenv.config();


const EthStats = new StatsApi(process.env.CPYPTOCOMPARE_API, "ETH", "EUR")

const defaultDiscordOpts = {
	token: "<INSERT BOT TOKEN HERE>", 		// Discord bot token
	clientID: "<INSERT CLIENT ID HERE>",	// Discord client id
	channels: [],
	connectedCallback: function() {},
	commands: [{
		name: 'profit',
		type: 1,
		description: 'Laskee ETH tuoton megahasheille.\nKäyttö: /profit <mh/s>',
		options: [
			{
				name: "mhs",
				description: "Megahäshien määrä.",
				type: 4,
				required: true
			},
			{
				name: "aika",
				description: "Tuoton aikaväli",
				type: 3,
				required: false,
				choices: [
					{
						name: "Minuutti",
						value: "min",
					},{
						name: "Tunti",
						value: "hour",
					}, {
						name: "Päivä",
						value: "day",
					}, {
						name: "Viikko",
						value: "week",
					}, {
						name: "Kuukausi",
						value: "month",
					}, {
						name: "Vuosi",
						value: "year",
					}
				]
			}
		]
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
		this.client.guilds.cache.forEach(server => {
			_self.servers.push(new Server(server))
		});
	}

	shoutGPU(gpu) {
		console.log("[Discord]: New GPU:", gpu)

		if (this.client) {
			const guildID 	= "909912248724631602";
			const guild 	= this.client.guilds.cache.get(guildID)
			if (guild) {
				guild.channels.cache.get("909912248724631605").send("Uusi GPU: " + gpu.name)
			}
		}
	}

	shoutIotechTarjous(offer) {
		if (this.client) {
			const guildID = "909912248724631602";
			const guild = this.client.guilds.cache.get(guildID)
			if (guild) {
				guild.channels.cache.get("912717478931607643").send("Tarjous: " + offer.name + "\n" + offer.href)
			}
		}
	}

	connect() {
		console.log("[Discord]: Connecting...")
		const that = this;
		this.client.on('ready', async () => {
			console.log(`[Discord]: Logged in as ${that.client.user.tag}!`);
			await that.init()
			await that.updateServerList()
			that.options.connectedCallback();
		});

		this.client.on('interactionCreate', async interaction => {
			if (!interaction.isCommand()) return;

			if (interaction.commandName === 'profit') {
				let results = {};
				console.log(interaction.options)
				const profit = await EthStats.CalculateEthProfit(interaction.options._hoistedOptions[0].value)
				if (interaction.options._hoistedOptions.length > 1) {
					var time = interaction.options._hoistedOptions[1].value
					results['EUR'] = profit['EUR'][time]
					results['ETH'] = profit['ETH'][time]
				}
				else {
					results = profit
				}
				await interaction.reply(JSON.stringify(results));
			}
		});

		this.client.login(this.options.token);
	}
}

export { Discord }