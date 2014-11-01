define(["jquery","underscore","backbone"], function($,_,Backbone){
	var EditorView = Backbone.Layout.extend(
		_.extend({
            id: 'editor',
            className: 'page',
			template: '#layout1',
			initialize: function(options){
				var self = this;
				_.log('new EditorView created');
                this.model = options.model;
			},
			afterRender: function(){
                this.$el.appendTo('.viewPort');
                this.delegateEvents();
			},
			views: {
				'.jumbotron': new Backbone.Layout({
					template: '#jumbotron2'
				}),
				'#section1': new Backbone.Layout({
					template: '#section-1'
				}),
				'#section2': new Backbone.Layout({
					template: '#section-2'
				}),
				'#section3': new Backbone.Layout({
					template: '#section-3'
				}),
				'.footer': new Backbone.Layout({
					template: '#footer'
				})
			}
		})
	);
	return EditorView;
});

