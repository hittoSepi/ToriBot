/*global process*/

import Loki from 'lokijs';

const DB = {
	Database: undefined,
	init: function(callback) {
		DB.Database = new Loki(process.env.MAIL_DATABASE, {
			autoload: true,
			autosave: true,
			autoloadCallback: this.databaseInitialize,
		});

		this.Database.on('loaded', () => {
			callback();
		})

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
	},
	close: function () {

		console.log("MailDB close")
		DB.Database.close();
	}
}




export { DB }