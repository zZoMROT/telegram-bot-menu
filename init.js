var bot = module.parent.exports;

var MODE = 0;
/*
	MODE:
		0 - default mode with menu
		1 - edit mode with expand menu
*/
var TOKEN = '';
var DELIMETER = ':::';
var DATA_FOLDER;

var buttons = {};
var menu = {};
var menu_root;
var admins = [];

var proxy = {
	'host': '',
	'port': '',
	'username': '',
	'password': ''
}

var MSG_START 			= "Use menu";
var MSG_DEFAULT 		= "Click to button";
var MSG_BACK			= function(key){ return "Back to " + key }
var MSG_DELETE_ITEM 	= function(catalog, name){ return "Item " + name + " was deleted from " + catalog }
var MSG_DELETE_FAIL 	= function(catalog, name, error){ return "When item " + name + " from " + catalog + " deleted there was an error: " + error }
var MSG_ADD_ITEM		= function(name){ return "Item " + name + " was added" }
var MSG_ADD_FAIL 		= function(name, error){ return "When item " + name + " added there was an error: " + error }
var MSG_EDIT_ITEM		= function(name){ return "Item " + name + " was edited" }
var MSG_EDIT_FAIL 		= function(name, error){ return "When item " + name + " edited there was an error: " + error }
var MSG_DESYNC			= "Desync bot and menu.file, restart the bot";
var MSG_EDIT_OFF 		= "Mode edit is off";
var MSG_ADD_ITEM_REQ	= "Input new item name";
var MSH_NO_CATALOG		= "WARNING! No parrent catalog, error in code"; // see: edit.js -> addItem()
var MSG_ADD_ACTION_REQ	= "Input all actions and click to button \"Save\"";
var MSG_EDIT_ITEM_CANC	= "Editing canceled";

/* ---------- BUTTONS ---------- */
var BUTTON = function(key, _mode){
	if(key == undefined){
		key = bot.init.menu_root;
	}

	// if catalog has no items and mode doesn't edit then ignore and only actions
	if(_mode != 1 && menu[key].values.length == 0)
		return;
	
	var btns = [];

	for(var i = 0; i < menu[key].values.length; i++){
		var btns_in_line = [];
		btns_in_line.push({ text: menu[key].values[i] });

		/* EDIT MODE */
		if(_mode == 1){
			btns_in_line.push({ text: menu[key].values[i]+"|wa" }); // without actions
			btns_in_line.push(bot.emoji.get('writing_hand') + " " + "[ edit actions answer " + key + "|" + (i+1) + "|]");
			btns_in_line.push(bot.emoji.get('heavy_minus_sign') + " " + "[ delete " + key + "|" + (i+1) + "|]");
		}
		/* END EDIT MODE */

		btns.push(btns_in_line);
	}
	if(key != bot.init.menu_root){
		var btns_in_line = [{ text: bot.emoji.get('arrow_left') + " " + menu[key].parrent }];
		if(menu[key].parrent != bot.init.menu_root)
			btns_in_line.push({ text: bot.emoji.get('arrow_left') + " " + bot.init.menu_root });

		btns.push(btns_in_line);
	}

	/* EDIT MODE */
	if(_mode == 1){
		btns.push([{ text: bot.emoji.get('heavy_plus_sign') + " " + "[ add button to " + key + " ]"}]);
	}
	/* END EDIT MODE */

	return btns;
}

var options = function(key, _mode) {
	return { reply_markup: JSON.stringify({
			keyboard: BUTTON(key, _mode), 
			resize_keyboard: true
		})
	};
};

var options_with_save = function(key, _mode, from_id) {
	var buttons = [{ text: bot.emoji.get('floppy_disk') + ' Save', callback_data: 'Save|'+key }, 
				   { text: 'Cancel', callback_data: 'Cancel|'+key}];
	if(_mode != 1){
		buttons = [{ text: 'Incorrect mode or button depricated', callback_data: '' }];
	}
	return { reply_markup: JSON.stringify({
			inline_keyboard: [buttons] 
		})
	};

};

/* ----------- EXPORT ----------- */
module.exports.MODE = MODE;
module.exports.TOKEN = TOKEN;
module.exports.DELIMETER = DELIMETER;
module.exports.DATA_FOLDER = DATA_FOLDER;

module.exports.buttons = buttons;
module.exports.menu = menu;
module.exports.menu_root = menu_root;
module.exports.admins = admins;

module.exports.proxy = proxy;

module.exports.MSG_START = MSG_START;
module.exports.MSG_DEFAULT = MSG_DEFAULT;
module.exports.MSG_BACK = MSG_BACK;
module.exports.MSG_DELETE_ITEM = MSG_DELETE_ITEM;
module.exports.MSG_DELETE_FAIL = MSG_DELETE_FAIL;
module.exports.MSG_ADD_ITEM = MSG_ADD_ITEM;
module.exports.MSG_ADD_FAIL = MSG_ADD_FAIL;
module.exports.MSG_EDIT_ITEM = MSG_EDIT_ITEM;
module.exports.MSG_EDIT_FAIL = MSG_EDIT_FAIL;
module.exports.MSG_DESYNC = MSG_DESYNC;
module.exports.MSG_EDIT_OFF = MSG_EDIT_OFF;
module.exports.MSG_ADD_ITEM_REQ = MSG_ADD_ITEM_REQ;
module.exports.MSH_NO_CATALOG = MSH_NO_CATALOG;
module.exports.MSG_ADD_ACTION_REQ = MSG_ADD_ACTION_REQ;
module.exports.MSG_EDIT_ITEM_CANC = MSG_EDIT_ITEM_CANC;

module.exports.BUTTON = BUTTON;
module.exports.options = options;
module.exports.options_with_save = options_with_save;

