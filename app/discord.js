/*global process*/

import { Client, Intents, Constants, MessageEmbed } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9'
import { StatsApi } from './../app/statsApi.js'

import dotenv from 'dotenv'
dotenv.config();

const dev = false

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
				required: true,
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


const createEmbedMessage = (data) => {

	const price = data.price.length > 0  ? data.price : "0 €"
	const desc = data.desc.length > 0 ? data.desc : "Ei kuvausta"

	return new MessageEmbed().setColor('#f94f55')
	.setTitle(data.name)
	.setURL(data.url)
	.setThumbnail('https://d11vpufrumhcpn.cloudfront.net/img/tori_logo.png')
	.addField('Hinta', price, true)
	.setDescription(desc)
	.setImage(data.image)
	.setTimestamp()
}



const timespanToString = (timespan) => {
	switch (timespan) {
		case 'min':
			return 'minuutin'
		case 'hour':
			return 'tunnin'
		case 'day':
			return 'päivän'
		case 'week':
			return 'viikon'
		case 'month':
			return 'kuukauden'
		case 'year':
			return 'vuoden'
	}
}

const createProfitMessage = (data) => {
	return new MessageEmbed().setColor('#037f55')
		.setTitle("Etherium tuotto")
		.setDescription(`${data.mhs}MH/s tuotto ${timespanToString(data.timespan)} ajalle.`)
		.addFields(
			{ name: "ETH", value: data['ETH'].toFixed(5).toString() + " ETH", inline: true },
			{ name: "EUR", value: data['EUR'].toFixed(2).toString() + " €", inline: true }
		)
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
			if (!dev) {
				const guildID = "909912248724631602";
				const guild = this.client.guilds.cache.get(guildID)
				if (guild) {
					const embed = createEmbedMessage(gpu)
					guild.channels.cache.get("909912248724631605").send({ embeds: [embed] })
				}
			}
			else {
				const guildID = "624618019938762752";
				const guild = this.client.guilds.cache.get(guildID)
				if (guild) {
					const embed = createEmbedMessage(gpu)
					guild.channels.cache.get("624618020458725386").send({embeds: [embed]})
				}
			}
		}
	}

	shoutIotechTarjous(offer) {
		if (this.client) {
			if (!dev) {
				const guildID = "909912248724631602";
				const guild = this.client.guilds.cache.get(guildID)
				if (guild) {
					guild.channels.cache.get("912717478931607643").send("Tarjous: " + offer.name + "\n" + offer.href)
				}
			}
			else {
				const guildID = "624618019938762752";
				const guild = this.client.guilds.cache.get(guildID)
				if (guild) {
					guild.channels.cache.get("624618020458725386").send("Tarjous: " + offer.name + "\n" + offer.href)
				}
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

				const mhs = interaction.options._hoistedOptions[0].value
				let results = { mhs: mhs, timespan: "" };
				const profit = await EthStats.CalculateEthProfit(mhs)
				if (interaction.options._hoistedOptions.length > 1) {
					var time = interaction.options._hoistedOptions[1].value

					results['EUR'] = profit['EUR'][time]
					results['ETH'] = profit['ETH'][time]
					results['timespan'] = time
				}
				else {
					results = profit
					results['mhs'] = mhs
				}
				//JSON.stringify(results)
				const profitEmbed = createProfitMessage(results)
				await interaction.reply({embeds:[profitEmbed]} );
			}
		});

		this.client.login(this.options.token);
	}
}

export { Discord }