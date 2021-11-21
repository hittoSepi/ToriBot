import axios from 'axios'

class StatsApi {
	constructor(apikey, coin = "ETH", currency = "EUR") {

		this.apiUrl		= `https://min-api.cryptocompare.com/data/`
		this.apikey 	= apikey
		this.coin 		= coin;
		this.currency 	= currency;
		this.instance 	= axios.create()
	}

	async getPrice() {
		return await this.instance.get(`${this.apiUrl}price?fsym=${this.coin}&tsyms=${this.currency}&api_key=${this.apikey}`);
	}
	async getSnapshot() {
		return await this.instance.get(`${this.apiUrl}blockchain/latest?fsym=${this.coin}&api_key=${this.apikey}`);
	}
	async CalculateEthProfit(userMh) {
		console.log(`Calculating ETH profits for ${userMh}Mh/s`)
		const snapshot = await this.getSnapshot()
		const price = await this.getPrice();

		const diff = snapshot.data.Data.difficulty;
		const coinPrice = price.data.EUR

		let earnings = {
			EUR: { min: 0, hour: 0, day: 0, week: 0, month: 0, year: 0 },
			ETH: { min: 0, hour: 0, day: 0, week: 0, month: 0, year: 0 }
		}

		const nethash = (diff / snapshot.data.Data.block_time) / 1e9

		var userRatio = userMh * 1e6 / (nethash * 1e9);
		var blocksPerMin = 60.0 / snapshot.data.Data.block_time;
		var ethPerMin = blocksPerMin * 2;


		earnings.ETH.min = userRatio * ethPerMin;
		earnings.ETH.hour = earnings.ETH.min * 60;
		earnings.ETH.day = earnings.ETH.hour * 24;
		earnings.ETH.week = earnings.ETH.day * 7;
		earnings.ETH.month = earnings.ETH.day * 30;
		earnings.ETH.year = earnings.ETH.day * 365;

		earnings.EUR.min = earnings.ETH.min 	* coinPrice
		earnings.EUR.hour = earnings.ETH.hour 	* coinPrice
		earnings.EUR.day = earnings.ETH.day 	* coinPrice
		earnings.EUR.week = earnings.ETH.week 	* coinPrice
		earnings.EUR.month = earnings.ETH.month * coinPrice
		earnings.EUR.year = earnings.ETH.year 	* coinPrice

		return earnings
	}
}

export {StatsApi}

