define(["jquery","underscore","backbone"], function($,_,Backbone){
    var IndexView = {};
	IndexView.Layout = Backbone.Layout.extend(
		_.extend({
            id: 'index',
            className: 'page',
            template: '#layout1',
            views: {
                '.jumbotron': new Backbone.Layout({ template:'#jumbotron' }),
                '#section1' : new Backbone.Layout({ template:'#section-1' }),
                '#section2' : new Backbone.Layout({ template:'#section-2' }),
                '#section3' : new Backbone.Layout({ template:'#section-3' }),
                '.footer'   : new Backbone.Layout({ template:'#footer' })
            },
            bonds: {
                'check #checkme': 'checked',
                'value #typehere': 'text'
            },
			initialize: function(options){
                this.model = options.model;
			},
            afterRender: function(){
                this.$el.appendTo('.viewPort');
                this.delegateEvents();
                this.bond();
            }
		})
	);
	return IndexView;
});
