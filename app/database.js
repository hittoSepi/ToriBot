import Loki from 'lokijs';

export class Database {
	constructor(options) {
		const _self = this;

		this.options = Object.assign({
			collectionName: "collection",
			filename: 		"database.db",
			verbose: 		false,
			ready_callback: function () { console.log(`[Database] ${_self.options.collectionName} is ready.`) }
		}, options)

		console.log(`[Database] Loading ${JSON.stringify(this.options, true)}.`)


		const loki = new Loki(this.options.filename, {
			autosave: true,
			autoload: true,
			autoloadCallback: function () {
				console.log("autoload")
				let collection = loki.getCollection(_self.options.collectionName);
				if (collection === null) {
					collection = loki.addCollection(_self.options.collectionName);
				}
				_self.collection = collection
			}
		});

		this.db = loki
		loki.on('loaded', () => {
			_self.options.ready_callback();
		})
	}

	get(query) {
		return this.collection.find(query);
	}
	insert(data) {
		const itm = this.collection.insert(data);
		this.db.saveDatabase();
		return itm
	}

	exists(query) {
		return this.collection.count(query) != 0 ? true : false;
	}

	close() {
		console.log(`[Database] ${this.options.collectionName} close.`)
		this.db.saveDatabase();
	}
}

