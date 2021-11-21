/*global process */
/*eslint no-unused-vars: 0*/
import  ConsoleStamp  	from 'console-stamp'
import { Discord } 		from './app/discord.js'
import { GMail } 		from './app/gmail.js'
import { DB } 			from './app/mailDB.js'
import jsdom 			from "jsdom"

import dotenv 			from 'dotenv'
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

			let gpu = { name: "", url: "" }

			imageElements.forEach((elem, idx) => {
				console.log(idx, elem.title)
				gpu.name = elem.title;
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
async function main() {

	InitializeDatabase(async () => {
		StartDiscordBot(() => {
			StartMailDaemon();
		});
	});

}

main()