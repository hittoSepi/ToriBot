/*global process*/

import Loki from 'lokijs';

const DB = {
	Database: undefined,
	init: function(callback) {
		DB.Database = new Loki(process.env.MAIL_DATABASE, {
			autoload: true,
			autosave: false,
			autoloadCallback: this.databaseInitialize,
		});

		this.Database.on('loaded', () => {
			callback();
		})
		process.on('SIGINT', function () {
			console.log("Saving database and exitting...");
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