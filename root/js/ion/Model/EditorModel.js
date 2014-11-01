define(["jquery","underscore","backbone"], function($, _, Backbone){
	var EditorModel = Backbone.Mold.extend(
		_.extend({
			defaults:{
				id:       _.uniqueId('index_'),
				el:       null,
				views:     null
			},
			initialize: function(){
                this.log('bienvenue');
			}
		})
	);
	return EditorModel;
});