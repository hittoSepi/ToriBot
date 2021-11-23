/*global process */
/*eslint no-unused-vars: 0*/
import  ConsoleStamp  	from 'console-stamp'
import { Discord } 		from './app/discord.js'
import { GMail } 		from './app/gmail.js'
import { DB } from './app/mailDB.js'
import { Iotech, IotechDatabase } from './app/iotech.js'
import jsdom 			from "jsdom"
import dotenv from 'dotenv'

dotenv.config();


const consoleStamp = ConsoleStamp(console, '[HH:MM]')

let bot, mail;

const { JSDOM } = jsdom;

const InitializeDatabase = (cb) => {
	DB.init(cb);
}

const StartDiscordBot = async (callback) => {

	bot = new Discord({
		token: process.env.DISCORD_BOT_TOKEN,
		clientID: process.env.DISCORD_CLIENT_ID,
		channels: ["909912248724631602"],
		connectedCallback: callback

	});
	bot.connect();
}

const MinutesToMillisecond = (minutes) => {
	return 60 * minutes * 1000;
}


const StartMailDaemon = async () => {

	mail = new GMail({
		credentials: process.env.GMAIL_SERVICE_ACCOUNT_FILE,	// FILE FROM GOOGLE API SERVICE ACCOUNTS
		subject: process.env.GMAIL_EMAIL,
		database: DB
	})

	const interval = process.env.GMAIL_CHECK_INTERVAL_MINUTES
	console.log(`[MailDaemon]: Checking mail every ${interval} minutes.`)
	setInterval(async () => {
		await GetMail();
	}, MinutesToMillisecond(interval))

	await GetMail();

}
async function GetMail() {

	console.log("[MailDaemon]: Checking new mails...")
	const messages = await mail.getMessages()
	let newEntrys = 0;

	messages.forEach(msg => {

		let dbObj = DB.get('mails', msg.id)

		if (dbObj.length == 0) {

			const frag = JSDOM.fragment(msg.getContent(true));
			const imageElements = frag.querySelectorAll("td > a > img")
			const linkElements = frag.querySelectorAll("tr > td > a")

			const url = linkElements[0].href.split('?')[0]

			let gpu = { name: "", url: url, image: "" }

			imageElements.forEach((elem, idx) => {
				gpu.name = elem.title;
				gpu.image = elem.src
			})

			newEntrys++;
			bot.shoutGPU(gpu)

			DB.insert('mails', { id: msg.id })
			DB.Database.saveDatabase();

		}
	})

	if(newEntrys > 0)
		console.log(`[MailDaemon]: Found ${newEntrys} messages.`)

}


async function StartIotechDaemon() {


	Iotech.newEntryCallback = function (offerData) {
		bot.shoutIotechTarjous(offerData)
	}

	await Iotech.initialize(async () => {
		console.log("iotech ready.")

		setInterval(async () => {
			await Iotech.blackfriday_tarjoukset()
		}, MinutesToMillisecond(1))

		await Iotech.blackfriday_tarjoukset()
	})
}

async function main() {

	InitializeDatabase(async () => {
		StartDiscordBot(async () => {
			await StartMailDaemon();
			await StartIotechDaemon();
			process.on('SIGINT', function () {
				DB.close();
				Iotech.close();
				IotechDatabase.close();
				console.log("cleanup done.")
				process.exit();
			});

		});
	});

}

main()

