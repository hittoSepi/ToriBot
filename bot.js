/*global process */
/*eslint no-unused-vars: 0*/
import  ConsoleStamp  	from 'console-stamp'
import { Discord } 		from './app/discord.js'
import { GMail } 		from './app/gmail.js'
import { DB } from './app/mailDB.js'
import { Iotech, IotechDatabase } from './app/iotech.js'
import jsdom 			from "jsdom"
import dotenv from 'dotenv'
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';


dotenv.config();

const consoleStamp = ConsoleStamp(console, '[HH:MM:ss]')

let bot, mail, browser, IotechPage, ToriPage, ToriSearchPage;

const { JSDOM } = jsdom;


const InitializeDatabase = (cb) => {
	DB.init(cb);
}

const MinutesToMillisecond = (minutes) => {
	return 60 * minutes * 1000;
}


const StartDiscordBot = async (callback) => {

	bot = new Discord({
		token: process.env.DISCORD_BOT_TOKEN,
		clientID: process.env.DISCORD_CLIENT_ID,
		channels: ["909912248724631602"],
		connectedCallback: callback,
		toriSearchPage: ToriSearchPage

	});
	bot.connect();
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

	messages.forEach(async msg => {

		let dbObj = DB.get('mails', msg.id)

		if (dbObj.length == 0) {

			const frag = JSDOM.fragment(msg.getContent(true));
			const imageElements = frag.querySelectorAll("td > a > img")
			const linkElements = frag.querySelectorAll("tr > td > a")

			const url = linkElements[0].href.split('?')[0]

			const toriInfo = await GetToriPage(url)

			let gpu = { name: "", url: url, image: "", price: toriInfo.price, desc: toriInfo.desc }

			imageElements.forEach((elem) => {
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

const GetToriPage = async (url) => {
	await ToriPage.goto(url)
	const bodyHtml = await ToriPage.evaluate(() => document.documentElement.outerHTML);
	const $ = cheerio.load(bodyHtml)

	const price = $(".price").text();
	const body 	= $(".body").text();

	return { price: price.trim(), desc: body.trim() }
}


async function StartIotechDaemon() {


	Iotech.newEntryCallback = function (offerData) {
		bot.shoutIotechTarjous(offerData)
	}

	await Iotech.initialize(IotechPage, async () => {
		console.log("iotech ready.")

		setInterval(async () => {
			await Iotech.blackfriday_tarjoukset()
		}, MinutesToMillisecond(1))

		await Iotech.blackfriday_tarjoukset()
	})
}

import { ToriSearch, Region, Category, SubCategory  } from './app/tori.js'

async function test() {
	browser = await puppeteer.launch();
	ToriPage = await browser.newPage();

	const tori = new ToriSearch(ToriPage)
	const results = await tori.Search({
		query: "",
		region: Region.PaijatHame,
		category: Category.Components,
		subcategory: SubCategory.GPU,
		limit: 5,
	})

	console.log(results)
	//const toriInfo = await GetToriPage('https://www.tori.fi/paijat-hame/Asus_ROG_strix_GTX_1080_8gb_91379905.htm')
	browser.close()
}


async function main() {
	console.log("Starting ToriBot...")
	browser 	= await puppeteer.launch();
	IotechPage 	= await browser.newPage();
	ToriPage 	= await browser.newPage();
	ToriSearchPage 	= await browser.newPage();

	//const toriInfo = await GetToriPage('https://www.tori.fi/paijat-hame/Asus_ROG_strix_GTX_1080_8gb_91379905.htm')


	InitializeDatabase(async () => {
		StartDiscordBot(async () => {
			await StartMailDaemon();
			await StartIotechDaemon();
			process.on('SIGINT', function () {
				DB.close();
				IotechDatabase.close();
				browser.close()
				console.log("Cleanup done, exitting. ")
				process.exit();
			});

		});
	});
}
//test()
main()

