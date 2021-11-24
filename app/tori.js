import * as cheerio from 'cheerio';
import { Database } from './database.js';

const tori_url = 'https://www.tori.fi'


export const Category = {
	Components: 5038,
}

export const SubCategory = {
	NONE: "",
	GPU: "graphic_card",
	CPU :"processor",
}

export const Region = {
	KokoSuomi: "koko_suomi",
	PaijatHame: "paijat-hame",
}


/**
 * Container for Search results
 */
export class SearchResults {

	constructor(query = undefined) {
		this.query = query;
		this.data = []

	}
	addResult(res) {
		this.data.push(res)
	}
}

/**
 * @description Default ToriSearch options
 * @see ToriSearch
 */
const defaultOptions = {
	newProductCallback: function(item) { }, // Trigger this callback when found new item.

	saveResultsToDatabase: true,
	database: {
		filename: "tori.db",
		collectionName: "tori"
	},
}

/**
  ToriSearch
  @param { Puppeteer.browser }  browser Puppeteer.browser
  @param {*} options class options
  @see {@link defaultOptions}
  @example
	const browser = await pupperteer.launch()
	const options = {saveResultsToDatabase: true, database: { filename: "tori.db", collectionName: "tori" }}
	const toriSearch = new ToriSearch(browser, options)
	await tori.init();
	const searchResults = await toriSearch.Search()

*/
export class ToriSearch {

	/**
	 * @class
	 * @async
	 * @param {Puppeteer.browser} browser Puppeteer.browser
	 * @param {*} options Class options
	 * @see {@link defaultOptions}
	 * @example
	 * const browser = await pupperteer.launch()
	 * const options = {saveResultsToDatabase: true, database: { filename: "tori.db", collectionName: "tori" }}
	 * const toriSearch = new ToriSearch(browser, options)
	 * await tori.init();
	 */
	constructor(browser, options = {}) {
		console.log("[ToriSearch] Constructing.")
		if (browser == undefined || browser === null) {
			throw new Error("ToriSearch: browser undefined")
		}
		this.browser = browser;

		// Overwrite default options
		this.options = Object.assign(defaultOptions, options);

		// Setup database
		if (this.options.saveResultsToDatabase === true) {
			this.database = new Database(this.options.database)
		}

		// SearchResult containers
		this.results 		= new SearchResults();
		this.lastResults 	= undefined;



	}


	/** This triggers when new product is found. */
	newProductCallback()
	{
		console.log("[ToriSearch] New item")
		this.options.newProductCallback();
	}

	/** Initialize Puppeteer browser */
	async init() {

		console.log("[ToriSearch] Init()")
		const _self = this;
		this.page 	= await this.browser.newPage();

		this.page.on('load', function () {
			console.log(`[ToriSearch] Loaded page: ${_self.page.url()}`)
		})

		console.log("[ToriSearch] Init(Done)")
	}

	close() {
		if (this.database != undefined) {
			this.database.close()
		}
	}

	async Search(search) {

		console.log(`[ToriSearch] Search(${JSON.stringify(search)})`)
		const _self = this;

		// Save last results and set new search data
		this.lastResults 	= this.results;
		this.results.data 	= [];
		this.results.query 	= search;

		console.log(`[ToriSearch] Loading SearchPage..`)

		// Build search url and load ToriSearchPage
		await this.page.goto(this.buildToriSearchUrl(search))

		const bodyHtml = await this.page.evaluate(() => document.documentElement.outerHTML)
		const $ = cheerio.load(bodyHtml)

		// Cache last search results
		this.lastResults = this.results;

		// Get all product items from page and and parse product urls
		let urls = [];
		$(".list_mode_thumb a").each(function (idx, el) {
			let id = $(el).attr('id');

			if (id) {
				id = id.split('_')[1]

				if (_self.database != undefined) {
					const exists = _self.database.exists({ id: id })

					if (exists === false) {
						urls.push({ href: $(el).attr('href'), id: id })
					}
				}
				else {
					urls.push({ href: $(el).attr('href'), id: id })
				}
			}

		})


		// Load product pages
		for (let i = 0; i < Math.min(urls.length - 1, search.limit); i++) {
			const resultData = await this.parseDataFromUrl(urls[i].href)
			if(resultData != undefined)
				this.results.data.push(resultData)
		}

		// Save results
		this.saveResultsToDatabase()
	}

	async parseDataFromUrl(url) {

		console.log(`[ToriSearch] parseDataFromUrl( '${url}' )`)
		await this.page.goto(url /*, {waitUntil: 'networkidle0',} */ )

		const html = await this.page.evaluate(() => document.documentElement.outerHTML);
		const $ = cheerio.load(html)

		// Get product ID
		if ($('meta[itemprop="productID"]').length > 0) {
			let id = $('meta[itemprop="productID"]').attr('content').toString().split(':')[1];

			if (id) {
				const resultData = {
					id,
					href: url,
					title: $('.topic h1').text().replaceAll('\n', '').replaceAll('\t', '').trim(),
					price: $('.price span').text().length > 0 ? $('.price span').text().replaceAll('\n', '').replaceAll('\t', '').trim() : undefined,
					image: $('#main_image').attr('src'),
					date: $('.tech_data .value').eq(1).text(),
					desc: $(".body").text().replace('Lisätiedot', '').replaceAll('\n', '').replaceAll('\t', '').trim(),
					seller: $("b.name").text().replaceAll('\n', '').replaceAll('\t', '').trim(),
				}
				return resultData
			}
		}
		return undefined
	}

	saveResultsToDatabase() {
		const _self = this;
		if (this.options.saveResultsToDatabase === true) {

			if (this.results.data.length > 0)
				console.log("[ToriSearch] Adding new items to database..")
			this.results.data.forEach((result) => {
				const exists = _self.database.exists({ id: result.id })
				if (exists === false) {
					console.log(`[ToriSearch] Saving new item: '${result.title}'.`)
					_self.database.insert(result)
					_self.options.newProductCallback(result)

				}
			})
		}
	}

	buildToriSearchUrl(search) {
		return `${tori_url}/${search.region}?q=${search.query}&c=${search.category}&com=${search.subcategory}`
	}
}