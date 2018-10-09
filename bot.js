process.env.NTBA_FIX_319 = 1;

var TelegramBot = require('node-telegram-bot-api');
const Agent 	= require('socks5-https-client/lib/Agent')


var emoji = require('node-emoji');
var fs	  = require('fs');
var exec  = require('child_process').exec;
module.exports.fs = fs;
module.exports.emoji = emoji;
module.exports.exec = exec;

var init   = require('./init.js');
var config = require('./config.js');
var edit   = require('./edit.js');
var impex  = require('./impex.js');
module.exports.init = init;
module.exports.config = config;
module.exports.edit = edit;

config.loadConfigurationFile().then(() => {
	config.getDataFolder().then(() => {
		config.checkMode().then(() => {
			start_bot();
		}, error => {
			printSyntax(error);
		}); 
	}, error => {
		printSyntax(error);	
	});
}, error => {
	printSyntax(error);
});

function start_bot(){
	var bot = new TelegramBot(init.TOKEN, {
		polling: true, 
		// request: {
		// 	agentClass: Agent,
		// 	agentOptions: {
		// 		socksHost: init.proxy.host,
		// 		socksPort: parseInt(init.proxy.port),
		// 	   	// If authorization is needed:
		// 	   	// socksUsername: init.proxy.username,
		// 	   	// socksPassword: init.proxy.password
		// 	}
		// }
	});

	bot.on('message', function(msg){
		// Actions to SAVE
		if(edit.edit_actions['add_actions']["userid"+msg.from.id] != undefined){
			var content;
			var content_type;
			if(msg.text != undefined){
				content_type = "text";
				content = msg.text;
			} else if(msg.voice != undefined){
				content_type = "voice";
				content = msg.voice.file_id;
			} else if(msg.sticker != undefined){
				content_type = "sticker";
				content = msg.sticker.file_id;
			} else if(msg.photo != undefined){
				content_type = "photo";
				content = msg.photo[msg.photo.length-1].file_id;
			} else if(msg.video != undefined){
				content_type = "video";
				content = msg.video.file_id;
			} else if(msg.location != undefined){
				content_type = "location";
				content = msg.location.longitude + "_" + msg.location.latitude;
			} else if(msg.document != undefined){
				content_type = "document";
				content = msg.document.file_id;
			} else if(msg.contact != undefined){
				content_type = "contact";
				var name = msg.contact.first_name;
				if(name == '')
					name = msg.contact.last_name;
				content = msg.contact.phone_number + "_" + name;
			}

			edit.edit_actions['add_actions']["userid"+msg.from.id].actions.push({'type':content_type, 'value':content});

			bot.deleteMessage(msg.from.id, edit.edit_actions['add_actions']["userid"+msg.from.id].btn_save_id).then(() => {
				var key = edit.edit_actions['add_actions']["userid"+msg.from.id].catalog;
				var index = init.menu[key].values.indexOf(edit.edit_actions['add_actions']["userid"+msg.from.id].menu_item);
				bot.sendMessage(msg.from.id, init.MSG_ADD_ACTION_REQ, init.options_with_save(init.menu[key].values[index-1], checkAdmins(msg.from), msg.from.id)).then(btn_save => {
					edit.edit_actions['add_actions']["userid"+msg.from.id].btn_save_id = btn_save.message_id;
				});
			});
			return;
		}

		if(msg.text == undefined)
			return;

		/* Start */
		if(msg.text == "/start"){
			bot.sendMessage(msg.from.id, init.MSG_START, init.options(undefined, checkAdmins(msg.from)));
			return edit.reset_variables(msg.from.id);
		}

		/* EXPORT from config to data */
		if(msg.text.indexOf("/export ") == 0 && checkAdmins(msg.from) == 1){
			var file = msg.text.split(' ')[1];
			if(file != undefined && file != "")
				impex.export_configuration(bot, file);
		}

		/* IMPORT from data to config */
		if(msg.text.indexOf("/import ") == 0 && checkAdmins(msg.from) == 1){
			var file = msg.text.split(' ')[1];
			if(file != undefined && file != "")
				impex.import_configuration(bot, file, msg);
		}

		/* Back button */
		if(msg.text.indexOf(emoji.get('arrow_left')+" ") == 0){
			var catalog = msg.text.split(emoji.get('arrow_left')+" ")[1];
			if(init.menu[catalog] != undefined){
				bot.sendMessage(msg.from.id, init.MSG_BACK(catalog), init.options(catalog, checkAdmins(msg.from)));
			}
			return edit.reset_variables(msg.from.id);
		}

		/* Button */
		if(init.menu[msg.text] != undefined){
			var message = init.MSG_DEFAULT;
			
			if(init.menu[msg.text].actions.length > 0)
				sendActions(bot, msg);
			else
				bot.sendMessage(msg.from.id, message, init.options(msg.text, checkAdmins(msg.from)));
			
			return edit.reset_variables(msg.from.id);
		}

		/* Button without action */
		if(init.menu[msg.text.split("|")[0]] != undefined && msg.text.split("|")[1] == "wa"){
			var message = init.MSG_DEFAULT;
			
			bot.sendMessage(msg.from.id, message, init.options(msg.text.split("|")[0], checkAdmins(msg.from)));
			
			return edit.reset_variables(msg.from.id);
		}

		/* Delete menu item */
		if(msg.text.indexOf(emoji.get('heavy_minus_sign')+" ") == 0){
			var key = msg.text.split("delete ")[1].split("|")[0];
			if(checkAdmins(msg.from) == 1){
				var index = msg.text.split("delete ")[1].split("|")[1];
				var item = init.menu[key].values[index-1];
				edit.deleteItem(key, item, index).then(() => {
					bot.sendMessage(msg.from.id, init.MSG_DELETE_ITEM(key, item), init.options(key, checkAdmins(msg.from)));
				}, error => {
					bot.sendMessage(msg.from.id, init.MSG_DELETE_FAIL(key, item, error), init.options(key, checkAdmins(msg.from)));
					bot.sendMessage(msg.from.id, init.MSG_DESYNC, init.options(key, checkAdmins(msg.from)));
				});	
			} else {
				bot.sendMessage(msg.from.id, init.MSG_EDIT_OFF, init.options(key, checkAdmins(msg.from)));
			}
			return edit.reset_variables(msg.from.id);
		}

		/* Add menu item */
		if(msg.text.indexOf(emoji.get('heavy_plus_sign')+" ") == 0){
			var key = msg.text.split("add button to ")[1].split(" ]")[0];
			var message = init.MSG_ADD_ITEM_REQ;
			if(checkAdmins(msg.from) != 1)
				message = init.MSG_EDIT_OFF;
			else
				edit.set_variable('add_item', msg.from.id, { 'catalog': key, 'parrent': init.menu[key].parrent });

			bot.sendMessage(msg.from.id, message, init.options(key, checkAdmins(msg.from)));
			return edit.reset_variables(msg.from.id, 'add_item');
		}

		/* Edit actions menu item */
		if(msg.text.indexOf(emoji.get('writing_hand')+" ") == 0){
			var key = msg.text.split("edit actions answer ")[1].split("|")[0];
			var index = msg.text.split("edit actions answer ")[1].split("|")[1];
			var message = init.MSG_ADD_ACTION_REQ;
			if(checkAdmins(msg.from) != 1)
				message = init.MSG_EDIT_OFF;
			else
				edit.set_variable('add_actions', msg.from.id, { 'catalog': key } );

			bot.sendMessage(msg.from.id, message, init.options_with_save(init.menu[key].values[index-1], checkAdmins(msg.from), msg.from.id)).then(btn_save => { 
				edit.set_variable('add_actions', msg.from.id, { 'catalog': key, 'menu_item': init.menu[key].values[index-1], 'btn_save_id': btn_save.message_id, 'actions': [] });
			});
			return edit.reset_variables(msg.from.id, 'add_actions');
		}

		// Input menu item for add new item
		if(edit.edit_actions.add_item["userid"+msg.from.id]){
			edit.addItem(msg.from.id, msg.text).then(key => {
				bot.sendMessage(msg.from.id, init.MSG_ADD_ITEM(msg.text), init.options(key, checkAdmins(msg.from)));
			}, error => {
				bot.sendMessage(msg.from.id, init.MSG_ADD_FAIL(msg.text, error), init.options(undefined, checkAdmins(msg.from)));
				bot.sendMessage(msg.from.id, init.MSG_DESYNC, init.options(undefined, checkAdmins(msg.from)));
			});	
			
			return edit.reset_variables(msg.from.id);
		}
	});

	bot.on('callback_query', function (msg) {
		if(msg.data.indexOf('Cancel') !== -1 && edit.edit_actions['add_actions']["userid"+msg.from.id] != undefined){
			bot.deleteMessage(msg.from.id, edit.edit_actions['add_actions']["userid"+msg.from.id].btn_save_id).then(() => {
				bot.sendMessage(msg.from.id, init.MSG_EDIT_ITEM_CANC, init.options(edit.edit_actions['add_actions']["userid"+msg.from.id].catalog, checkAdmins(msg.from)));
				edit.reset_variables(msg.from.id); 
			});
		}

		if(msg.data.indexOf('Save') !== -1 && edit.edit_actions['add_actions']["userid"+msg.from.id] != undefined){
			bot.deleteMessage(msg.from.id, edit.edit_actions['add_actions']["userid"+msg.from.id].btn_save_id).then(() => {
				edit.saveActions(msg.from.id).then(() => {
					bot.sendMessage(msg.from.id, init.MSG_EDIT_ITEM(edit.edit_actions['add_actions']["userid"+msg.from.id].menu_item), init.options(edit.edit_actions['add_actions']["userid"+msg.from.id].catalog, checkAdmins(msg.from)));
					edit.reset_variables(msg.from.id); 
				}, error => {
					bot.sendMessage(msg.from.id, init.MSG_EDIT_FAIL(edit.edit_actions['add_actions']["userid"+msg.from.id].menu_item, error), init.options(edit.edit_actions['add_actions']["userid"+msg.from.id].catalog, checkAdmins(msg.from)));
					edit.reset_variables(msg.from.id); 
				});
			});
		}
	});
}

function checkAdmins(from){
	var mode = init.MODE;
	if(init.admins.length > 0 && 
	   init.admins.indexOf(from.id) == -1 && 
	   init.admins.indexOf(from.username) == -1){

		mode = 0;
	}
	
	return mode;
}

function sendActions(bot, msg, _index = 0){
	if(init.menu[msg.text].actions[_index] == undefined)
		return;

	var content = init.menu[msg.text].actions[_index].value;

	if(init.menu[msg.text].actions[_index].type == "text"){
		bot.sendMessage(msg.from.id, content, init.options(msg.text, checkAdmins(msg.from))).then(() => { sendActions(bot, msg, _index+1) });
	} else if(init.menu[msg.text].actions[_index].type == "photo"){
		bot.sendPhoto(msg.from.id, content).then(() => { sendActions(bot, msg, _index+1) }).catch(error => {
			console.log("ERROR", "sendActions", msg.text, init.menu[msg.text].actions[_index].type, error.toString());
		});
	} else if(init.menu[msg.text].actions[_index].type == "voice"){
		bot.sendVoice(msg.from.id, content).then(() => { sendActions(bot, msg, _index+1) }).catch(error => {
			console.log("ERROR", "sendActions", msg.text, init.menu[msg.text].actions[_index].type, error.toString());
		});
	} else if(init.menu[msg.text].actions[_index].type == "sticker"){
		bot.sendSticker(msg.from.id, content).then(() => { sendActions(bot, msg, _index+1) }).catch(error => {
			console.log("ERROR", "sendActions", msg.text, init.menu[msg.text].actions[_index].type, error.toString());
		});
	} else if(init.menu[msg.text].actions[_index].type == "video"){
		bot.sendVideo(msg.from.id, content).then(() => { sendActions(bot, msg, _index+1) }).catch(error => {
			console.log("ERROR", "sendActions", msg.text, init.menu[msg.text].actions[_index].type, error.toString());
		});
	} else if(init.menu[msg.text].actions[_index].type == "location"){
		var longitude_latitude = content.split('_');
		if(longitude_latitude.length < 2){
			console.log("ERROR", "sendActions", msg.text, init.menu[msg.text].actions[_index].type, "BED FORMAT");
			sendActions(bot, msg, _index+1);
			return;
		}

		bot.sendLocation(msg.from.id, longitude_latitude[0], longitude_latitude[1]).then(() => { sendActions(bot, msg, _index+1) }).catch(error => {
			console.log("ERROR", "sendActions", msg.text, error.toString());
		});
	} else if(init.menu[msg.text].actions[_index].type == "document"){
		bot.sendDocument(msg.from.id, content).then(() => { sendActions(bot, msg, _index+1) }).catch(error => {
			console.log("ERROR", "sendActions", msg.text, init.menu[msg.text].actions[_index].type, error.toString());
		});
	} else if(init.menu[msg.text].actions[_index].type == "contact"){
		var phone_name = content.split('_');
		if(phone_name.length < 2){
			console.log("ERROR", "sendActions", msg.text, init.menu[msg.text].actions[_index].type, "BED FORMAT");
			sendActions(bot, msg, _index+1);
			return;
		}

		bot.sendContact(msg.from.id, phone_name[0], phone_name[1]).then(() => { sendActions(bot, msg, _index+1) }).catch(error => {
			console.log("ERROR", "sendActions", msg.text, error.toString());
		});
	}

	return;
}

function printSyntax(message){
	if(message != undefined)
		console.log(message);
	console.log("Syntax: node bot.js menu.file data.folder [mode [username|telegram_id|all]]");
	console.log("\tmenu.file           \t- file with menu catalogs in format:");
	console.log("\t                    \t  parrent"+init.DELIMETER+"catalog"+init.DELIMETER+"menubutton["+init.DELIMETER+"action]");
	console.log("\t                    \t  You can set DELIMETER in init.js");
	console.log("\tdata.folder         \t- path to folder with data for files from menu.file");
	console.log("\tmode                \t- bot mode: \"edit\" for update menu");
	console.log("\tusername|telegram_id\t- username or telegram_id users separated by commas which can edit menu");
	console.log("\t                    \t  if mode=edit without this parameter, all users can edit menu");
	console.log("\t                    \t  You can use \"all\" to all users can edit menu");
}
