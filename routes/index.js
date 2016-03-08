var express = require('express');
var router = express.Router();
var auth = require('../controllers/authorisation');
var restler = require('restler');
var cookie = require('cookie');
var _ = require("underscore");

function getCookies(req){
  var cookies = _.map(req.cookies, function(val, key) {
    if(key == "connect.sid"){
      return key + "=" + val['connect.sid'];
    }
  }).join("; ");
  return cookies;
}

/* GET home page. */
router.get('/', auth.requiresLogin,  function(req, res, next) {
  try{
    restler.get(
      process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/1.0/collections/password-vault/entries?sortdesc=datecreated&count=10",
      {headers:
        {'cookie': getCookies(req)}
      }
    )
    .on('complete', function(data, response){
      if(response.statusCode == 200){
        if (!data){
          data = {data: []};
        }
        data.start=1;
        data.pages = Math.ceil(data.count / 10);
        data.currentpage = data.start / 10;
        if (data.currentpage < 1){
          data.currentpage = 1;
        }
        res.render('index', {"tab":"home", "email": req.cookies.email, "entries": data, "title": "Password Vault"});
      }else{
        res.render("login", {"error": data});
      }
    });
  }catch(e){
    if (e.indexOf("valid api key") > -1){
      e = "Session expired. Please login again";
    }
    res.render("login", {"error": e});
  }
});

router.get('/entries/:pageno', auth.requiresLogin,  function(req, res, next) {
  try{
    var start = ((req.params.pageno - 1) * 10);
    restler.get(
      process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/1.0/collections/password-vault/entries?sortdesc=datecreated&count=10&start=" + start,
      {headers:
        {'cookie': getCookies(req)}
      }
    )
    .on('complete', function(data, response){
      if(response.statusCode == 200){
        if (!data){
          data = {data: []};
        }
        data.start=1;
        data.pages = Math.ceil(data.count / 10);

        data.currentpage = req.params.pageno;
        res.render('index', {"tab":"home", "email": req.cookies.email, "entries": data, "title": "Password Vault"});
      }else{
        res.render("login", {"error": data});
      }
    });
  }catch(e){
    if (e.indexOf("valid api key") > -1){
      e = "Session expired. Please login again";
    }
    res.render("login", {"error": e});
  }
});

router.get('/newentry', auth.requiresLogin, function(req, res, next){
  getRoles(req, function(roles){
    res.render("entry-new", {"tab": "newentry", "email": req.cookies.email, "roles": roles, "title": "New Entry | LDC Via Password Vault"});
  })
})

router.post('/newentry', auth.requiresLogin, function(req, res, next){
  var data = {};
  data.sitename = req.body.sitename;
  data.ipaddress = req.body.ipaddress;
  data.username = req.body.username;
  data.password = req.body.password;
  data.notes = req.body.notes;
  data.datecreated = new Date();
  data.__form = "entries";
  data.roles = req.body.roles;
  var uuid = require('node-uuid');
  var unid = uuid.v4();
  data.__unid = unid;
  if (!data.roles){
    data.roles = [];
  }else if(!Array.isArray(data.roles)){
    data.roles = [data.roles];
  }
  if (req.body.newroles && req.body.newroles != ""){
    if (req.body.newroles.indexOf(",") > -1){
      var newroles = req.body.newroles.split(",");
      for (var i=0; i<newroles.length; i++){
        data.roles.push(newroles[i].trim());
      }
    }else{

      data.roles.push(req.body.newroles.trim());
    }
  }
  restler.putJson(
    process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/1.0/document/password-vault/entries/" + unid,
    data,
    {headers:
      {'cookie': getCookies(req)}
    }
  )
  .on('complete', function(data, response){
    res.redirect("/");
  })
})

router.get('/entry/:unid', auth.requiresLogin, function(req, res, next){
  try{
    getRoles(req, function(roles){
      restler.get(
        process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/1.0/document/password-vault/entries/" + req.params.unid + "?all",
        {headers:
          {'cookie': getCookies(req)}
        }
      )
      .on('complete', function(data, response){
        if (!data.roles){
          data.roles = [];
        }
        res.render('entry-read', {"tab":"entry", "email": req.cookies.email, "roles": roles, "entry": data, "title": data.title + " | LDC Via Ideas"});
      });
    })
  }catch(e){
    res.render("login", {"error": e});
  }
})

router.delete('/entry/:unid', auth.requiresLogin, function(req, res, next){
  try{
    restler.del(
      process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/1.0/document/password-vault/entries/" + req.params.unid + "?all",
      {headers:
        {'cookie': getCookies(req)}
      }
    )
    .on('complete', function(data, response){
      res.status(200).send(data);
    });
  }catch(e){
    res.render("login", {"error": e});
  }
})

router.post('/entry/:unid', auth.requiresLogin, function(req, res, next){
  var data = {};
  data.sitename = req.body.sitename;
  data.ipaddress = req.body.ipaddress;
  data.username = req.body.username;
  data.password = req.body.password;
  data.notes = req.body.notes;
  data.__form = "entries";
  data.roles = req.body.roles;
  if (!data.roles){
    data.roles = [];
  }else if(!Array.isArray(data.roles)){
    data.roles = [data.roles];
  }
  if (req.body.newroles && req.body.newroles != ""){
    if (req.body.newroles.indexOf(",") > -1){
      var newroles = req.body.newroles.split(",");
      for (var i=0; i<newroles.length; i++){
        data.roles.push(newroles[i].trim());
      }
    }else{
      data.roles.push(req.body.newroles.trim());
    }
  }
  restler.postJson(
    process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/1.0/document/password-vault/entries/" + req.params.unid,
    data,
    {headers:
      {'cookie': getCookies(req)}
    }
  )
  .on('complete', function(data, response){
    res.redirect("/");
  })
})

router.get('/search', auth.requiresLogin, function(req, res, next){
  restler.postJson(
    process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/1.0/search/password-vault/entries?count=10",
    {"fulltext": req.query.query},
    {headers:
      {'cookie': getCookies(req)}
    }
  ).on('complete', function(data, response){
    res.render('search', {"entries": data, search: req.query.query})
  })
})

router.get('/about', function(req, res, next) {
  try{
    res.render('static-about', {"tab":"about", "email": req.cookies.email, "title": "About | LDC Via Ideas"});
  }catch(e){
    res.render("login", {"error": e});
  }
});

router.get('/contact', function(req, res, next) {
  try{
    res.render('static-contact', {"tab":"contact", "email": req.cookies.email, "title": "Contact | LDC Via Ideas"});
  }catch(e){
    res.render("login", {"error": e});
  }
});

function getRoles(req, callback){
  restler.get(
    process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/1.0/list/password-vault/entries/roles",
    {headers:
      {'cookie': getCookies(req)}
    }
  )
  .on('complete', function(data, response){
    callback(data);
  })
}

/* GET login page */
router.get('/login',  function(req, res, next) {
  res.render('login', {"tab": "home", "title": "Login | LDC Via Ideas"});
});

router.post('/login', function(req, res, next){
  try{
    restler.postJson(
      process.env.LDCVIA_PASSWORDVAULT_APIHOST + "/login",
      {'username': req.body.email, 'email': req.body.email, 'password': req.body.password}
    ).on('complete', function (data, response){
      console.log(data);
      // display returned cookies in header
      var setcookie = response.headers["set-cookie"];
      var cookieobj = {};
      for (var i=0; i<setcookie.length; i++){
        if (setcookie[i].indexOf("connect.sid=") > -1){
          cookieobj = cookie.parse(setcookie[i]);
        }
      }
      if (cookieobj['connect.sid'] && data.success){
        res.cookie('connect.sid', cookieobj);
        res.cookie('email', req.body.email);
        res.redirect("/");
      }else{
        res.render("login", {"error": data.errors[0]});
      };
    });
  }catch(e){
    console.log(e);
    res.render("/login");
  }
})

router.get('/logout', auth.requiresLogin, function(req, res, next){
  res.clearCookie('connect.sid');
  res.clearCookie('email');
  res.redirect('/');
})

module.exports = router;
