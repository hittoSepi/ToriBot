import { readFileSync } from 'fs';
import { JWT } from 'google-auth-library';
import { cwd } from 'process'
import { Buffer } from 'buffer'
import path from 'path'

const __dirname = cwd();

const defaultOpts = {
	credentials: "<SERVICE ACCOUNT FILE>",	// FILE FROM GOOGLE API SERVICE ACCOUNTS
	triggers: [{
		subject: "Uusia ilmoituksia hakuvahdissa",		// EMAIL SUBJECT TO TRIGGER DISCORD BOT & SAVING MESSAGE ID TO DATABASE

	}],
	scopes: ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.readonly'],
	database: undefined
}

const ApiUrl = {
	message: {
		list: `https://gmail.googleapis.com/gmail/v1/users/me/messages`,
		get: `https://gmail.googleapis.com/gmail/v1/users/me/messages/`
	}
}

const BodyPart = {
	plain: 0,
	html: 1
}

function arraySearch(array, value) {
	for (var i = 0; i < array.length; i++)
		if (array[i].name === value)
			return array[i].value;
	return false;
}

function ClientRequest(client, opts) {
	return client.request(opts);
}

class Message {
	constructor(client, msg, index) {

		this.loaded = false;
		this.index 	= index;
		this.client = client;
		this.id 	= msg.id;
		this.data 	= msg

		this.contentPlain 	= undefined;
		this.contentHtml 	= undefined;
		this.subject 		= undefined;
		this.sender 		= undefined;

		this.parseData()
	}

	getContent(html = false) {
		if (this.loaded) {
			if(!html)
				return this.contentPlain
			else
				return this.contentHtml
		}
		return undefined
	}
	parseData() {
		if (this.data.payload != undefined) {
			this.snippet = this.data.snippet;
			this.subject = arraySearch(this.data.payload.headers, 'Subject')
			this.sender = arraySearch(this.data.payload.headers, 'From').replace(/(<.*>)/, '')

			this.loadPart(BodyPart.plain)
			this.loadPart(BodyPart.html)
		}
		this.loaded = true;
	}


	loadPart(id) {
		if (id == BodyPart.plain) {
			if (this.data.payload) {
				if (this.data.payload.parts)
					this.contentPlain = Buffer.from(this.data.payload.parts[id].body.data, 'base64').toString()
				else {
					this.contentPlain = Buffer.from(this.data.payload.body.data, 'base64').toString()
				}
			}
		}
		else if (id == BodyPart.html) {
			if (this.data.payload) {
				if (this.data.payload.parts)
					this.contentHtml = Buffer.from(this.data.payload.parts[id].body.data, 'base64').toString()
				else {
					this.contentHtml = Buffer.from(this.data.payload.body.data, 'base64').toString()

				}
			}
		}
	}
}


class GMail {
	constructor(opts) {

		console.log("[MailDaemon]: Initializing.")
		this.options 		= Object.assign(defaultOpts, opts)
		this.messages 		= []
		this.messageCount 	= 0

		this.authenticate()

		if (this.options.database != undefined) {
			this.db = this.options.database
			console.log("[MailDaemon]: Database set.")
		}
	}

	async authenticate() {
		setInterval(async () => {
			this.auth(); // REAUTHENTICATE TO GMAIL EVERY HOUR, NOT SURE IF NEEDED
		}, 60 * 60 * 1000)

		this.auth(); // AUTHENTICATE TO GMAIL
	}
	auth() {
		console.log("[MailDaemon]: Authenticating.")
		this.credKeys = JSON.parse(readFileSync(path.join(__dirname, this.options.credentials)))
		this.client = new JWT({
			email: 	this.credKeys.client_email,
			key: 	this.credKeys.private_key,
			scopes: this.options.scopes,
			subject:this.options.subject
		});
		console.log("[MailDaemon]: Authenticated successfully.")
	}
	async getMessages() {
		const _self = this;
		_self.messages = [] // CLEAR OLD MESSAGES

		const msgList 	= await this.client.request({ url: ApiUrl.message.list }) // GET IDS FOR MESSAGES
		const data 		= await msgList;

		let promises = []

		if (data.status == 200) {
			data.data.messages.forEach((msg) => {
				promises.push(ClientRequest(_self.client, { url: ApiUrl.message.get + msg.id })) // GET MESSAGE BODY DATA
			})

			const messages = await Promise.all(promises)

			_self.parseTriggers(messages);
			return _self.messages;
		}

	}
	parseTriggers(messages) {
		const _self = this
		messages.forEach((msg, index) => {
			let message = new Message(_self.client, msg.data, index)
			_self.options.triggers.forEach((trigger) => {
				if (trigger.subject) {
					if (message.subject == trigger.subject) {
						_self.messages.push(message);
					}
				}
			})
		})

	}

}

export { GMail, Message }