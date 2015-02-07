/*
** Peteris Krumins (peter@catonmat.net)
** http://www.catonmat.net  --  good coders code, great reuse
**
** A simple proxy server written in node.js.
**
*/
require ('newrelic');

var http = require('http');
var util  = require('util');
var fs   = require('fs');
var express = require('express');

var app = express();

app.set('port', process.env.PROXY_PORT || 8080);

var blacklist = [];
var iplist    = [];

fs.watchFile('/home/node/server/proxy/blacklist', function(c,p) { update_blacklist(); });
fs.watchFile('/home/node/server/proxy/iplist', function(c,p) { update_iplist(); });

function update_blacklist() {
  fs.stat('/home/node/server/proxy/blacklist', function(err, stats) {
    if (!err) {
      util.log("Updating blacklist.");
      blacklist = fs.readFileSync('/home/node/server/proxy/blacklist','utf8').split('\n')
                  .filter(function(rx) { return rx.length })
                  .map(function(rx) { return RegExp(rx) });
    }
  });
}

function update_iplist() {
  fs.stat('/home/node/server/proxy/iplist', function(err, stats) {
    if (!err) {
      util.log("Updating iplist.");
      iplist = fs.readFileSync('/home/node/server/proxy/iplist','utf8').split('\n')
               .filter(function(rx) { return rx.length });
    }
  });
}

function ip_allowed(ip) {
  for (i in iplist) {
    if (iplist[i] == ip) {
      return true;
    }
  }
  return false;
}

function host_allowed(host) {
  for (i in blacklist) {
    if (blacklist[i].test(host)) {
      return false;
    }
  }
  return true;
}

function deny(response, msg) {
  response.writeHead(401);
  response.write(msg);
  response.end();
}

http.createServer(function(request, response) {
  var ip = request.connection.remoteAddress;
  if (!ip_allowed(ip)) {
    msg = "IP " + ip + " is not allowed to use this proxy";
    deny(response, msg);
    util.log(msg);
    return;
  }

  if (!host_allowed(request.url)) {
    msg = "Host " + request.url + " has been denied by proxy configuration";
    deny(response, msg);
    util.log(msg);
    return;
  }

  util.log(ip + ": " + request.method + " " + request.url);
  var proxy = http.createClient(80, request.headers['host'])
  var proxy_request = proxy.request(request.method, request.url, request.headers);
  proxy_request.addListener('response', function(proxy_response) {
    proxy_response.addListener('data', function(chunk) {
      response.write(chunk, 'binary');
    });
    proxy_response.addListener('end', function() {
      response.end();
    });
    response.writeHead(proxy_response.statusCode, proxy_response.headers);
  });
  request.addListener('data', function(chunk) {
    proxy_request.write(chunk, 'binary');
  });
  request.addListener('end', function() {
    proxy_request.end();
  });

  process.on('uncaughtException', function(e) {
  	if (e.code != 'ENOTFOUND') {
  		console.log(e);
  	}
  });

}).listen(app.get('port'));

update_blacklist();
update_iplist();
console.log("Proxy server listening on port "+app.get('port'));
