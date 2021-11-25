
import Loki from 'lokijs';
import * as path from 'path';

export class Database {
	constructor(options) {
		const _self = this;

		this.options = Object.assign({
			collectionName: "collection",
			filename: "database.db",
			path: "/database/",
			verbose: 		false,
			ready_callback: function () { console.log(`[Database-${_self.options.collectionName}] Ready.`) }
		}, options)

		console.log(`[Database-${_self.options.collectionName}] Loading ${JSON.stringify(this.options, true)}.`)
		const file = path.normalize(path.join(process.cwd(), path.join(this.options.path, this.options.filename)))
		console.log(`[Database-${_self.options.collectionName}] Using file '${file}'.`)

		const loki = new Loki(file, {
			autosave: true,
			autoload: true,
			autoloadCallback: function () {
				let collection = loki.getCollection(_self.options.collectionName);
				if (collection === null) {
					console.warn(`[Database-${_self.options.collectionName}] Collection not found, creating new.`)
					collection = loki.addCollection(_self.options.collectionName);
				}
				_self.collection = collection
			}
		});

		this.db = loki
		loki.on('loaded', () => {
			_self.options.ready_callback();
		})

		loki.on('error', (error) => {
			console.error(`[Loki ERR] ${error}`)
		})
		loki.on('warning', (warn) => {
			console.warn(`[Loki WARN] ${warn}`)
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
		this.db.saveDatabase();
		console.log(`[Database-${_self.options.collectionName}] ${this.options.collectionName} closed.`)
	}
}

