var bot = module.parent.exports;

const IMPEX_EXPORT = 0;
const IMPEX_IMPORT = 1;

function export_configuration(telegram, filename){
	// clear export file
	clearFile(filename);

	// fill export file
	generateNewFile(IMPEX_EXPORT, telegram, filename);
	
}
module.exports.export_configuration = export_configuration;

function generateNewFile(impex, telegram, filename, msg){
	return new Promise(function(theend){
		var keys = Object.keys(bot.init.menu);

		var count_loops = 0;
		var finished_loops = 0

		for(var i = 0; i < keys.length; i++){
			for(var ii = 0; ii < bot.init.menu[keys[i]].values.length; ii++){
				count_loops++;
				var item = bot.init.menu[keys[i]].values[ii];
				var config = bot.init.menu[keys[i]].parrent + bot.init.DELIMETER + keys[i] + bot.init.DELIMETER + item;	
				
				indexActions(impex, telegram, config, item, bot.init.menu[item].actions, msg).then(new_config => {
					bot.exec("echo \"" + new_config.replace(/"/g, "\\\"") + "\" >> " + filename + "\n", function(error, out, err){
						if(error != null)
							console.log("ERROR", "impex="+impex, "add string to impex file["+impex+"]: " + error.toString());
						if(err != "")
							console.log("ERROR", "impex="+impex, "add string to impex file["+impex+"]: " + err.toString());

						finished_loops++;
					});
				}, error => {
					console.log("ERROR", "impex="+impex, error.item, error.msg);
				});
			}
		}

		var loopsInterval = setInterval(function(){
			if(count_loops == finished_loops){
				clearInterval(loopsInterval);
				theend();
			}
		}, 200);
	});
}

/* 
 * impex - route variable
 * 		0 - export
 *		1 - import
*/
function indexActions(impex, telegram, config, item, actions, msg, index = 0){
	return new Promise(function(ok, fail){
		if(actions[index] == undefined)
			ok(config);

		var impex_action = actions[index];
		if(["voice", "sticker", "photo", "video", "document"].indexOf(impex_action.type) != -1){
			// export
			if(impex == IMPEX_EXPORT){
				telegram.downloadFile(impex_action.value, bot.init.DATA_FOLDER).then(file => {
					impex_action.value = file;
					config += bot.init.DELIMETER + JSON.stringify(impex_action);
					indexActions(impex, telegram, config, item, actions, msg, index+1).then(new_config => {
						ok(new_config);
					}, error => { fail({'item':error.item, 'msg':error.msg}) });
				}).catch(e => { fail({'item':item, 'msg':e}) });	
			}

			// import
			if(impex == IMPEX_IMPORT){
				if(impex_action.type == "voice"){
					telegram.sendVoice(msg.from.id, impex_action.value).then(data => {
						impex_action.value = data.voice.file_id;
						config += bot.init.DELIMETER + JSON.stringify(impex_action);
						indexActions(impex, telegram, config, item, actions, msg, index+1).then(new_config => {
							ok(new_config);
						}, error => { fail({'item':error.item, 'msg':error.msg}) });
					}).catch(e => { fail({'item':item, 'msg':e}) });
				}

				if(impex_action.type == "sticker"){
					telegram.sendSticker(msg.from.id, impex_action.value).then(data => {
						impex_action.value = data.sticker.file_id;
						config += bot.init.DELIMETER + JSON.stringify(impex_action);
						indexActions(impex, telegram, config, item, actions, msg, index+1).then(new_config => {
							ok(new_config);
						}, error => { fail({'item':error.item, 'msg':error.msg}) });
					}).catch(e => { fail({'item':item, 'msg':e}) });
				}

				if(impex_action.type == "photo"){
					telegram.sendPhoto(msg.from.id, impex_action.value).then(data => {
						impex_action.value = data.photo[data.photo.length-1].file_id;
						config += bot.init.DELIMETER + JSON.stringify(impex_action);
						indexActions(impex, telegram, config, item, actions, msg, index+1).then(new_config => {
							ok(new_config);
						}, error => { fail({'item':error.item, 'msg':error.msg}) });
					}).catch(e => { fail({'item':item, 'msg':e}) });
				}

				if(impex_action.type == "video"){
					telegram.sendVideo(msg.from.id, impex_action.value).then(data => {
						impex_action.value = data.video.file_id;
						config += bot.init.DELIMETER + JSON.stringify(impex_action);
						indexActions(impex, telegram, config, item, actions, msg, index+1).then(new_config => {
							ok(new_config);
						}, error => { fail({'item':error.item, 'msg':error.msg}) });
					}).catch(e => { fail({'item':item, 'msg':e}) });
				}

				if(impex_action.type == "document"){
					telegram.sendDocument(msg.from.id, impex_action.value).then(data => {
						impex_action.value = data.document.file_id;
						config += bot.init.DELIMETER + JSON.stringify(impex_action);
						indexActions(impex, telegram, config, item, actions, msg, index+1).then(new_config => {
							ok(new_config);
						}, error => { fail({'item':error.item, 'msg':error.msg}) });
					}).catch(e => { fail({'item':item, 'msg':e}) });
				}
			}

			return;
		}

		config += bot.init.DELIMETER + JSON.stringify(impex_action);
		indexActions(impex, telegram, config, item, actions, msg, index+1).then(new_config => {
			ok(new_config);
		}, error => { fail({'item':error.item, 'msg':error.msg}) });
	});
}

function clearFile(filename){
	bot.exec("cat /dev/null > " + filename + "\n", function(error, out, err){
		if(error != null)
			console.log("ERROR", filename, "clear file: " + error.toString());
		if(err != "")
			console.log("ERROR", filename, "clear file: " + err.toString());
	});
}

function import_configuration(telegram, filename_from, msg){
	var filename_to = process.argv[2];
	
	// clear menu
	bot.init.menu = {};

	// fill menu
	bot.config.loadConfigurationFile(filename_from).then(() => {
		// clear new config file
		clearFile(filename_to);

		// fill new config file
		generateNewFile(IMPEX_IMPORT, telegram, filename_to, msg).then(() => {
			// refresh menu with new config
			bot.init.menu = {};
			bot.config.loadConfigurationFile(filename_to).then(() => { }, error => {
				console.log("ERROR", "import", "loadConfigurationFile", filename_to, error);
			});		
		});

	}, error => {
		console.log("ERROR", "import", "loadConfigurationFile", filename_from, error);
	});
}
module.exports.import_configuration = import_configuration
