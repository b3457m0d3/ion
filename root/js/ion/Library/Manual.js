define(["jquery","underscore","backbone"], function($,_,Backbone){
	Manual = new Backbone.Collection({
		model: Backbone.Model.extend({ defaults: { name: null, ver: '0.0.0', link: null } }),
		initialize: function(){
			this.add([
				{name:'Associations'},
				{name:'Backbone',ver:'1.1.2'},
				{name:'Bbq'},
				{name:'Controller'},
				{name:'Forge'},
				{name:'Foundry'},
				{name:'Fwd'},
				{name:'Global'},
				{name:'Hg',ver:'0.0.1'},
				{name:'Intercept',ver:'0.3.1'},
				{name:'LayoutManager',ver:'0.9.5'},
				{name:'Mettle'},
				{name:'Mold',ver:'0.0.1'},
				{name:'Ribs'},
				{name:'Velocity',ver:'1.1.0'},
				{name:'Velocity-UI',ver:'5.0.0'}
			]);
		}
	});
	return Manual;
});
