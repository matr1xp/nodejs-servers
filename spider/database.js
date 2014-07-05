var MongoDb = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    MongoServer = require('mongodb').Server,
    Config = require('../common/configLoader.js'),
    Collection = require('../common/collectionDriver').CollectionDriver,
    FileDriver = require('../common/fileDriver').FileDriver,
    assert = require('assert');

Config.load(__dirname+'/config.json');

var conn = new MongoClient(new MongoServer(Config.get('mongo-db')['host'], Config.get('mongo-db')['port']));
conn.open(function(err, conn) {
  if (!conn) {
      console.error("Error! Exiting... Must start MongoDB first");
      process.exit(1);
  }
});

var Db = function() {
    var self = this;
    var server = new MongoServer(Config.get('mongo-db')['host'], Config.get('mongo-db')['port']);
    self.db = new MongoDb('node-spider', server, {w:1});
    // Establish connection to db
    self.db.open(function(err, db) {
      assert.equal(null, err);
      if (!db) {
        console.log("Error: MongoDB not started on port " + Config.get('mongo-db')['port']);
      }
    });

    self.collectionDriver = new CollectionDriver(self.db);
    self.queue = self.db.collection("queue");
    self.queue.ensureIndex( { url: 1 }, { unique: true, background: true, dropDups: true }, function(e){
      if (e)
          console.log("Error creating index: "+e);
    });
    self.websites = self.db.collection("websites");
    self.websites.ensureIndex( { url: 1 }, { unique: true, background: true, dropDups: true }, function(e){
      if (e)
          console.log("Error creating index: "+e);
    });
    self.test = "DB Ok";
}

module.exports = Db;
