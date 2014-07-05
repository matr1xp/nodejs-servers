var path = require('path');

var Utils = {
	id:function(){
		var ret = '';
		for(var chars="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_".split(''),i=0;i<75;i++){
			ret += chars[~~(Math.random() * chars.length)];
		}
		return ret;
	},
	resolveRelativeURL:function(p,url){

		if (p.match(/^https?/))
				return p; //link provided is absolute

		var proto = url.match(/^https?/)[0]; //extract the protocol out
		url = url.replace(/^https?:\/\//,''); //remove the protocol
		//check if base url is a path
		_temp = url.split('/');
		if (_temp.length > 1) {
			url = _temp[0];
		}

		return proto+'://'+path.normalize(url+'/'+p) //find out the absolute URL
				.replace(path.sep,'/') //replace blackslash with forward slash in Windows
				.replace(/#(\w)+/,'')
				.replace(/#+/,''); //remove URL fragment
	},
	isExternal:function(url,base){
		var proto = url.match(/^https?/) ? url.match(/^https?/)[0] : ''; //extract the protocol out
		_url = url.replace(/^https?:\/\//,''); //remove the protocol
		_url = _url.split('/')[0];

		var proto2 = base.match(/^https?/)[0]; //extract the protocol out
		base = base.replace(/^https?:\/\//,''); //remove the protocol
		root = base.split('/')[0];	//get domain url

		if (root == _url)
			return false;

		return url.match(/^https?/) !== null;
	},
	imageRegexp: new RegExp("("+['\\.png','\\.jpg','\\.gif','\\.bmp','\\.psd'].join('|')+")$","i")
};

module.exports = Utils;
