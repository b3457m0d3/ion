define(["jquery","underscore","backbone","IndexModel","IndexView"],
  function($,_,Backbone,IndexModel,IndexView){
    var Flag = Backbone.Model.extend({ /* ... */ }),
        City = Backbone.Model.extend({ /* ... */ }),
        Cities = Backbone.Collection.extend({ model: City });
    Backbone.entangle(IndexModel,{
        flag: { type: Flag }, //Flag is a model (hasOne)
        cities: { type: Cities } // Cities is a collection (hasMany)
    });
	var Index = {};
    Index.Model  = new IndexModel({
        name: 'index',
        title: 'Home',
        el: '.viewPort',
        flag: {
            colors: ['red','white']
        },
        cities: [
            { name: 'Calgary' },
            { name: 'Regina' }
        ]
	});
    _.each(Index.Model.cities().at(1),function(city){
        if(_.has(city,'name')) _.log(city.name);
    });
    Index.View = new IndexView.Layout({model:Index.Model});
    Index.View.model.set({layout:Index.View});
	return Index;
});
