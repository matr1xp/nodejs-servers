var Crawler = require('./crawler.js'),
 	  async = require('async'),
    util = require('util');

var	spider = new Crawler();

async.forever(function(cb){
	var status = spider.crawl(function(){
		process.nextTick(function(){
			cb(null);
		});
	});
  console.log(status);
});
