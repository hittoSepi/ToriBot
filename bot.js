/*global process */
/*eslint no-unused-vars: 0*/
import  ConsoleStamp  	from 'console-stamp'
import { Discord } 		from './app/discord.js'
import { GMail } 		from './app/gmail.js'
import { DB } 			from './app/db.js'
import dotenv 			from 'dotenv'
import jsdom 			from "jsdom"

dotenv.config();
const consoleStamp = ConsoleStamp(console, '[HH:MM]')

let bot, mail;

const { JSDOM } = jsdom;

const InitializeDatabase = (cb) => {
	DB.init(cb);
}

const StartDiscordBot = async () => {

	bot = new Discord({
		token: process.env.DISCORD_BOT_TOKEN,
		clientID: process.env.DISCORD_CLIENT_ID,
		channels: ["909912248724631602"]

	});

	bot.init();
	bot.connect();
}

const StartMailDaemon = async () => {

	mail = new GMail({
		token_path: process.env.GMAIL_TOKEN_FILE,	// FILE TO SAVE AUTH TOKEN
		credentials: process.env.GMAIL_ACCESS_FILE,	// FILE FROM GOOGLE API SERVICE ACCOUNTS
		subject: process.env.GMAIL_EMAIL,
		database: DB
	})

	setInterval(async () => {
		await GetMail();
	}, 5*60000)

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

	InitializeDatabase(() => {
		StartMailDaemon();
		StartDiscordBot();
	});

}

main()