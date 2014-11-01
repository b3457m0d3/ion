define(["jquery","underscore","backbone","EditorModel","EditorView"],
  function($,_,Backbone,EditorModel,EditorView){
	var Editor = {};
    Editor.Model  = new EditorModel({
        name: 'editor',
        title: 'Editor',
        el: '.viewPort'
	});
    Editor.View = new EditorView({model:Editor.Model});
    Editor.View.model.set({layout:Editor.View});
	return Editor;
});
