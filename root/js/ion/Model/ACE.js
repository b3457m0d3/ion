define(['jquery','underscore','backbone'],function($, _, Backbone){
	var ACE = Backbone.Model.extend({
		defaults: {
			name: 'model',
			ACE: '',
			file: '',
			content: '',
			options: [
				"ace/theme/github",
				"javascript"
			]
		},
		initialize: function(){
			this.on("change:content", function(model){
				var content = model.get("content");
				console.log(content);
			});
		},
		loadContent: function(array){
			this.set({
				file:array[0],
				content:array[1]
			});
		},
		getFile: function(){
			return this.get('file');
		},
		getContent: function(){
			return this.get('content');
		},
		getOpts: function(){
			return this.get('options');
		}
	});
	return ACE;
});
