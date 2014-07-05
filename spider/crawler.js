var Request = require('request'),
	  Cheerio = require('cheerio'),
    Async = require('async'),
		Db = require('mongodb').Db,
		MongoClient = require('mongodb').MongoClient,
		MongoServer = require('mongodb').Server,
		Utils = require('../common/utils.js'),
		Config = require('../common/configLoader.js'),
		Collection = require('../common/collectionDriver').CollectionDriver,
		FileDriver = require('../common/fileDriver').FileDriver,
		util = require('util');

Config.load(__dirname+'/config.json');

var Crawler = function(db){
	var self = this;
	//check if MongoDB running
	this.conn = new MongoClient(new MongoServer(Config.get('mongo-db')['host'], Config.get('mongo-db')['port']));
	this.indexed = 0;
	this.baseSite = Config.get('baseSite');
	this._url = this.baseSite;
	this.url = this.baseSite;

	this.crawl = function(cb) {
		self.conn.open(function(e, conn) {
				if (!conn) {
					console.log("Error: MongoDB not started on port " + Config.get('mongo-db')['port']);
					process.exit(1);
				}
				self.initDb(conn);
				//Iterate over queue docs
				self.db.queue.findOne(function(e, doc) {
						//make sure we skip those in queue that have already been crawled
						if (doc) {
							self.url = doc.url;
							self.db.websites.findOne({url: doc.url}, function(e, crawled) {
								if (crawled) {
									self.db.queue.remove({url: crawled.url}, {w:1}, function(e, res) {
										if (res) {
											self.conn.close();
											cb();
										}
									});
								}
							});

						} else {
							self.url = self.baseSite;
						}

						Request(self.url, function(e, res, html){
							self.db.queue.remove({url: self.url}, {w:1}, function(err, r) {
								if (r) {
									self.conn.close();
									cb();
								}
							});
							if (!e && res.statusCode === 200) self.getInfo(html);
							else console.log('Error requesting page %s',self.url);
							self._url = self.url;
						});
				}); //findOne

				self.db.queue.count(function(err, count) {
						if (count == 0 && self.baseSite != self.url) {
							self.db.websites.findOne({url: self.url}, function(e, doc) {
								if (doc.url) {
									process.exit(1);
								}
							});
						} else if (count == 1) {
							self.db.queue.findOne({url: self.url}, function(e,doc) {
									//find in websites
									var sites = self.db.websites.find({$or: [ {url: doc.url}, {url: doc.from}]});
									sites.count(function(err,count){
										if (count > 1) {
											self.db.queue.remove({}, {w:0});
											process.exit(1);
										}
									});
							});
						}
				});
				self._status = self.status();
		});
		return self._status;
	}; //crawl;

	this.getInfo = function(html){
		var $ = Cheerio.load(html);
		var title = $('head title').text();
		var keywords = $('head meta[name=keywords]').attr('content');
		var desc = $('head meta[name=description]').attr('content');
		var links = $('a');
		//console.log('Crawling "%s" | %s',title,this.url);
		//Get page links and add to queue
		Async.map(
			links.map(function(){
				var href = $(this).attr('href');
				if(href && href != self._url && !(/^#(\w)+/.test(href)) && !Utils.imageRegexp.test(href)){
					if(Utils.isExternal(href, self._url)){
						if (Config.get('crawler')['follow_external']) self.queue.insert({"url":href, "from":self.url}, {w:0});
					} else {
						self.db.queue.insert({"url":Utils.resolveRelativeURL(href, self._url), "from":self.url}, {w:0});
					}
				}
				return false;
			}).filter(function(el){
				return !!el;
			}),
			function(e) {
				//Do some stuff
			}
		);
	  //console.log("Insert into `websites` " + Utils.id() + ", " + this._url + title + ", " + keywords + ", " + desc);
		/*self.db.collectionDriver.save('websites', {"url":this.url, "title":title, "keywords":keywords, "description":desc}, function(err,docs) {
				if (err) {
					console.log("Error adding website: " + this.url);
				}
		});*/
		self.db.websites.insert({"url":this.url, "title":title, "keywords":keywords, "description":desc, "created_at" : new Date()}, {w:0});
	}; //getInfo

	this.initDb = function(conn) {
		// Establish connection to db
		self.db = conn.db(Config.get('mongo-db')['database']);
		//self.db.collectionDriver = new CollectionDriver(self.db);
		self.db.queue = self.db.collection("queue");
		self.db.queue.ensureIndex( { url: 1 }, { unique: true /*,background: true, dropDups: true*/ }, function(e){
			if (e) console.log("Error creating index: "+e);
		});
		self.db.websites = self.db.collection("websites");
		self.db.websites.ensureIndex( { url: 1 }, { unique: true, background: true, dropDups: true }, function(e){
			if (e) console.log("Error creating index: "+e);
		});
	}; //initDb

	this.status = function() {
		var count = this;
		if (self.db.queue) {
			self.db.queue.count(function(err, queue) {
				count.queued = queue;
			});
		}
		if (self.db.websites) {
			self.db.websites.count(function(err,sites) {
				count.crawled = sites;
			});
		}
		return [count.crawled, count.queued, this._url];
	}; //status

};

module.exports = Crawler;
