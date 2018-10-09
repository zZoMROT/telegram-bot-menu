var bot = module.parent.exports;

var edit_actions = { 'add_item': [], 'add_actions': [] };
module.exports.edit_actions = edit_actions;

function deleteItem(key, item, index){
	return new Promise(function(ok, fail){
		// delete from menu array
		delete bot.init.menu[bot.init.menu[key].values[index-1]];
		bot.init.menu[key].values.splice(index-1, 1);
		
		// delete from menu.file
		var condition = key + bot.init.DELIMETER + item;
		var sed = "sed -i '/.*" + condition + ".*/d' " + process.argv[2];
		bot.exec(sed, function(error, out, err){
			if(error != null)
				fail(error.toString());
			if(err != "")
				fail(err.toString());
			ok();
		});
	});
}
module.exports.deleteItem = deleteItem;

function addItem(from_id, item){
	return new Promise(function(ok, fail){
		var p_c = edit_actions['add_item']["userid"+from_id];
		if(p_c == undefined)
			fail(bot.init.MSH_NO_CATALOG);
		if(bot.init.menu[p_c.catalog] == undefined)
			fail(bot.init.MSH_NO_CATALOG);

		// add to menu array
		bot.init.menu[p_c.catalog].values.push(item);
		bot.init.menu[item] = { 'values': [], 'parrent': p_c.catalog, 'actions': [] };

		// console.log(p_c, item);
		// add to menu.file 
		var condition = p_c.parrent + bot.init.DELIMETER + p_c.catalog + bot.init.DELIMETER + item;
		var sed = "echo " + condition + " >> " + process.argv[2];
		bot.exec(sed, function(error, out, err){
			if(error != null)
				fail(error.toString());
			if(err != "")
				fail(err.toString());
			ok(p_c.catalog);
		});
	});
}
module.exports.addItem = addItem;

function reset_variables(from_id, until_key){
	var keys = Object.keys(edit_actions);
	for(var i = 0; i < keys.length; i++){
		if(edit_actions[keys[i]]["userid"+from_id] != undefined && keys[i] != until_key){
			delete edit_actions[keys[i]]["userid"+from_id];
		}
	}
}
module.exports.reset_variables = reset_variables;

function set_variable(action, from_id, value){
	edit_actions[action]["userid"+from_id] = value;
}
module.exports.set_variable = set_variable;

function saveActions(from_id){
	return new Promise(function(ok, fail){
		// edit in menu array
		bot.init.menu[edit_actions['add_actions']["userid"+from_id].menu_item].actions = edit_actions['add_actions']["userid"+from_id].actions;
		
		// edit in menu.file
		var config = "";
		for(var i = 0; i < edit_actions['add_actions']["userid"+from_id].actions.length; i++){
			var i_action = Object.assign({}, edit_actions['add_actions']["userid"+from_id].actions[i]);
			i_action.value = i_action.value.replace("\"", "\\\"");
			i_action.value = i_action.value.replace("\n", "\\n");
			config += bot.init.DELIMETER + JSON.stringify(i_action);
		}

		config = config.replace("'", "\\'");
		var sed = "sed -i \"\" 's/\\(.*" + bot.init.DELIMETER + edit_actions['add_actions']["userid"+from_id].catalog + bot.init.DELIMETER + edit_actions['add_actions']["userid"+from_id].menu_item + "\\).*/\\1" + config + "/g' " + process.argv[2];
		bot.exec(sed, function(error, out, err){
			if(error != null)
				fail(error.toString());
			if(err != "")
				fail(err.toString());
			ok();
		});
	});

}
module.exports.saveActions = saveActions;

