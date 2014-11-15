define(["jquery","underscore","backbone","Velocity","Velocity.ui"], function($,_,Backbone,Velocity){
	var Mercury = Backbone.Model.extend(_.extend({
		defaults: { status: 'not started',view: null },
		initialize:     function(options){this.listenTo(this,'change:status',this.update);this.listenTo(this,'end',this.fin); },
		update:         function(){ _.log('update: '+this.get('status')); },
		start:          function(view,dir){
			this.set({status:'started',view:view});
			var def = $.Deferred(), Hg = this, sequence = Hg.sequence();
			if(_.isEmpty(sequence)) Hg.animate(view,{right:(dir==='in')?0:'100%'}).then(function(){
				def.resolveWith(view,[view]);
			});
			else this.run(sequence).then(function(){ def.resolveWith(view,[view]); });
			return def.promise();
		},
		sequence:       function(active,next,steps){},
		run:            function(){ var Hg = this, view = Hg.get('view'); return $.Velocity.RunSequence(sequence); },
		animate:        function(view,props,opts,then){
			opts = opts || {};
			then = (_.isFunction(then))? then : _.noop;
			var def = $.Deferred(), Hg = this;
			$.Velocity.animate(view.$el,props,opts).then(function(){
				then.call(Hg);
				def.resolveWith(view,[view]);
			});
			return def.promise();
		},
		end:            function(){ this.set({status:'finished'}); this.trigger('end',this.get('view')); },
		fin:            function(view){ _.log(view.id+' fin.'); }
	}));
	return Mercury;
});
