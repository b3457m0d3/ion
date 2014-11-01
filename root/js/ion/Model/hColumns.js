define(['jquery','underscore','backbone'],function($, _, Backbone){
	var hColumns = Backbone.Model.extend({
		defaults: {
			icons: { template: "glyphicon glyphicon-file" },
			fileTypes: { template: this.template }
		},
		initialize: function(){

		},
		nodeSource: function(node_id, callback) {
			// if inital load
			if(node_id === null) {
				$.getJSON("/ckeditor/nodes",{},function(data){
					return callback(null, data);
				});
			} else {
				$.getJSON("/ckeditor/nodes/",{node_id: node_id},function(data){
					return callback(null, data);
				});
			}
		},
		template: function(hColumn, node, data) {
			$.post("/ckeditor/openFile/",{file:data.file},function(response){
				console.log(response);
			});
		}
	});
	return hColumns;
});
