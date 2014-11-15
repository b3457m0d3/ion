define(["jquery","underscore","backbone"], function($, _, Backbone){
	var IndexModel = Backbone.Mold.extend(
		_.extend({
			defaults:{
				id:       _.uniqueId('index_'),
				el:       null,
				views:    null,
                checked:  false,
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
	//define association types
	var Flag   = Backbone.Model.extend({ /* ... */ }),
		City   = Backbone.Model.extend({ /* ... */ }),
		Cities = Backbone.Collection.extend({ model: City });
	Backbone.associate(IndexModel,{//model (hasOne) : collection (hasMany)
		flag   : { type: Flag   },
		cities : { type: Cities }
	});
	return IndexModel;
});
