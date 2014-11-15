define(["jquery","underscore","backbone"], function($,_,Backbone){
	var Mold = Backbone.Model.extend({defaults: { el: null, layout: null }});
	return Mold;
});
