var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var slug = require('slug');
var redis = require('redis');
var Promise = require('bluebird');

var routes = require('./routes');

// a small library to request-and-redis data
var scrape = require('./scrape.js');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

app.get('/', routes.index);
app.get('/table', function(req, res) {
    var s = new scrape({url: 'http://www.mlssoccer.com/results', dataName: "results"});
    s.process(function(self) {
        var week,
            pointsMap = {
                'win': 3,
                'draw': 1,
                'loss': 0,
                'notplayed': 0
            },
            teams = {};
        $ = self.$;
        $('.stats-table .game-record tr').each(function(){
            week = 0;
            team = {
                name: '',
                matches: [],
                pointsByWeek: [],
                points: 0
            };
            teamName = $(this).find('td:first-child>div').html();
            $(this).find('td:first-child>div').remove();
            if(teamName === null) {
                return;
            }
            team.name = teamName.trim();
            $(this).find('td').each(function(obj,idx) {
                week++;
                gameState = $(this).attr('class');
                    gamePoints = pointsMap[gameState];
                if(gamePoints !== undefined) {
                    team.matches.push(gamePoints);
                    team.points = team.points + gamePoints;
                    team.pointsByWeek.push(team.points + 0);
                }
            })
            teams[slug(team.name)] = team;
        });
        return teams;
    }).then(function(s){
        res.render('table', { title: 'Teams by week', teams: s.data });
    });
});

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
