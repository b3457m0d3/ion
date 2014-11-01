//     Backbone.Controller 0.3.0
//     (c) Artyom Trityak
//     Backbone.Controller may be freely distributed under the MIT license.
//     For all details and documentation:
//     https://github.com/artyomtrityak/backbone.controller


define(['jquery','underscore', 'backbone'], function( $, _, Backbone ) {
// Binds your routes to Backbone router.
// Allows define routes separated in each controller.
// For example:
//
//  Backbone.Controller.extend({
//    routes: {
//      '': 'index',
//      'cat/:query/p:page': 'showCat'
//    },
//
//    initialize: function() {
//      // do init stuff
//    },
//
//    index: function() {
//      // create index model and view
//    },
//
//    showCat: function(query, page) {
//      // create cat model and view
//      // if something - call navigate as proxy to Backbone.Router.navigate
//      this.navigate('dogs/', {trigger: true});
//    }
//  });
//
//  For router initialization router option should be given.
//  For example:
//
//  var Application = Backbone.Router.extend({
//    controllers: {},
//
//    initialize: function() {
//      this.controllers.home = new HomeController({router: this});
//      this.controllers.search = new SearchController({router: this});
//
//      Backbone.history.start();
//    }
//  });
//
//  ========
//
//  Auto router
//
//  var CatsController = Backbone.Controller.extend({
//    routes: {
//      '': 'index',
//      'cat/:query/p:page': 'showCat'
//    },
//
//    onBeforeRequest: function(url, param1, param2 ...) {
//      // do before request actions
//    },
//
//    onAfterRequest: function(url, param1, param2 ...) {
//      // do after request actions
//    },
//
//    remove: function() {
//      // make cleanup
//    }
//    ...
//  });
//
//  var cats = new CatsController({router: true});
//
    var bindRoutes = function(Router) {
        for (var url in this.routes) {
            Router.route(url, url, _.bind(onRoute, this, url));
        }
    },
    onRoute = function() {
        var self = this,
        args = _.toArray(arguments),
        url = args[0],
        methodName = this.routes[url],
        params = args.slice(1),
        triggerRouteAndAfterRoute = function() {
            self[methodName].apply(self, params);
            if ( _.isFunction(self.onAfterRoute)) self.onAfterRoute.apply(self, args);
        }, beforeRouteResult, isPromiseObj;
        if (cachedController && cachedController !== this && typeof cachedController.remove === 'function') cachedController.remove.apply(cachedController);
        cachedController = this;
        if ( _.isFunction(this.onBeforeRoute) ) beforeRouteResult = this.onBeforeRoute.apply(this, args);
        if (beforeRouteResult === false || beforeRouteResult === null) return this;
        isPromiseObj = beforeRouteResult && beforeRouteResult.done && _.isFunction(beforeRouteResult.done);
        if (isPromiseObj) beforeRouteResult.done(triggerRouteAndAfterRoute); else triggerRouteAndAfterRoute();
    }, cachedRouter, cachedController;
    Backbone.Controller = function(options){
        this.options = options || {};
        if (_.isFunction(this.initialize)){
            this.initialize(this.options);
        }
        if (this.options.router === true) {
            cachedRouter = cachedRouter || new Backbone.Router();
            this.options.router = cachedRouter;
        }
        if (this.options.router) {
            cachedRouter = this.options.router;
            bindRoutes.call(this, this.options.router);
        }
    };
    Backbone.Controller.prototype.navigate = function() {
        var params = _.toArray(arguments).slice(0);
        cachedRouter.navigate.apply(this, params);
    };

    Backbone.Controller.extend = Backbone.Router.extend;

    _.extend(Backbone.Controller.prototype, Backbone.Events, {
        remove: function() {
            this.stopListening();
        }
    });

    window.Backbone.Controller = Backbone.Controller;
    return Backbone.Controller;
});
