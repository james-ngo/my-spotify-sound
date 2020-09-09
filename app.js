/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var url = require('url') ;

var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your secret

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.engine('html', require('ejs').renderFile);

app.use(cors())
   .use(cookieParser());

app.get('/', function(req, res) {
  res.render(__dirname + '/views/index.html',
    { token: req.cookies.auth,
      error: false });
});

app.get('/artists', function(req, res) {
  if (req.cookies.auth) {
    res.render(__dirname + '/views/top_artists.html', { token: req.cookies.auth,
                                                        time_range: req.query.time_range })
  } else {
    res.redirect('/login');
  }
});

app.get('/genres', function(req, res) {
  if (req.cookies.auth) {
    res.render(__dirname + '/views/top_genres.html', { token: req.cookies.auth,
                                                       time_range: req.query.time_range });
  } else {
    res.redirect('/login');
  }
});

app.get('/tracks', function(req, res) {
  if (req.cookies.auth) {
    res.render(__dirname + '/views/top_tracks.html', { token: req.cookies.auth,
                                                       time_range: req.query.time_range });
  } else {
    res.redirect('/login');
  }
});

app.get('/login', function(req, res) {

  var hostname = req.headers.host;
  var redirect_uri = 'https://' + hostname + '/callback/'; // Your redirect uri

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog: true
    }));
});

app.get('/logout', function(req, res) {
  res.clearCookie('auth');
  res.redirect('/');
})

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var hostname = req.headers.host;
  var redirect_uri = 'https://' + hostname + '/callback/'; // Your redirect uri

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;
  if (state === null || state !== storedState) {
    res.render(__dirname + '/views/index.html', { token: "", error: "state_mismatch" })
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        res.cookie("auth", access_token);
        res.cookie("refresh_token", refresh_token);
        res.redirect('/');
      }
    });
  }
});

app.get('/refresh_token', function (req, res) {
  // requesting access token from refresh token
  var refresh_token = req.cookies.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      res.send({ "access_token": access_token });
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT);
