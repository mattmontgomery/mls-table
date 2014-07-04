var cheerio      = require('cheerio'),
    rp           = require('request-promise'),
    Promise      = require('bluebird'),
    redis        = require('redis'),
    client       = redis.createClient(),
    _            = require('lodash');

function Scrape(options) {
    this.init(options);
}
Scrape.prototype.init = function(options) {
    options = (!options ? {} : options);
    optionsDefaults = {
        url: "",
        store: true,
        dataName: "__data__",
        expireTime: 600,
        flush: false
    };
    this.options = _.extend(optionsDefaults,options);
    this.keyName = 'scrape:' + this.options.dataName;
    return this;
}
Scrape.prototype.process = function(callback) {
    var self = this,
        resolver = Promise.pending(),
        exists = false;

    if(!this.options.url) {
        resolver.reject('No URL provided');
    }

    this.getFromRedis().then(function(self) {
        resolver.resolve(self);
    }, function(self){
        rp(self.options.url).then(function(body) {
            self.$ = cheerio.load(body);
            self.data = callback(self);
            if(self.options.store === true) {
                self.storeData();
            }
            resolver.resolve(self);
        }).catch(function(err) {
            resolver.reject(err);
        });
    }).catch(function(err) {
        resolver.reject(err);
    });
    return resolver.promise;
};
Scrape.prototype.getFromRedis = function() {
    var self = this;
    var resolver = Promise.pending();
    client.on("error", function (err) {
        console.log("Error " + err);
        resolver.reject(err);
    });
    if(this.options.store === false) {
        resolver.reject(this);
    } else {
        exists = client.exists(this.keyName);
        client.get(this.keyName, function(err,reply) {
            if(err) {
                resolver.reject(err);
            }
            if(reply === null) {
                exists = false;
                resolver.reject(self);
            } else {
                self.data = JSON.parse(reply);
                resolver.resolve(self);
            }
        });
    }
    return resolver.promise;
};
Scrape.prototype.storeData = function() {
    client.set(this.keyName, JSON.stringify(this.data))
    client.expire(this.keyName,this.options.expireTime);
}
Scrape.prototype.options = { };
Scrape.prototype.$ = null;
Scrape.prototype.keyName = '';
Scrape.prototype.data = {};

module.exports = Scrape;
