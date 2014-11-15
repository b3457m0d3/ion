define(["jquery","underscore","backbone"], function($,_,Backbone){
	var Forge = function(options){
		this.cid     = _.uniqueId('Foundry-');
		this.foundry = new Backbone.Foundry();
		this.def     = $.Deferred();
		this.initialize.apply(this, arguments);
	};
	_.extend(Forge.prototype, {
		initialize:     function(options){ this.prev = this.curr = null; },
		install:        function(mold,index){ this.foundry.insert(mold,index); },
		goto:           function(name,I,O){
			var self = this, pr = null, nx = this.cast(name);
			if (!_.isNull(this.curr)){
				pr=this.cast(this.curr);
				O.start(pr).then(function(){
					self.prev=this.id;
					_.log('out');
				});
			}
			nx.render().then(function(){ this.$el.append(next.$el);
				I.start(this,'in').then(function(){
					self.curr=this.id;
					_.log(self.curr+':tIn');
					self.def.resolveWith(this,[this]);
				});
			});
			return self.def.promise();
		},
		cast:           function(name){
			var m=this.foundry.findWhere({'name':name});
			if(this.isMold(m)) return(this.isLayout(m.get('layout'))) ? m.get('layout') : 0;
		},
		isMold:         function(obj){ return obj instanceof Backbone.Mold;  },
		isLayout:       function(obj){ return obj instanceof Backbone.Ion;   }
	});
	return new Forge();
});
