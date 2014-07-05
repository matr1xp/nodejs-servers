var fs = require('fs');
var ConfigLoader = {
	_config:null,
	load:function(file){
		var self = this;
		this._config = JSON.parse(fs.readFileSync(file).toString());
		fs.watch(file,function(){
			self._config = JSON.parse(fs.readFileSync(file).toString());
		});
		return this._config;
	},
	get:function(key){
		return this._config[key];
	}
};
module.exports = ConfigLoader;