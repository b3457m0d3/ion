define(["jquery","underscore","backbone"], function($,_,Backbone){
    var IndexView = {};
    IndexView.Layout = Backbone.Ion.extend(
        _.extend({
            id: 'index',
            className: 'page',
            template: '#layout1',
            views: {
                '.jumbotron': new Backbone.Ion({ template:'#jumbotron' }),
                '#section1' : new Backbone.Ion({ template:'#section-1' }),
                '#section2' : new Backbone.Ion({ template:'#section-2' }),
                '#section3' : new Backbone.Ion({ template:'#section-3' }),
                '.footer'   : new Backbone.Ion({ template:'#footer' })
            },
            bonds: { // view-model binding syntax: 'property selector':'attribute'
                'checked #checkme': 'checked',
                'value #typehere': 'text'
            },
            events: { // use keywords like 'listenTo' & 'transition'
                "listenTo test"  : "fire",
                'transition out' : {  },
                'transition in'  : {  }
            },
            initialize: function(options){// look ma, no listeners!
                this.model = options.model;
            },
            afterRender: function(){
                this.$el.appendTo('.viewPort');
                this.bond();
                Backbone.trigger('test','fdgjldfkjgldfkjgdlkfg');
            },
            fire: function(val){
                _.log(val);
            }
        })
    );
    return IndexView;
});
