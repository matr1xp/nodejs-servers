var passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    util = require('util'),
    Autolinker = require('autolinker'),
    https = require('https'),
    OAuth2 = require('oauth').OAuth2,
    Express = require('express'),
    Path = require('path'),
    Config = require('../common/configLoader.js');

Config.load(__dirname+'/config.json');

var consumerKey = Config.get('twitter')['CONSUMER_KEY'];
var consumerSecret = Config.get('twitter')['CONSUMER_SECRET'];
var callbackURL = Config.get('twitter')['CALLBACK_URL'];

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new TwitterStrategy({
    consumerKey: consumerKey,
    consumerSecret: consumerSecret,
    callbackURL: callbackURL
  },
  function(token, tokenSecret, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

var app = Express();

// configure Express

app.set('views', Path.join(__dirname, 'views'));
//app.set('view engine', 'ejs');
app.set('view engine', 'jade');
app.set('port', Config.get('port'));

app.use(Express.logger());
app.use(Express.cookieParser());
app.use(Express.bodyParser());
app.use(Express.methodOverride());
app.use(Express.session({ secret: 'keyboard cat' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(Express.static(Path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/tweets/:screen_name/:count', function(req, res) {
  var oauth2 = new OAuth2(consumerKey, consumerSecret,
                          Config.get('twitter')['API_URL'],
                          null, 'oauth2/token', null);

  oauth2.getOAuthAccessToken('', {
      'grant_type': 'client_credentials'
    }, function (e, access_token) {
        if (e) {
          console.log(e);
        } else {
          var options = {
            host: 'api.twitter.com',
            path: '/1.1/statuses/user_timeline.json?screen_name=' + req.params.screen_name + '&count=' + req.params.count,
            headers: {
                Authorization: 'Bearer ' + access_token
            }
          };
          https.get(options, function(result) {
            result.setEncoding('utf8');
            //console.log('STATUS: ' + result.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(result.headers));
            var buffer = '';
            result.setEncoding('utf8');
            result.on('data', function(data){
              buffer += data;
            });
            result.on('end', function(){
              var tweets = JSON.parse(buffer);
              //res.set('Content-Type','application/json');
              //res.send(200, tweets);
              res.render('tweets', {tweets: tweets, Autolinker: Autolinker});
            });
          });
        }
  });


});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/twitter
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Twitter authentication will involve redirecting
//   the user to twitter.com.  After authorization, the Twitter will redirect
//   the user back to this application at /auth/twitter/callback
app.get('/auth/twitter',
  passport.authenticate('twitter'),
  function(req, res){
    // The request will be redirected to Twitter for authentication, so this
    // function will not be called.
  });

// GET /auth/twitter/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
