Backbone.Session = Backbone.Model.extend(_.extend({ //modify to use jquery cookie
	url: function(){ return this.options.host + "/session" },
	defaults : { auth: 0, updated: 0 },
	state: false,
	options: { local: true, remote: true, persist: false, host: "" },
	initialize: function( model, options ){
		_.bindAll(this, "logout", "cache", "update"); options = options || {}; this.options = _.extend(this.options, options);
		if( !_.isUndefined(options.url) ) this.url = options.url;
		if( !this.options.persist && typeof sessionStorage!="undefined"&&sessionStorage!==null)this.store=this.sessionStorage;
		else if( this.options.persist&&typeof localStorage!="undefined"&&localStorage!==null) this.store=this.localStorage;
		else this.store=this.cookie;
		var localSession = this.store.get("session");
		if( _.isNull(localSession)) this.fetch(); else {this.set(JSON.parse(localSession) );this.set({updated:0});this.save();}
		this.bind("change",this.update); this.bind("error", this.error); this.on("logout", this.logout);
	},
	parse: function( data ) {
		if( _.isNull(data) ) return;
		if( typeof data.updated == "undefined" ) data.updated = ( new Date() ).getTime();
		if( !data.id) data.id = this.generateUid();
		return data;
	},
	sync: function(method, model, options) {
		options = options || {};
		switch(method){
			case "read": break; case "update": /*this.store.set("session", JSON.stringify( model.toJSON() ) );*/ break;
		}
		if( !this.options["remote"] ) return this.update();
		return Backbone.sync.call(this, method, model, options);
	},
	update: function(){
		if(!this.state){this.state=!0;this.trigger("loaded"); } if(this.get("updated")||!this.options["remote"] )this.cache();
	},
	cache: function(){ this.store.set("session", JSON.stringify( this.toJSON() ) ); },
	logout: function( options ) {
		var self = this; options = options || {};  this.store.clear("session");
		this.destroy({
			wait: true,
			success: function (model, resp) {
				model.clear(); model.id = null;
				self.set({auth: false});
				if( resp && resp._csrf) self.set({_csrf: resp._csrf});
				if( options.reload ) window.location.reload();
			}
		});
	},
	error: function( model, req, options, error ){ console.log( req ); },
	sessionStorage : {
		get : function( name ) { return sessionStorage.getItem( name ); },
		set : function( name, val ){ return sessionStorage.setItem( name, val ); },
		check : function( name ){ return ( sessionStorage.getItem( name ) == null ); },
		clear: function( name ){ return sessionStorage.removeItem( name ); }
	},
	localStorage : {
		get : function( name ) { return localStorage.getItem( name ); },
		set : function( name, val ){ return localStorage.setItem( name, val ); },
		check : function( name ){ return ( localStorage.getItem( name ) == null ); },
		clear: function( name ){ return localStorage.removeItem( name ); }
	},
	cookie : {
		get : function( name ) {
			var i,key,value,cookies=document.cookie.split(";");
			for (i=0;i<cookies.length;i++){
				key=cookies[i].substr(0,cookies[i].indexOf("="));value=cookies[i].substr(cookies[i].indexOf("=")+1);key=key.replace(/^\s+|\s+$/g,"");
				if (key==name) return unescape(value);
			}
		},
		set : function( name, val ){
			var expiry = 86400000, date = new Date( ( new Date() ).getTime() + parseInt(expiry) );
			var value=escape(val) + ((expiry==null) ? "" : "; expires="+date.toUTCString());
			document.cookie=name + "=" + value;
		},
		check : function( name ){ var cookie=this.get( name ); return (cookie!=null && cookie!="")?true:false; },
		clear: function( name ) { document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;'; }
	},
	generateUid : function (separator) {
		var delim = separator || "-";
		function S4() { return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1); }
		return (S4() + S4() + delim + S4() + delim + S4() + delim + S4() + delim + S4() + S4() + S4());
	}
}));
