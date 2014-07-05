var ObjectID = require('mongodb').ObjectID,
    fs = require('fs'); //1

FileDriver = function(db) { //2
  this.db = db;
};

FileDriver.prototype.getCollection = function(callback) {
  this.db.collection('files', function(error, file_collection) { //1
    if( error ) callback(error);
    else callback(null, file_collection);
  });
};

//find a specific file
FileDriver.prototype.get = function(id, callback) {
    this.getCollection(function(error, file_collection) { //1
        if (error) callback(error);
        else {
            var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$"); //2
            if (!checkForHexRegExp.test(id)) callback({error: "invalid id"});
            else file_collection.findOne({'_id':ObjectID(id)}, function(error,doc) { //3
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};

FileDriver.prototype.handleGet = function(req, res) { //1
    var fileId = req.params.id;
    if (fileId) {
        this.get(fileId, function(error, thisFile) { //2
            if (error) { res.send(400, error); }
            else {
                    if (thisFile) {
                         var filename = fileId + thisFile.ext; //3
                         var filePath = './uploads/'+ filename; //4
    	                 res.sendfile(filePath); //5
    	            } else res.send(404, 'file not found');
            }
        });
    } else {
	    res.send(404, 'file not found');
    }
};

//save new file
FileDriver.prototype.save = function(obj, callback) { //1
    this.getCollection(function(error, the_collection) {
      if( error ) callback(error);
      else {
        obj.created_at = new Date();
        the_collection.insert(obj, function() {
          callback(null, obj);
        });
      }
    });
};

FileDriver.prototype.getNewFileId = function(newobj, callback) { //2
	this.save(newobj, function(err,obj) {
		if (err) { callback(err); }
		else { callback(null,obj._id); } //3
	});
};

FileDriver.prototype.handleUploadRequest = function(req, res) { //1
    var ctype = req.get("content-type"); //2
    var ext = ctype.substr(ctype.indexOf('/')+1); //3
    if (ext) {ext = '.' + ext; } else {ext = '';}
    this.getNewFileId({'content-type':ctype, 'ext':ext}, function(err,id) { //4
        if (err) { res.send(400, err); }
        else {
             var filename = id + ext; //5
             filePath = __dirname + '/uploads/' + filename; //6

	     var writable = fs.createWriteStream(filePath); //7
	     req.pipe(writable); //8
             req.on('end', function (){ //9
               res.send(201,{'_id':id});
             });
             writable.on('error', function(err) { //10
                res.send(500,err);
             });
        }
    });
};

exports.FileDriver = FileDriver;
