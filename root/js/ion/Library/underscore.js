define("underscore",["lodash", "us-string"], function(_) {
    _.mixin(
		_.extend(_.str.exports(),{
            /*
            * return an object containing the keys (and their values) that you
            *  specify from a given object
            * ex.
            *  var object = [
            *      {'id':0,'name':'zero','location':'first'},
            *      {'id':1,'name':'one','location':'second'},
            *      {'id':2,'name':'two','location':'third'}
            *  ];
            *  _.pluckMany(object,'name','location');
            *  // returns:
            *   [
            *      {'name':'zero','location':'first'},
            *      {'name':'one','location':'second'},
            *      {'name':'two','location':'third'}
            *  ];
            *
            */
			pluckMany: function() {
				// get the property names to pluck
				var source = arguments[0];
				var props = _.rest(arguments, 1);
				return _.map(source, function(item) {
					var obj = {};
					_.each(props, function(property) {
						obj[property] = item[property];
					});
					return obj;
				});
			},

            is: function(obj) {
                var customTypes = [
                    Backbone,
                    Backbone.Model,
                    Backbone.View,
                    Backbone.Collection,
                    Backbone.Router,
                    Stack,
                    Stack.Models.Page,
                    Stack.Models.Section,
                    Stack.Views.Page,
                    Stack.Views.Section,
                    Stack.Pages,
                    Stack.Sections
                ];
                var type = ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
                if(type == 'object'){
                    _.each(customTypes, function(val){
                        if(obj instanceof val) _.log(val);
                    });
                } else _.log(type);
            },
            /*
            *  an alias (shortcut method) for logging data to the console 
            */
            log: function(val){
                console.log(val);
            }
	}));
    return _;
});
