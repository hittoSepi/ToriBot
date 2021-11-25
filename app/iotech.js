
import cheerio  from 'cheerio';
import Loki from 'lokijs';
import * as path from 'path';


const iotech_url = 'https://bbs.io-tech.fi'
const blackfriday_tarjoukset_url = `${iotech_url}/forums/black-friday-tarjoukset.105/`;
const hyvat_tarjoukset_url = `${iotech_url}/forums/hyvaet-tarjoukset.100/`;


const IotechDatabase = {
	Database: undefined,
	init: function (callback) {
		const file = path.join(process.cwd(), path.join("\\database\\", "iotech.db"))

		IotechDatabase.Database = new Loki(file, {
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
	page: undefined,

	newEntryCallback: function () { console.log("Empty callback.")},

	initialize: async (page, cb = () => { }) => {
		console.log("IOTECH: Init")
		Iotech.page = page
		IotechDatabase.init(async function () {
			Iotech.ready = true;
			cb();

		})

	},

	hyvat_tarjoukset: async () => {
		if (Iotech.ready) {
			await Iotech.page.goto(hyvat_tarjoukset_url);
			const bodyHtml = await Iotech.page.evaluate(() => document.documentElement.outerHTML);
			return await parseResults(bodyHtml)
		}
		return { error: "not ready" }

	},
	blackfriday_tarjoukset: async () => {
		console.log("IoTech blackfriday_tarjoukset")
		if (Iotech.ready) {
			await Iotech.page.goto(blackfriday_tarjoukset_url);
			const bodyHtml = await Iotech.page.evaluate(() => document.documentElement.outerHTML);
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

	}

}


export {Iotech, IotechDatabase}