import { readFileSync } from 'fs';
import { JWT } from 'google-auth-library';
import { cwd } from 'process'
import { Buffer } from 'buffer'
import path from 'path'

const __dirname = cwd();

const defaultOpts = {
	subjectToSave: "Uusia ilmoituksia hakuvahdissa",		// SAVE MAIL TO DATABASE IF MAIL HAVE THIS SUBJECT
	token_path: "<INSERT TOKEN PATH HERE>",					// FILE TO SAVE AUTH TOKEN
	credentials: "<INSERT CLIENT SECRETS JSON PATH HERE>",	// FILE FROM GOOGLE API SERVICE ACCOUNTS
	subject: "<INSERT TARGET EMAIL WHERE READ MAILS>",		// EMAIL SUBJECT TO TRIGGER DISCORD BOT
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
		this.messages 		= [];
		this.messageCount 	= 0;

		this.authenticate()

		if (this.options.database != undefined) {
			console.log("[MailDaemon]: Database set.")
			this.db = this.options.database
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
		//console.log("[MailDaemon]: Getting Messages.")

		const _self = this;
		_self.messages = [] // clear old message

		const msgList = await this.client.request({ url: ApiUrl.message.list }) // get ids for messages
		const data 	= await msgList;

		let promises = []

		if (data.status == 200) {
			data.data.messages.forEach((msg) => {
				promises.push(ClientRequest(_self.client, { url: ApiUrl.message.get + msg.id }))
			})

			const order = await Promise.all(promises)
			order.forEach((msg, index) => {
				let message = new Message(_self.client, msg.data, index)
				if (message.subject == _self.options.subjectToSave) {
					_self.messages.push(message);
				}
			})

			return _self.messages;
		}

	}

}

export { GMail, Message }