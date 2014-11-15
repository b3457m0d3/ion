define(["jquery","underscore","backbone","Mold"], function($, _, Backbone,Mold){
	var EditorModel = Mold.extend(
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
