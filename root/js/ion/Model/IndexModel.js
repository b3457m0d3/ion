define(["jquery","underscore","backbone"], function($, _, Backbone){
	var IndexModel = Backbone.Mold.extend(
		_.extend({
			defaults:{
				id:       _.uniqueId('index_'),
				el:       null,
				views:    null,
                checked:  false
			},
			initialize: function(){
                this.log('bienvenue');
                this.listenTo(this, 'change:checked', this.logChecked );
			},
            logChecked: function(){
                _.log('checkbox changed');
            }
		})
	);
	return IndexModel;
});
