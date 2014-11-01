define(["jquery","underscore","backbone","Index","Editor","Controller"],
  function($,_,Backbone,Index,Editor){
    var Main = Backbone.Controller.extend(
        _.extend({
            initialize:    function(){
                this.stack  = Backbone.Forge;
                this.stack.insert(Index.Model);
                this.stack.insert(Editor.Model);
                
            },
            onBeforeRoute: function(){
            },
            onAfterRoute:  function(){},
            routes: {
                ''        : 'index',
                'editor'  : 'editor'
            },
            index: function() {
                this.stack.goto('index');
            },
            editor: function(){
                this.stack.goto('editor');
            }
        })
    );
    return Main;
});
