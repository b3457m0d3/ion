define(["jquery","underscore","backbone","IndexModel","IndexView"],
  function($,_,Backbone,IndexModel,IndexView){
	var Index = {};
    Index.Model  = new IndexModel({
        name: 'index',
        title: 'Home',
        el: '.viewPort'
	});
    Index.View = new IndexView.Layout({model:Index.Model});
    Index.View.model.set({layout:Index.View});
	return Index;
});
