'use strict';

var express = require('express');
var fs = require("fs");
var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var router = express.Router();


let DBConnectionInstance = null;
class DB {
  constructor(dbPath){

    if(!DBConnectionInstance){
          DBConnectionInstance = this;
    }

    let emptyDBFile = false;
    this.dbPath = dbPath;
    try{
      this.DBSize = fs.statSync(dbPath).size;
    }finally{
      this.storage = fs.openSync(dbPath, 'a+');
    }

    if (!this.DBSize){
      fs.writeSync(this.storage, JSON.stringify({}), 0);
    }

    return DBConnectionInstance;
  }

  _getDBData(){
    this.DBSize = fs.statSync(this.dbPath).size;
    let buffer = new Buffer(this.DBSize);
    fs.readSync(this.storage, buffer, 0, this.DBSize, 0);
    let aux = buffer.toString();
    return JSON.parse(aux);
  }

  addRecordForEntity(record, entity){
    let DBData = this._getDBData();
    if (DBData[entity] === undefined){
      DBData[entity] = [];
    }
    DBData[entity].push(record);

    const updatedDBData = JSON.stringify(DBData);
    fs.writeFileSync(this.dbPath, updatedDBData);

  }

  getAllRecordsForEntity(entity){
    let DBData = this._getDBData();
    if (DBData[entity] !== undefined){
      const aux = DBData[entity];
      return aux;
    }else{
      return [];
    }
  }
}



var app = express()

var allMessages = [];
var allUsers = [];

app.use(bodyParser.json())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.use(function(req, res, next) {
  console.log(req.path, req.body, new Date());
  next();
});

app.get('/', function (req, res) {
    res.send(allMessages.slice(-10));
})

const db = new DB("chat_db.json");

function createUserId(s){
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);   
}

app.post('/user/register', function (request, response) {
    var user = request.body.username;

    if(!user){
      response.status(403).send({
        code: 1,
        message: "Username value is unvalid",
        field: "username"
      })
      return
    }
    const allUsers = db.getAllRecordsForEntity('users');

    let foundUser = findRecordByField('users', 'username', user)

    if (!foundUser.length){
      const userId = createUserId(user.toLowerCase());
      console.log(userId);
      db.addRecordForEntity({user_id: userId, username: user}, 'users')
      response.send({
        id: userId,
        username: user
      });
    }else{
      response.status(403).send({
        code: 1,
        message: "This user is already registered",
        field: "username"
      });
    }
})


function findRecordByField(entity, field, value){
  let records = db.getAllRecordsForEntity(entity);
  return records.filter( (record, index, array) => {
    if (record[field] == value){
      return record;
    }
  });
}

app.get('/user', function (request, response) {
  var res = [];
  for(var user of allUsers){
    res.push({user_id: user, username: user, status: "active"})
  }
  response.send(res);
})


function validateMessage(message){
  var isValid = true;

  var validationResult = {
    message: 'Message is not valid',
    field: ''
  }

  if (isNaN(Date.parse(message.datetime))){
    isValid = false

    return {
      message: 'Datetime is not valid',
      field: 'datetime'
    }
  }

  if (!message.message){
    isValid = false

    return {
      message: 'Message is not valid',
      field: 'message'
    }
  }

  let u = findRecordByField('users', 'user_id', message.user_id);
  if (!u.length){
    isValid = false

    return {
      message: 'This user_id is not registered',
      field: 'user_id'
    }
  }

  return isValid;
}

app.get('/messages', function (request, response) {

  var res = [];
  for(var message of db.getAllRecordsForEntity('message')){
    res.push(message)
  }

  response.send(res);
})

app.post('/messages', function (request, response) {
    var result = validateMessage(request.body);
    if (result === true){
      db.addRecordForEntity(request.body, 'message');
    }

    response.send(result);
})


var server = app.listen(8081, function () {
  console.log("App listening on port 8081");
})
