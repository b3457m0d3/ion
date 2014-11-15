define(["jquery","underscore","backbone"], function($,_,Backbone){
	var Foundry = Backbone.Collection.extend(_.extend({
		model:        Backbone.Mold,
		initialize:   function(options){
			this.listenTo(this, 'add', this.cast); _.log('Forge Initialized');
		},
		insert:       function(model,index){
			if(_.isNull(index) || index > this.length) index = this.length; else index = (!this.length)? 0 : this.length;
			if(model instanceof Backbone.Mold) this.add(model);
		},
		cast:         function(model,collection,options){
			_.log('alloy cast');
		},
		search:       function(test) {
			return this.filter(function(model) { return model.match(test); });
		}
	}));
	return Foundry;
});
