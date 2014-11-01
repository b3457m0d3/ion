define(['jquery','underscore','backbone','mCustomScrollbar'], function($, _, Backbone){
	var FinderView = Backbone.View.extend({
		initialize: function(){
            this.nodeSource = this.model.nodeSource;
            this.nodeIcons = this.model.get('icons');
            this.nodeHandlers = this.model.get('fileTypes');
            this.render();
		},
		render: function(){
			this.$el.hColumns({
                nodeSource: this.nodeSource,
                customNodeTypeIndicator: this.nodeIcons,
                customNodeTypeHandler: this.nodeHandlers
            });
            this.$(".column").mCustomScrollbar({
                setHeight:350,
                theme:"minimal-dark"
            });
			return this;
		}

	});
    return FinderView;
});
