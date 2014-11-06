define("underscore",["jquery","lodash", "us-string"], function($,_) {
    _.mixin(
		_.extend(_.str.exports(),{
            /*
            *  an alias (shortcut method) for logging data to the console
            */
            log: function(val){
                console.log(val);
            },
            explode: function(str,by){
                return (_.inStr(str,by)) ? str.split(by) : null;
            },
            inStr: function(str,search){
                return _.str.include(str,search);
            }
	    })
    );
    return _;
});
