/* global process */
import puppeteer from 'puppeteer';
import cheerio  from 'cheerio';
import Loki from 'lokijs';

let browser, page;

const iotech_url = 'https://bbs.io-tech.fi'
const blackfriday_tarjoukset_url = `${iotech_url}/forums/black-friday-tarjoukset.105/`;
const hyvat_tarjoukset_url = `${iotech_url}/forums/hyvaet-tarjoukset.100/`;


const IotechDatabase = {
	Database: undefined,
	init: function (callback)  {
		IotechDatabase.Database = new Loki('iotech.db', {
			autoload: true,
			autosave: true,
			autoloadCallback: this.databaseInitialize,
		});

		this.Database.on('loaded', () => {
			console.log("Iotech database loaded.")
			callback();
		})
	},
	databaseInitialize: function () {
		console.log("IOTECH Database init.")
		let entries = IotechDatabase.Database.getCollection("iotech");
		if (entries === null) {
			entries = IotechDatabase.Database.addCollection("iotech");
		}
	},
	get: function (query) {
		return IotechDatabase.Database.getCollection("iotech").find(query)
	},
	insert: function (data) {
		return IotechDatabase.Database.getCollection("iotech").insert(data);
	},
	close: function() {
		console.log("Saving IOTECH database...");
		IotechDatabase.Database.close();
	}


}

const parseResults = async (html) => {
	let results = []
	const $ = cheerio.load(html);

	$('.structItemContainer .js-threadList .structItem-title').children('a').each((idx, element) => {
		if (idx % 2 == 1)
			results.push({ href: iotech_url + element.attribs['href'], name: element.children[0].data })

	});

	return results
}


const Iotech = {
	db: IotechDatabase,
	ready: false,
	newEntryCallback: function () { console.log("Empty callback.")},

	initialize: async (cb = () => { }) => {
		console.log("IOTECH: Init")
		IotechDatabase.init(async function () {
			browser = await puppeteer.launch();
			page = await browser.newPage();

			Iotech.ready = true;
			cb();

		})

	},

	hyvat_tarjoukset: async () => {
		if (Iotech.ready) {
			await page.goto(hyvat_tarjoukset_url);
			const bodyHtml = await page.evaluate(() => document.documentElement.outerHTML);
			return await parseResults(bodyHtml)
		}
		return { error: "not ready" }

	},
	blackfriday_tarjoukset: async () => {
		console.log("IoTech blackfriday_tarjoukset")
		if (Iotech.ready) {
			await page.goto(blackfriday_tarjoukset_url);
			const bodyHtml = await page.evaluate(() => document.documentElement.outerHTML);
			const results = await parseResults(bodyHtml)
			let offers = [];

			results.forEach((entry) => {
				const alreadyExists = IotechDatabase.get(entry)
				if (alreadyExists.length === 0) {
					const dbItem = Iotech.db.insert(entry)
					offers.push(dbItem)
					console.log("NEW ITEM", dbItem)
					Iotech.newEntryCallback(dbItem);
				}

			})

			return offers;
		}
		return {error:"not ready"}

	},
	close: async () => {
		console.log("Closing Iotech daemon..")
		await browser.close();

	}

}


export {Iotech, IotechDatabase}