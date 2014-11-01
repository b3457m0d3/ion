define(["jquery","underscore","backbone","Main"], function($,_,Backbone,Main){
		var Router = Backbone.Router.extend({
			controllers: {},
			navigate: function (url) {
		    	// Override pushstate and load url directly
		    	Backbone.history.loadUrl(url);
		  	},
	  		initialize: function() {
			    this.controllers.main = new Main({router: this});
			    Backbone.history.start();
				this.navigate('');
			}
		}
	);
	return Router;
});
