define(["jquery","underscore","backbone","Tabs","Layout","text!../templates/main.html"],
  function($,_,Backbone,Tabs,LayoutManager,template){
    Backbone.Layout = LayoutManager;
	var MainMenu = Backbone.Layout.extend({
		constructor: function(options){
			this.template = _.template(template);
			this.collection = new Tabs();
			this.collection.add([
				{ icon: 'fa fa-bolt' },
				{ icon: 'fa fa-search', label: 'Browse', content: '<div class="hcolumns"></div>' },
				{ icon: 'fa fa-gears' }
			]);
		},
        // RENDERING ===========================================================
        beforeRender: function() {
            /*this.collection.each(function() {
              this.insertView(new ListItemView());
            }, this);*/
        },
		render: function() {
			return this.template({ tabs: this.collection.toJSON() });
		},
        afterRender: function(){},
		events: {
			"click a.list-group-item" : "clickTab"
		},
		clickTab: function(event){
			event.preventDefault();
			var $self = $(event.currentTarget);
			$self.siblings('a.active').removeClass("active");
			$self.addClass("active");
			var index = $self.index();
			$("div.bhoechie-tab>div.bhoechie-tab-content").removeClass("active");
			$("div.bhoechie-tab>div.bhoechie-tab-content").eq(index).addClass("active");
		}
	});
	return MainMenu;
});
