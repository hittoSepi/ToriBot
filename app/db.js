/*global process*/

import Loki from 'lokijs';

const DB = {
	Database: undefined,
	init: function(callback) {
		DB.Database = new Loki(process.env.MAIL_DATABASE, {
			autoload: true,
			autoloadCallback: this.databaseInitialize,
			verbose:true,
			autosave: false,
			autosaveInterval: 4000,
			autosaveCallback: () => {
				console.log('autosaved db');
			}
		});

		this.Database.on('loaded', () => {
			callback();
		})
		this.Database.on('init', () => {
			console.log("Database: Init.")
		})
		DB.Database.on('flushChanges', () => {
			console.log("Database Flush.")
		})

		DB.Database.on('changes', () => {
			console.log("Database Change.")
		})
		DB.Database.on('warning', () => {
			console.log("Database WARNING.")
		})
		process.on('SIGINT', function () {
			console.log("Flushing database.");
			DB.Database.close();
			process.exit();
		});

	},
	databaseInitialize: function () {
		var entries = DB.Database.getCollection("mails");
		if (entries === null) {
			entries = DB.Database.addCollection("mails");
		}
	},
	get: function (collection, id) {
		return DB.Database.getCollection(collection).find({id:id})
	},
	insert: function(collection, data) {
		return DB.Database.getCollection(collection).insert(data);
	}
}




export { DB }