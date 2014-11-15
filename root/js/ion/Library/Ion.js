define(["jquery","underscore","backbone","bbq"], function($,_,Backbone,bbq){
	var aPush=Array.prototype.push,aConcat=Array.prototype.concat,aSplice=Array.prototype.splice,trim=String.prototype.trim?_.bind(String.prototype.trim.call,String.prototype.trim):$.trim;
	var ViewProto = Backbone.View.prototype;
	ViewProto.globalEventBus = Backbone;
	ViewProto.delegateEvents = _.wrap(ViewProto.delegateEvents, function(original, events) {
		original.call(this, events);
		if (!(events || (events = _.result(this, 'events')))) {
			return this;
		}
		_.each(events, function(handler, event) {
			var match = event.match(/^global\s(.*)/);
			if (match) {
				this.listenTo(this.globalEventBus, match[1], this[handler]);
			}
		}, this);
		return this; //original.call(this, events);
	});
	ViewProto.undelegateEvents = _.wrap(ViewProto.undelegateEvents, function(original, events) {
		var events = _.keys(this.events)
		_.each(events, function(event){
			if ( event.match(/global /) ){
				this.globalEventBus.off( event );
			}
		}, this);
		return original.call(this, events);
	});
	var ViewConstructor = Backbone.View;
	var Ion = Backbone.View.extend({
		_render:                 function() {
			var view = this;
			var manager = view.__manager__;
			var beforeRender = view.beforeRender;
			var def = view.deferred();
			if (view.hasRendered) view._removeViews();
			manager.callback = function() {
			delete manager.isAsync;
			delete manager.callback;
			view.trigger("beforeRender", view);
			view._viewRender(manager).render().then(function() {
				def.resolve();
			});
			};
			if (beforeRender) beforeRender.call(view, view);
			if (!manager.isAsync) manager.callback();
			return def.promise();
		},
		_applyTemplate:          function(rendered, manager, def) {
			if (_.isString(rendered)) {
			if (manager.noel) {
				rendered = $.parseHTML(rendered, true);
				this.$el.slice(1).remove();
				this.$el.replaceWith(rendered);
				this.setElement(rendered, false);
			} else {
				this.html(this.$el, rendered);
			}
			}
			def.resolveWith(this, [this]);
		},
		_viewRender:             function(manager) {
			var url, contents, def;
			var root = this;
			function done(context, template) {
			var rendered;
			manager.callback = function(rendered) {
				delete manager.isAsync;
				delete manager.callback;
				root._applyTemplate(rendered, manager, def);
			};
			Ion.cache(url, template);
			if (template) rendered = root.renderTemplate.call(root, template, context);
			if (!manager.isAsync) root._applyTemplate(rendered, manager, def);
			}
			return {
			render: function() {
				var context = root.serialize;
				var template = root.template;
				def = root.deferred();
				if (_.isFunction(context)) context = context.call(root);
				manager.callback = function(contents) {
				delete manager.isAsync;
				delete manager.callback;

				done(context, contents);
				};
				if (typeof template === "string") url = root.prefix + template;
				if (contents = Ion.cache(url)) {
				done(context, contents, url);
				return def;
				}
				if (typeof template === "string") {
				contents = root.fetchTemplate.call(root, root.prefix + template);
				} else if (typeof template === "function") {
				contents = template;
				} else if (template != null) {
				contents = root.fetchTemplate.call(root, template);
				}
				if (!manager.isAsync) done(context, contents);
				return def;
			}
			};
		},
		constructor:             function Layout(options) {
			this.manage = true;
			_.extend(this, options);
			Backbone.View.apply(this, arguments);
		},
		async:                   function() {
			var manager = this.__manager__;
			manager.isAsync = true;
			return manager.callback;
		},
		promise:                 function() {
			return this.__manager__.renderDeferred.promise();
		},
		then:                    function() {
			return this.promise().then.apply(this, arguments);
		},
		renderViews:             function(views) {
			var root = this;
			var manager = root.__manager__;
			var newDeferred = root.deferred();
			views = (views && _.isArray(views)) ? _.chain(views) : root.getViews(views);
			var promises = views.map(function(view) {
				return view.render().__manager__.renderDeferred;
			}).value();
			manager.renderDeferred = newDeferred.promise();
			root.when(promises).then(function() {
			newDeferred.resolveWith(root, [root]);
			});
			return root;
		},
		insertView:              function(selector, view) {
			if (view) return this.setView(selector, view, true);
			return this.setView(selector, true);
		},
		insertViews:             function(views) {
			if (_.isArray(views)) return this.setViews({ "": views });
			_.each(views, function(view, selector) {
				views[selector] = _.isArray(view) ? view : [view];
			});
			return this.setViews(views);
		},
		getView:                 function(fn) {
			if (fn == null) fn = arguments[1];
			return this.getViews(fn).first().value();
		},
		getViews:                function(fn) {
			var views;
			if (typeof fn === "string") {
			fn = this.sections[fn] || fn;
			views = this.views[fn] || [];
			return _.chain([].concat(views));
			}
			views = _.chain(this.views).map(function(view) {
			return _.isArray(view) ? view : [view];
			}, this).flatten();
			if (typeof fn === "object") return views.where(fn);
			return typeof fn === "function" ? views.filter(fn) : views;
		},
		removeView:              function(fn) {
			return this.getViews(fn).each(function(nestedView) {
			nestedView.remove();
			});
		},
		setView:                 function(name, view, insert) {
			var manager, selector;
			var root = this;
			if (typeof name !== "string") insert = view, view = name, name = "";
			manager = view.__manager__;
			if(!manager) throw new Error("arg assoc'd with selector '"+name+"' exists and is a View. Set manage: true on View instances.");
			manager.parent = root;
			selector = manager.selector = root.sections[name] || name;
			if (!insert) {
			if (root.getView(name) !== view) root.removeView(name);
			return root.views[selector] = view;
			}
			root.views[selector] = aConcat.call([], root.views[name] || [], view);
			root.__manager__.insert = true;
			return view;
		},
		setViews:                function(views) {
			_.each(views, function(view, name) {
			if (_.isArray(view)) {
				return _.each(view, function(view) {
				this.insertView(name, view);
				}, this);
			}
			this.setView(name, view);
			}, this);
			return this;
		},
		render:                  function() {
			var root = this;
			var manager = root.__manager__;
			var parent = manager.parent;
			var rentManager = parent && parent.__manager__;
			var def = root.deferred();
			function resolve() {
			_.each(root.views, function(views, selector) {
				if (_.isArray(views)) root.htmlBatch(root, views, selector);
			});
			if (parent && !manager.insertedViaFragment) {
				if (!root.contains(parent.el, root.el)) {
				parent.partial(parent.$el, root.$el, rentManager, manager);
				}
			}
			root.delegateEvents();
			root.hasRendered = true;
			manager.renderInProgress = false;
			delete manager.triggeredByRAF;
			if (manager.queue && manager.queue.length) {
				(manager.queue.shift())();
			} else {
				delete manager.queue;
			}
			function completeRender() {
				var console = window.console;
				var afterRender = root.afterRender;
				if (afterRender) afterRender.call(root, root);
				root.trigger("afterRender", root);
				if (manager.noel && root.$el.length > 1) {
				if (_.isFunction(console.warn) && !root.suppressWarnings) {
					console.warn("`el: false` with multiple top level elements is not supported.");
					if (_.isFunction(console.trace)) console.trace();
				}
				}
			}
			if (rentManager && (rentManager.renderInProgress || rentManager.queue)) {
				parent.once("afterRender", completeRender);
			} else {
				completeRender();
			}
			return def.resolveWith(root, [root]);
			}
			function actuallyRender() {
			root._render().done(function() {
				if (!_.keys(root.views).length) {
				return resolve();
				}
				var promises = _.map(root.views, function(view) {
				var insert = _.isArray(view);
				if (insert && view.length) {
					return root.when(_.map(view, function(subView) {
					subView.__manager__.insertedViaFragment = true;
					return subView.render().__manager__.renderDeferred;
					}));
				}
				return !insert ? view.render().__manager__.renderDeferred : view;
				});
				root.when(promises).done(resolve);
			});
			}
			manager.renderInProgress = true;
			root._registerWithRAF(actuallyRender, def);
			manager.renderDeferred = def;
			return root;
		},
		remove:                  function() {
			this.stopStateListener();
			Ion._removeView(this, true);
			return this._remove.apply(this, arguments);
		},
		_registerWithRAF:        function(callback, deferred) {
			var root = this;
			var manager = root.__manager__;
			var rentManager = manager.parent && manager.parent.__manager__;
			if (this.useRAF === false) {
			if (manager.queue) {
				aPush.call(manager.queue, callback);
			} else {
				manager.queue = [];
				callback();
			}
			return;
			}
			manager.deferreds = manager.deferreds || [];
			manager.deferreds.push(deferred);
			deferred.done(resolveDeferreds);
			this._cancelQueuedRAFRender();
			if (rentManager && rentManager.triggeredByRAF) return finish();
			manager.rafID = root.requestAnimationFrame(finish);
			function finish() {
			manager.rafID = null;
			manager.triggeredByRAF = true;
			callback();
			}
			function resolveDeferreds() {
			for (var i = 0; i < manager.deferreds.length; i++){
				manager.deferreds[i].resolveWith(root, [root]);
			}
			manager.deferreds = [];
			}
		},
		_cancelQueuedRAFRender:  function() {
			var root = this, manager = root.__manager__;
			if (manager.rafID != null) root.cancelAnimationFrame(manager.rafID);
		},
		// Framework Enhancements
		// Backbone.Bindings : view-model bindings
		bond:                    function(bonds){
			var rgx = /^(\S+)\s*(.*)$/;
			bonds = (_.isObject(bonds) && !_.isEmpty(bonds))? bonds : {};
			this.bonds = (_.isFunction(this.bonds))? _.extend({},_.result(this, 'bonds'), bonds) : _.extend({},this.bonds,bonds);
			if (!this.bonds || !this.model) return;
			this._bonds = this._bonds || {}; this.break();
			_.each(this.bonds, function(attribute, binding) {
				if (_.notArray(attribute)) attribute = [attribute, [null, null]];
				if (_.notArray(attribute[1])) attribute[1] = [attribute[1], null];
				if (this._bonds[binding]) throw new Error("'" + binding + "' is already bound to '" + attribute[0] + "'.");
				var match = binding.match(rgx),property = match[1],selector = match[2],el = (selector)?this.$(selector):this.$el,
					binder = this.Bonds[property] || this.Bonds['__attr__'],
					accessors = binder.call(this, this.model, attribute[0], property);
				if (!accessors) return;
				if (!_.isArray(accessors.get)) accessors.get = ['change', accessors.get];
				if (!accessors.get[1] && !accessors.set) return;
				var setTrigger = 'change:' + attribute[0],getTrigger = _.reduce(accessors.get[0].split(' '),function(memo,event){
					return memo + ' ' + event + '.modelBinding' + this.cid;
				}, '', this);
				var setTransformer = attribute[1][0] || _.identity, getTransformer = attribute[1][1] || _.identity;
				var set = _.bind(function(model, value, options){
					if (options && options.el && options.el.get(0) == el.get(0)) return;
					accessors.set.call(el, setTransformer.call(this, value));
				}, this), get = _.bind(function(event) {
					var value = getTransformer.call(this, accessors.get[1].call(el));
					this.model.set(attribute[0], value, { el: this.$(event.srcElement) });
				}, this);
				if (accessors.set) { this.model.on(setTrigger, set); set(this.model, this.model.get(attribute[0])); }
				if (accessors.get[1]) this.$el.on(getTrigger, selector, get);
				this._bonds[binding] = { selector: selector,getTrigger: getTrigger,setTrigger: setTrigger,get: get,set: set };
			}, this);
			return this;
		},
		break:                   function() {
			if (!this._bonds || !this.model) return;
			_.each(this._bonds, function(binding, key) {
				if (binding.get[1]) this.$el.off(binding.getTrigger, binding.selector);
				if (binding.set) this.model.off(binding.setTrigger, binding.set);
				delete this._bonds[key];
			}, this);
			return this;
		},
		// $.bbq : hash/state mgmt
		addStateListener:        function() {
			this.state  = this.state || {};
			this.sid = _.uniqueId('-state-');
			this.on('state:changed', this.stateChanged, this);
			$(window).on("hashchange", $.proxy(function(oldURL) {
				var newURL = window.location.href;
				var Params = { old: this.hashParams(oldURL), new: this.hashParams(newURL), changed: [] };
				for(var i in Params.new) if(Params.old[i] && Params.old[i] !== value) Params.changed.push(i);
				Params.changed = _.union(Params.changed, _.difference(_.keys(Params.new), _.keys(Params.old)));
				Params.changed = _.map(Params.changed, function(key){ return key.split(this.sid)[1]; },this);
				this.trigger('state:changed', Params); oldURL = window.location.href;
			}, this, window.location.href));
		},
		stopStateListener:       function(){
			$(window).off('hashchange');
			this.off('state:changed'); },
		hashParams:              function(url) {
			if (_.inStr(url,'#')) {
				var params = $.deparam(url.split('#')[1]);
				_.each(params, function(value, key) {
					if (!_.inStr(key,this.sid)) delete params[key];
				},this);
				return params;
			} return {};
		},
		getKey:                  function(key) {
			return this.id + this.sid + key;
		},
		getState:                function(key) {
			return $.bbq.getState(this.getKey(key));
		},
		removeState:             function(key){
			$.bbq.removeState(key);
		},
		changeState:             function(params) {
			_.each(params, function(value, key) { this.state[this.getKey(key)] = value; },this);
			$.bbq.pushState(this.state);
		},
		stateChanged:            function(params) {
			if (_.has(params.new, 'editor')) _.log('editor');
		}
	},{
		_cache: {},
		_removeViews: function(root, force) {
			if (typeof root === "boolean") {
			force = root;
			root = this;
			}
			root = root || this;
			root.getViews().each(function(view) {
			if (view.hasRendered || force) {
				Ion._removeView(view, force);
			}
			});
		},
		_removeView: function(view, force) {
			var parentViews;
			var manager = view.__manager__;
			var rentManager = manager.parent && manager.parent.__manager__;
			var keep = typeof view.keep === "boolean" ? view.keep : view.options.keep;
			if ((!keep && rentManager && rentManager.insert === true) || force) {
			Ion.cleanViews(view);
			view._removeViews(true);
			view.$el.remove();
			view._cancelQueuedRAFRender();
			if (!manager.parent) { return; }
			parentViews = manager.parent.views[manager.selector];
			if (_.isArray(parentViews)) {
				return _.each(_.clone(parentViews), function(view, i) {
				if (view && view.__manager__ === manager) {
					aSplice.call(parentViews, i, 1);
				}
				});
			}
			delete manager.parent.views[manager.selector];
			}
		},
		cache: function(path, contents) {
			if (path in this._cache && contents == null) {
			return this._cache[path];
			} else if (path != null && contents != null) {
			return this._cache[path] = contents;
			}
		},
		cleanViews: function(views) {
			_.each(aConcat.call([], views), function(view) {
				view.unbind();
				if (view.model instanceof Backbone.Model) view.model.off(null, null, view);
				if (view.collection instanceof Backbone.Collection) view.collection.off(null, null, view);
				view.stopListening();
				if (_.isFunction(view.cleanup)) view.cleanup();
			});
		},
		configure: function(options) {
			_.extend(Ion.prototype, options);
			if (options.manage) Backbone.View.prototype.manage = true;
			if (options.el === false) Backbone.View.prototype.el = false;
			if (options.suppressWarnings === true)  Backbone.View.prototype.suppressWarnings = true;
			if (options.useRAF === false) Backbone.View.prototype.useRAF = false;
		},
		setupView: function(views, options) {
			options = _.extend({}, options);
			_.each(aConcat.call([], views), function(view) {
			if (view.__manager__) return;
			var views, declaredViews;
			var proto = Ion.prototype;
			_.defaults(view, {
				views: {}, sections: {}, __manager__: {},
				_removeViews: Ion._removeViews,
				_removeView: Ion._removeView
			}, Ion.prototype);
			view.options = options;
			_.extend(view, options);
			view._remove = Backbone.View.prototype.remove;
			view.render = Ion.prototype.render;
			if (view.remove !== proto.remove) {
				view._remove = view.remove;
				view.remove = proto.remove;
			}
			views = options.views || view.views;
			if (_.keys(views).length) {
				declaredViews = views;
				view.views = {};
				_.each(declaredViews, function(declaredView, key) {
				if (typeof declaredView === "function") {
					declaredViews[key] = declaredView.call(view, view);
				}
				});
				view.setViews(declaredViews);
			}
			});
		}
	});
	Backbone.View.prototype.constructor = function(options) {
		var noel;
		options = options || {};
		if ("el" in options ? options.el === false : this.el === false) noel = true;
		if (options.manage || this.manage) Ion.setupView(this, options);
		if (this.__manager__) {
			this.__manager__.noel = noel;
			this.__manager__.suppressWarnings = options.suppressWarnings;
		}
		ViewConstructor.apply(this, arguments);
	};
	Backbone.View = Backbone.View.prototype.constructor;
	Backbone.View.extend = ViewConstructor.extend;
	Backbone.View.prototype = ViewConstructor.prototype;
	_.extend(Ion.prototype, {
		Bonds: {
			'value': function(model, attribute, property) {
				return { get:['change keyup',function(){return this.val(); }],set: function(value) { this.val(value); } };
			},
			'text': function(model, attribute, property) {
				return { get: ['change',function(){return this.text(); }],set:function(value){ this.text(value); } };
			},
			'html': function(model, attribute, property) {
				return { get:['change',function(){return this.html();}],set:function(value){this.html(value);} };
			},
			'class': function(model, attribute, property) {
				return {
					set: function(value) {
						if (this._previousClass) this.removeClass(this._previousClass);
						this.addClass(value);
						this._previousClass = value;
					}
				};
			},
			'checked': function(model, attribute, property) {
				return {get:['change',function(){return this.prop('checked');}],set:function(value){this.prop('checked',!!value);}};
			},
			'__attr__': function(model, attribute, property) {
				return { set: function(value) { this.attr(property, value); } };
			}
		},
		prefix: "", useRAF: true,
		deferred: function() {
			return $.Deferred();
		},
		fetchTemplate: function(path) {
			return _.template($(path).html());
		},
		renderTemplate: function(template, context) {
			return trim(template.call(this, context));
		},
		serialize: function() {
			return this.model ? _.clone(this.model.attributes) : {};
		},
		partial: function($root, $el, rentManager, manager) {
			var $filtered;
			if (manager.selector) {
			if (rentManager.noel) {
				$filtered = $root.filter(manager.selector);
				$root = $filtered.length ? $filtered : $root.find(manager.selector);
			} else $root = $root.find(manager.selector);
			}
			if (rentManager.insert) this.insert($root, $el);
			else this.html($root, $el);
		},
		html: function($root, content) {
			$root.html(content);
		},
		htmlBatch: function(rootView, subViews, selector) {
			var rentManager = rootView.__manager__;
			var manager = { selector: selector };
			var els = _.reduce(subViews, function(memo, sub) {
			var keep = typeof sub.keep === "boolean" ? sub.keep : sub.options.keep;
			var exists = keep && $.contains(rootView.el, sub.el);
			if (sub.el && !exists) memo.push(sub.el);
			return memo;
			}, []);
			return this.partial(rootView.$el, $(els), rentManager, manager);
		},
		insert: function($root, $el) {
			$root.append($el);
		},
		when: function(promises) {
			return $.when.apply(null, promises);
		},
		contains: function(parent, child) {
			return $.contains(parent, child);
		},
		requestAnimationFrame: (function() {
			var lastTime = 0;
			var vendors = ["ms", "moz", "webkit", "o"];
			var requestAnimationFrame = window.requestAnimationFrame;
			for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
				requestAnimationFrame = window[vendors[i] + "RequestAnimationFrame"];
			}
			if (!requestAnimationFrame){
				requestAnimationFrame = function(callback) {
					var currTime = new Date().getTime();
					var timeToCall = Math.max(0, 16 - (currTime - lastTime));
					var id = window.setTimeout(function() {
					callback(currTime + timeToCall);
					}, timeToCall);
					lastTime = currTime + timeToCall;
					return id;
				};
			}
			return _.bind(requestAnimationFrame, window);
		})(),
		cancelAnimationFrame: (function() {
			var vendors = ["ms", "moz", "webkit", "o"];
			var cancelAnimationFrame = window.cancelAnimationFrame;
			for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
			cancelAnimationFrame = window[vendors[i] + "CancelAnimationFrame"] || window[vendors[i] + "CancelRequestAnimationFrame"];
			}
			if (!cancelAnimationFrame) cancelAnimationFrame = function(id) { clearTimeout(id); };
			return _.bind(cancelAnimationFrame, window);
		})()
	});
	return Ion;
});
