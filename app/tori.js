import * as cheerio from 'cheerio';


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


export class SearchResults {

	constructor(query) {
		this.query = query;
		this.data = []

	}
	addResult(res) {
		this.data.push(res)
	}
}

export class ToriSearch {
		constructor(page, options = {}) {
		this.options = Object.assign({
			db: undefined,
			saveResults: false
		}, options)
		this.page = page;
	}

	async Search(search) {
		const url = this.buildToriSearchUrl(search)
		await this.page.goto(url)
		const bodyHtml = await this.page.evaluate(() => document.documentElement.outerHTML);
		const $ = cheerio.load(bodyHtml)

		let results = new SearchResults(search);

		$(".list_mode_thumb a").each((index, el) => {

			const href 	= $(el).attr('href')
			const title = $(el).find('.li-title').text()
			const price	= $(el).find('.list_price').text().length > 0 ? $(el).find('.list_price').text() : undefined
			const image = $(el).find('.item_image').attr('src')
			const date  = $(el).find('.date_image').text().trim().replaceAll('\t','')

			if (title.length > 0) {
				results.addResult({ href, title, price, image, date })

				if (search.limit) {
					if (index < search.limit-1)
						return true
					else return false
				}
			}

		})
		return results;
	}

	buildToriSearchUrl(search) {
		return `${tori_url}/${search.region}?q=${search.query}&c=${search.category}&com=${search.subcategory}`
	}
}