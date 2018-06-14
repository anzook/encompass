/* exported mongoose */
const express = require('express'),
      mongoose = require('mongoose'),
      config = require('./config'),
      expressPath = require('path'),
      cookieParser = require('cookie-parser'),
      logger = require('morgan'),
      http = require('http'),
      flash = require('connect-flash'),
      session = require('express-session'),
      MongoStore = require('connect-mongo')(session),
      passport = require('passport'),
      fake = require('./fake_login'),
      uuid = require('uuid'),
      cookie = require('cookie'),
      api = require('./datasource/api'),
      auth = require('./datasource/api/auth'),
      path = require('./middleware/path'),
      fixed = require('./datasource/fixed');

const configure = require('./middleware/passport');
const userAuth = require('./middleware/userAuth');
const models = require('./datasource/schemas');
const utils = require('./middleware/requestHandler');
const dbMigration = require('./db_migration/base');

const nconf = config.nconf;
const server = express();

let port = nconf.get('port');
let dbConf = nconf.get('database');

switch(process.env.NODE_ENV) {
  case 'development':
    console.log("NODE_ENV == development");
    port = nconf.get('devPort');
    dbConf.name = nconf.get('devDBName');
    break;
  case 'test':
    console.log("NODE_ENV == test");
    port = nconf.get('testPort');
    dbConf.name = nconf.get('testDBName');
    break;
  case 'production':
    console.log("NODE_ENV == production");
    port = nconf.get('prodPort');
    dbConf.name = nconf.get('prodDBName');
    break;
}

mongoose.connect(dbConf.host, dbConf.name, {
  user: dbConf.user,
  pass: dbConf.pass
});

console.info (`Port: ${port.toString()}`);
console.info (`db name: ${dbConf.name}`);

server.set('port', port);

const mainServer = http.createServer(server);

mainServer.listen(port);

// mongo >=3.6
//  const uri = `mongodb://${dbConf.user}:${dbConf.pass}@${dbConf.host}:27017/${dbConf.name}`;
// mongoose.connect(uri);
const db = mongoose.connection;
db.on('error', function (err) {
  console.trace(err);
  process.exit(1);
});

server.use(session({
  secret: 'encompass-app',
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({mongooseConnection: mongoose.connection,
    stringify: false
  })
}));

// server.set('view engine', 'ejs');


//PASSPORT
configure(passport);
server.use(passport.initialize());
server.use(passport.session());


//MIDDLEWARE
server.use(logger('dev'));
server.use(express.json());
server.use(express.urlencoded({
  extended: false
}));
server.use(cookieParser());
server.use(path.prep());
server.use(path.processPath());
//server.use(userAuth.fetchUser());
server.use(userAuth.protect());
server.use(userAuth.loadAccessibleWorkspaces());
server.use(path.validateContent());

// LOCAL AUTHENTICATION CALLS
server.post('/auth/login', auth.localLogin);
server.post('/auth/signup', auth.localSignup);
server.get('/logout', auth.logout);

//  GOOGLE AUTHENTICATION CALLS
server.get('/auth/google', auth.googleAuth);
server.get('/auth/google/callback', auth.googleReturn);

//  FACEBOOK AUTHENTICATION CALLS
server.get('/auth/facebook', auth.facebookAuth);
server.get('/auth/facebook/callback', auth.facebookReturn);

//API CALLS
server.get('/api/users', api.get.users);
server.get('/api/users/:id', path.validateId(), api.get.user);
server.get('/api/workspaces', api.get.workspaces);
server.get({ path: '/api/workspaces/:id', version: '0.0.1' }, path.validateId(), fixed.workspace);
server.get('/api/workspaces/:id', path.validateId(), api.get.workspace);
server.get('/api/folders', api.get.folders);
server.get('/api/folders/:id', path.validateId(), api.get.folder);
server.get('/api/folderSets', api.get.folderSets);
server.get('/api/pdSets', api.get.pdSets); // For some reason Ember prefers pDSets to pdSets and PDSets
server.get('/api/submissions', api.get.submissions);
server.get('/api/submissions/:id', path.validateId(), api.get.submission);
server.get('/api/selections', api.get.selections);
server.get('/api/selections/:id', path.validateId(), api.get.selection);
server.get('/api/comments', api.get.comments);
server.get('/api/comments/:id', path.validateId(), api.get.comment);
server.get('/api/responses', api.get.responses);
server.get('/api/responses/:id', path.validateId(), api.get.response);
server.get('/api/taggings', api.get.taggings);
server.get('/api/taggings/:id', path.validateId(), api.get.tagging);
server.get('/api/problems', api.get.problems);
server.get('/api/problems/:id', path.validateId(), api.get.problem);
server.get('/api/answers', api.get.answers);
server.get('/api/answers/:id', path.validateId(), api.get.answer);
server.get('/api/sections', api.get.sections);
server.get('/api/sections/:id', path.validateId(), api.get.section);
server.get('/api/sections', api.get.categories);
server.get('/api/sections/:id', path.validateId(), api.get.category);

server.post('/api/users', api.post.user);
server.post('/api/workspaces', api.post.workspace);
server.post('/api/errors', api.post.error);
server.post('/api/folders', api.post.folder);
server.post('/api/submissions', api.post.submission);
server.post('/api/selections', api.post.selection);
server.post('/api/comments', api.post.comment);
server.post('/api/responses', api.post.response);
server.post('/api/taggings', api.post.tagging);
server.post('/api/problems', api.post.problem);
server.post('/api/answers', api.post.answer);
server.post('/api/sections', api.post.section);

server.put('/api/folders/:id', path.validateId(), path.validateContent(), api.put.folder);
server.put('/api/submissions/:id', path.validateId(), path.validateContent(), api.put.submission);
server.put('/api/selections/:id', path.validateId(), path.validateContent(), api.put.selection);
server.put('/api/comments/:id', path.validateId(), path.validateContent(), api.put.comment);
server.put('/api/responses/:id', path.validateId(), path.validateContent(), api.put.response);
server.put('/api/taggings/:id', path.validateId(), path.validateContent(), api.put.tagging);
server.put('/api/users/:id', path.validateId(), path.validateContent(), api.put.user);
server.put('/api/users/addSection/:id', path.validateId(), path.validateContent(), api.put.user.addSection);
server.put('/api/users/removeSection/:id', path.validateId(), path.validateContent(), api.put.user.removeSection);
server.put('/api/users/addAssignment/:id', path.validateId(), path.validateContent(), api.put.user.addAssignment);
server.put('/api/users/removeAssignment/:id', path.validateId(), path.validateContent(), api.put.user.removeAssignment);
server.put('/api/workspaces/:id', path.validateId(), path.validateContent(), api.put.workspace);
server.put('/api/problems/:id', path.validateId(), path.validateContent(), api.put.problem);
server.put('/api/problems/addCategory/:id', path.validateId(), path.validateContent(), api.put.problem.addCategory);
server.put('/api/problems/removeCategory/:id', path.validateId(), path.validateContent(), api.put.problem.removeCategory);
server.put('/api/answers/:id', path.validateId(), path.validateContent(), api.put.answer);
server.put('/api/sections/:id', path.validateId(), path.validateContent(), api.put.section);
server.put('/api/sections/addTeacher/:id', path.validateId(), path.validateContent(), api.put.section.addTeacher);
server.put('/api/sections/removeTeacher/:id', path.validateId(), path.validateContent(), api.put.section.removeTeacher);
server.put('/api/sections/addStudent/:id', path.validateId(), path.validateContent(), api.put.section.addStudent);
server.put('/api/sections/removeStudent/:id', path.validateId(), path.validateContent(), api.put.section.removeStudent);
server.put('/api/sections/addProblem/:id', path.validateId(), path.validateContent(), api.put.section.addProblem);
server.put('/api/sections/removeProblem/:id', path.validateId(), path.validateContent(), api.put.section.removeProblem);
server.put('/api/categories/:id', path.validateId(), path.validateContent(), api.put.category);


server.get('/api/stats', api.get.stats);
server.get('/api/about', api.get.about);

server.get(/.*/, express.static('build'));

server.post({
  name: 'newWorkspaces',
  path: '/api/newWorkspaceRequests',
}, api.post.newWorkspaceRequest);

server.post('/api/importRequests', api.post.importSubmissionsRequest);

// //server.use(function (req, res, next) {
//   var err = new Error('Not Found');
//   err.status = 404;
//   next(err);
// });

// error handler
server.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  //res.render('error');
});

module.exports = mainServer;
