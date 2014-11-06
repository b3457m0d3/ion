define(["jquery","underscore","backbone","Index","Editor","Controller"],
  function($,_,Backbone,Index,Editor){
    var Main = Backbone.Controller.extend(
        _.extend({
            initialize:    function(){
                //add any relevant page molds to the forge
                Backbone.Forge.install(Index.Model);
                Backbone.Forge.install(Editor.Model);
                //setup default transitions
                /*
                * example sequence:
                * var next = nextView;
                * var prev = prevView;
                * var mySequence = [
                *    { elements: prevView.$('#element1'), properties: { translateX: 100 }, options: { duration: 1000 } },
                *    { elements: view.$('#element2'), properties: { translateX: 200 }, options: { duration: 1000 } }
                * ]
                * run it:
                * $.Velocity.RunSequence(mySequence).then(function(){
                *   //do Something...
                * });
                */
                this.trans = {
                    in: new Backbone.Mercury({}),
                    out: new Backbone.Mercury({})
                };
            },
            onBeforeRoute: function(){},
            onAfterRoute:  function(){},
            routes: {
                ''        : 'index',
                'editor'  : 'editor'
            },
            index: function() {
                Backbone.Forge.goto('index',this.trans.in,this.trans.out).then(function(){
                    // this refers to the view, allowing direct access to the Backbone.Layout instance
                    // update sections and add new event listeners
                    _.log(this.id+' loaded');
                });
            },
            editor: function() {
                Backbone.Forge.goto('editor',this.trans.in,this.trans.out).then(function(){
                    _.log('editor loaded');
                });
            }
        })
    );
    return Main;
});
