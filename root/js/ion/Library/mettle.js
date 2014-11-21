define(["mettle","bbq","Velocity","Velocity.ui"], function(Backbone,bbq,Velocity) {
    var aPush=Array.prototype.push,aConcat=Array.prototype.concat,aSplice=Array.prototype.splice,trim=String.prototype.trim?_.bind(String.prototype.trim.call,String.prototype.trim):$.trim;
    var push = Array.prototype.push, slice = Array.prototype.slice, eventSplitter = /\s+/;
    var Backbone = window.Backbone = Backbone;
    var ViewProto = Backbone.View.prototype;
    ViewProto.globalEventBus = Backbone;
    ViewProto.delegateEvents = _.wrap(ViewProto.delegateEvents, function(original, events) {
        original.call(this, events);
        if (!(events || (events = _.result(this, 'events')))) {
            return this;
        }
        _.each(events, function(handler, event) {
            var globals = event.match(/^global\s(.*)/);
            var transitions = event.match(/^transition\s(.*)/);
            if (globals) {
                this.listenTo(this.globalEventBus, globals[1], this[handler]);
            }
            if (transitions) {
                var direction = _.last(_.words(event));
                _.log(direction);
                this.transitions = this.transitions || {};
                this.transitions[direction] = handler;
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
    Backbone.Ion  = Backbone.View.extend({
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
            Backbone.Ion.cache(url, template);
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
                if (contents = Backbone.Ion.cache(url)) {
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
            Backbone.Ion._removeView(this, true);
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
                Backbone.Ion._removeView(view, force);
            }
            });
        },
        _removeView: function(view, force) {
            var parentViews;
            var manager = view.__manager__;
            var rentManager = manager.parent && manager.parent.__manager__;
            var keep = typeof view.keep === "boolean" ? view.keep : view.options.keep;
            if ((!keep && rentManager && rentManager.insert === true) || force) {
            Backbone.Ion.cleanViews(view);
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
            _.extend(Backbone.Ion.prototype, options);
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
            var proto = Backbone.Ion.prototype;
            _.defaults(view, {
                views: {}, sections: {}, __manager__: {},
                _removeViews: Backbone.Ion._removeViews,
                _removeView: Backbone.Ion._removeView
            }, Backbone.Ion.prototype);
            view.options = options;
            _.extend(view, options);
            view._remove = Backbone.View.prototype.remove;
            view.render = Backbone.Ion.prototype.render;
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
        if (options.manage || this.manage) Backbone.Ion.setupView(this, options);
        if (this.__manager__) {
            this.__manager__.noel = noel;
            this.__manager__.suppressWarnings = options.suppressWarnings;
        }
        ViewConstructor.apply(this, arguments);
    };
    Backbone.View = Backbone.View.prototype.constructor;
    Backbone.View.extend = ViewConstructor.extend;
    Backbone.View.prototype = ViewConstructor.prototype;
    _.extend(Backbone.Ion.prototype, {
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
    var Computed = function (data, name, model) {
        this.name = name;
        if (typeof data === 'function') {
            this.get = function () {return data.apply(model);};
            this.set = function () {
                throw new Error('set: computed "' + name + '" has no set method');
            };
            this._simple = true;
            return this;
        }
        this._deps = data.deps;
        this._get = data.get;
        this.set = function () {return data.set.apply(model, arguments);};
        this._model = model;
        return this;
    };
    _.extend(Computed.prototype, {
        update: function (options) {
            if (this._simple) {
                return;
            }
            var deps = [], val;
            this._previous = this.value;
            if (this._deps instanceof Array) {
                for (var i = 0, l = this._deps.length; i < l; i++) {
                    try {
                        val = this._model.get(this._deps[i]);
                    } catch (e) {
                        val = undefined;
                    }
                    deps.push(val);
                }
            }
            this.value = this._get.apply(this._model, deps);
            if (!_.isEqual(this._previous, this.value)) {
                this._model.trigger('change:' + this.name, this._model, this.value, options);
            }
        },
        get: function () {
            return this.value;
        }
    });
    Backbone.associate = function (klass, associations) {
        var proto = klass.prototype;
        if (!proto._associations) {
            _.wrapMethod(proto, _.initWrapper, 'initialize');
            proto._associations = {};
        }
        _.extend(proto._associations, associations);
    };
    Backbone.dissociate = function (klass) {
        var proto = klass.prototype;
        proto.initialize.unwrap();
        proto._associations = null;
    };
    Backbone.Model = Backbone.Model.extend(_.extend({
        _super:          Backbone.Model,
        constructor:     function(attributes, options) {
            this.cid = _.uniqueId('c');
            this._comps = { computeds: {},computedsDeps: {} };
            var attrs = attributes || {};
            options = options || {};
            this.attributes = {};
            if (options.collection) {
                this.collection = options.collection;
            }
            if (options.parse) {
                attrs = this.parse(attrs, options) || {};
            }
            attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
            var escapedAttrs = {};
            for (var attr in attrs) {
                if (attrs.hasOwnProperty(attr)) {
                    escapedAttrs[attr.replace(/\./g, '!.')] = attrs[attr];
                }
            }
            this.set(escapedAttrs, options);
            this.changed = {};
            this._initComputeds();
            this.initialize.apply(this, arguments);
        },
        get:             function (attr) {
            if (typeof attr !== 'string') {
                return undefined;
            }
            var computeds = this._comps.computeds;
            if (attr in computeds) {
                return computeds[attr].get();
            }
            var path = _.split(attr);
            if (path.length === 1) {
                return this.attributes[path[0]];
            } else {
                return _.getPath(path, this.attributes);
            }
        },
        set:             function (key, val, options) {
            if (key == null) {
                return this;
            }
            var attrs,changes,changing,current,prev,silent,unset,path,escapedPath,attr,i,j,l;
            if (typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                attrs = {};
                attrs[key] = val;
            }
            options || (options = {});
            if (!this._validate(attrs, options)) {
                return false;
            }
            unset           = options.unset;
            silent          = options.silent;
            changes         = [];
            changing        = this._changing;
            this._changing  = true;
            var computeds = this._comps.computeds,realAttrs = _.clone(attrs),computedsAttrs = {},newAttrs,hasComputed = true,firstLoop = true;
            while (hasComputed) {
                hasComputed = false;
                newAttrs = {};
                for (attr in attrs) {
                    if (attrs.hasOwnProperty(attr)) {
                        if (attr in computeds) {
                            hasComputed = true;
                            _.extend(newAttrs, computeds[attr].set(attrs[attr]));
                            if (firstLoop) {
                                computedsAttrs[attr] = attrs[attr];
                            }
                            delete attrs[attr];
                            _.extend(attrs, newAttrs);
                        }
                    }
                }
                firstLoop = false;
            }
            if (!changing) {
                this._previousAttributes = _.clone(this.attributes);
                var previousComputeds = {};
                for (attr in computeds) {
                    if (computeds.hasOwnProperty(attr)) {
                        previousComputeds[attr] = computeds[attr].value;
                    }
                }
                _.extend(this._previousAttributes, previousComputeds);
                this.changed = {};
            }
            current = this.attributes;
            prev = this._previousAttributes;
            if (this.idAttribute in attrs) {
                this.id = attrs[this.idAttribute];
            }
            for (attr in attrs) {
                if (attrs.hasOwnProperty(attr)) {
                    val = attrs[attr];
                    path = _.split(attr);
                    if (!_.isEqual(_.getPath(path, current), val)) {
                        escapedPath = path.slice();
                        for (i = 0; i < escapedPath.length; i++) {
                            escapedPath[i] = escapedPath[i].replace(/\./g, '!.');
                        }
                        changes.push({
                            path: path,
                            escapedPath: escapedPath,
                            attr: attr,
                            val: val
                        });
                    }
                    if (!_.isEqual(_.getPath(path, prev), val)) {
                        this.changed[attr] = val;
                    } else {
                        delete this.changed[attr];
                    }
                    if (unset && (attr in realAttrs)) {
                        _.deletePath(path, current);
                    } else {
                        this._setPath(path, val);
                    }
                }
            }
            for (attr in computedsAttrs) {
                if (computedsAttrs.hasOwnProperty(attr) && unset) {
                    this.removeComputed(attr);
                    delete computedsAttrs[attr];
                }
            }
            var computedsDeps = this._comps.computedsDeps,computedsToUpdate = [],deps,dep;
            for (i = 0, l = changes.length; i < l; i++) {
                attr = changes[i].attr;
                deps = computedsDeps['change:' + attr];
                if (deps) {
                    for (j = 0; j < deps.length; j++) {
                        dep = deps[j];
                        if (computedsToUpdate.indexOf(dep) === -1) {
                            computedsToUpdate.push(dep);
                        }
                    }
                }
            }
            if (!silent) {
                l = changes.length;
                if (l) {
                    this._pending = options;
                }
                for (i = 0; i < l; i++) {
                    this.trigger('change:' + changes[i].attr, this, changes[i].val, options);
                    if (options.propagation) {
                        escapedPath = changes[i].escapedPath.slice();
                        if (escapedPath.length) {
                            while (escapedPath.length - 1) {
                                escapedPath.length--;
                                this.trigger('change:' + escapedPath.join('.'), this, undefined, options);
                            }
                        }
                    }
                }
            }

            for (i = 0; i < computedsToUpdate.length; i++) {
                computeds[computedsToUpdate[i]].update(options);
            }
            if (changing) {
                return this;
            }
            if (!silent) {
                while (this._pending) {
                    options = this._pending;
                    this._pending = false;
                    this.trigger('change', this, options);
                }
            }
            this._pending = false;
            this._changing = false;
            return this;
        },
        trigger:         function(name) {
            var computedsDeps = this._comps.computedsDeps, options = arguments[3], i, l;
            if (typeof name === 'string' && name in computedsDeps) {
                var computeds = this._comps.computeds, deps = computedsDeps[name],computed;
                for (i = 0, l = deps.length; i < l; i++) {
                    computed = computeds[deps[i]];
                    computed.update(options);
                }
            }
            if (options && options.silent) {
                return this;
            }
            return Backbone.trigger(arguments);
        },
        _setPath:        function (path, val) {
            var attr = this.attributes, p;
            path = path.slice();
            while (path.length) {
                p = path.shift();
                if (path.length) {
                    if (!(attr.hasOwnProperty(p) && attr[p] instanceof Object)) {
                        throw new Error('set: can\'t set anything to "' + p + '", typeof == "' + typeof attr[p] + '"');
                    }
                    attr = attr[p];
                } else {
                    attr[p] = val;
                }
            }
        },
        _initComputeds:  function () {
            var computeds = this.computeds, name;
            for (name in computeds) {
                if (computeds.hasOwnProperty(name)) {
                    this.addComputed(name, computeds[name], {silent: true});
                }
            }
            for (name in computeds) {
                if (computeds.hasOwnProperty(name)) {
                    this._comps.computeds[name].update();
                }
            }
        },
        addComputeds:    function (key, val, options) {
            var computedsDeps = this._comps.computedsDeps, deps, dep, computed, computedsDep, silent, depArr, nextDepArr,
                name, attrs, i, j, l1, l2;
            if (typeof key === 'string') {
                attrs = {};
                attrs[key] = val;
            } else {
                options = val;
                attrs = key;
            }
            silent = options && options.silent;
            for (name in attrs) {
                if (attrs.hasOwnProperty(name)) {
                    if (this.attributes[name] || this._comps.computeds[name]) {
                        throw new Error('addComputeds: computed name "' + name + '" is already used');
                    }
                    computed = attrs[name];
                    deps = computed.deps;
                    if (deps instanceof Array) {
                        for (i = 0, l1 = deps.length; i < l1; i++) {
                            depArr = _.split(deps[i]);
                            dep = 'change:' + depArr[0].replace(/\./g, '!.');

                            for (j = 0, l2 = depArr.length; j < l2; j++) {
                                computedsDep = computedsDeps[dep];

                                if (computedsDep) {
                                    if (computedsDep.indexOf(name) === -1) {
                                        computedsDep.push(name);
                                    }
                                } else {
                                    computedsDeps[dep] = [name];
                                }

                                nextDepArr = depArr[j + 1];

                                if (nextDepArr) {
                                    dep += '.' + nextDepArr.replace(/\./g, '!.');
                                }
                            }
                        }
                    }
                    computed = this._comps.computeds[name] = new Computed(computed, name, this);
                    if (!silent) {
                        computed.update();
                    }
                }
            }
            return this;
        },
        addComputed:     function () {
            this.addComputeds.apply(this, arguments);
        },
        removeComputed:  function (name) {
            this.removeComputeds(name);
        },
        removeComputeds: function (names) {
            if (!names) {
                this._comps.computedsDeps = {};
                this._comps.computeds = {};
                return this;
            }
            if (!(names instanceof Array)) {
                names = [names];
            }
            var computedsDeps = this._comps.computedsDeps,dep, attr, index, name, i, l;
            for (i = 0, l = names.length; i < l; i++) {
                name = names[i];
                for (attr in computedsDeps) {
                    if (computedsDeps.hasOwnProperty(attr)) {
                        dep = computedsDeps[attr];
                        index = dep.indexOf(name);
                        if (index !== -1) {
                            dep.splice(index, 1);
                        }
                        if (!dep.length) {
                            delete computedsDeps[attr];
                        }
                    }
                }
                delete this._comps.computeds[name];
            }
            return this;
        },
        toJSON:          function (options) {
            var json = Backbone.Model.toJSON.apply(this, arguments);
            if (options && options.computeds) {
                var computeds = this._comps.computeds,computed;
                for (var name in computeds) {
                    if (computeds.hasOwnProperty(name)) {
                        computed = computeds[name];
                        json[name] = computed._simple ? computed.get() : computed.value;
                    }
                }
            }
            return json;
        },
        log:             function(){
            console.log.apply(console,['['+this.cid+']'].concat([].splice.call(arguments, 0)));
        },
        match:           function(){
            return _.any(this.attributes,function(attr){
                return _.isRegExp(test)?test.test(attr):attr==test;
            });
        },
        toggle:          function(attr, opts) {
            opts=opts ? _.clone(opts) : {};
            return this.set(attr, !this.get(attr), opts);
        }
    }));
    Backbone.Hg    = Backbone.Model.extend(_.extend({
        defaults: { status: 'not started', view: null },
        initialize:     function(options){
            this.listenTo(this,'change:status',this.update);
            this.listenTo(this,'end',this.fin);
        },
        update:         function(){ _.log('update: '+this.get('status')); },
        start:          function(view,dir){
            this.set({status:'started',view:view});
            var def = $.Deferred(), Hg = this, sequence = Hg.sequence();
            if(_.isEmpty(sequence)) {
                Hg.animate(view,{right:(dir==='in')?0:'100%'}).then(function(){
                    def.resolveWith(view,[view]);
                });
            } else this.run(sequence).then(function(){ def.resolveWith(view,[view]); });
            return def.promise();
        },
        sequence:       function(active,next,steps){},
        run:            function(){ var Hg = this, view = Hg.get('view'); return $.Velocity.RunSequence(sequence); },
        animate:        function(view,props,opts,then){
            opts = opts || {};
            then = (_.isFunction(then))? then : _.noop;
            var def = $.Deferred(), Hg = this;
            $.Velocity.animate(view.$el,props,opts).then(function(){
                then.call(Hg);
                def.resolveWith(view,[view]);
            });
            return def.promise();
        },
        end:            function(){ this.set({status:'finished'}); this.trigger('end',this.get('view')); },
        fin:            function(view){ _.log(view.id+' fin.'); }
    }));
    Backbone.Mold  = Backbone.Model.extend({defaults: { el: null, layout: null }});
    Backbone.Intercept = {
        rootSelector: 'body',
        defaults: { trigger : true, links: true, forms: true },
        start: function(options) {
            options = _.defaults(options || {}, this.defaults);
            if (options.links) this._getRootElement().on('click.backboneIntercept', 'a', _.bind(this._interceptLinks, this));
            if (options.forms) this._getRootElement().on('submit.backboneIntercept', _.bind(this._interceptForms, this));
        },
        stop: function() {
            this._getRootElement().off('.backboneIntercept');
        },
        navigate: function(uri, options) {
            Backbone.history.navigate(uri, options);
        },
        _getRootElement: function() {
            if(this._body){return this._body;}
            this._body=Backbone.$(this.rootSelector);
            return this._body;
        },
        _interceptForms: function(e) {
            if (e.target && e.target.action) return;
            e.preventDefault();
        },
        _interceptLinks: function(e) {
            if (e.which !== 1) return;
            var $link = Backbone.$(e.currentTarget), href = $link.attr('href'); if (!href) return;
            var bypass = this._getAttr($link, 'bypass');
            if (bypass !== undefined && bypass !== 'false') return;
            var navOptions = {  trigger: this.defaults.trigger  }, trigger = this._getAttr($link, 'trigger');
            if (trigger === 'false') navOptions.trigger = 0; else if (trigger === 'true') navOptions.trigger = !0;
            if (/^#|javascript:|mailto:|(?:\w+:)?\/\//.test(href)) { return; } e.preventDefault();
            if (!this.navigate) { return; }
            this.navigate(href, navOptions);
        },
        _getAttr: function($el, name) {
            var attr = $el.attr(name); if (attr !== undefined) return attr;
            var data = $el.attr('data-' + name); if (data !== undefined) return data;
        }
    };
    Backbone.fwd = function(source, options){
        options = options || {};
        this.listenTo(source, "all", function(){
            var args = slice.call(arguments), eventName = args.shift();
            if (options.prefix) eventName = options.prefix + ":" + eventName;
            if (options.suffix) eventName = eventName + ":" + options.suffix;
            args.unshift(eventName); this.trigger.apply(this, args);
        }, this);
    };
    Backbone.Foundry = Backbone.Collection.extend(_.extend({
        model:        Backbone.Mold,
        initialize:   function(options){
            _.log('Forge Initialized');
            this.listenTo(this, 'add', this.cast);
        },
        insert:       function(model,index){
            if(_.isNull(index) || index > this.length) index = this.length; else index = (!this.length)?0:this.length;
            if(model instanceof Backbone.Mold) this.add(model);
        },
        cast:         function(model,collection,options){ _.log('alloy cast'); },
        search:       function(test) { return this.filter(function(model) { return model.match(test); }); }
    }));
    var Forge = function(options){
        this.cid     = _.uniqueId('Foundry-');
        this.foundry = new Backbone.Foundry();
        this.def     = $.Deferred();
        this.initialize.apply(this, arguments);
    };
    _.extend(Forge.prototype, {
        initialize:   function(options){
            this.previous = this.active = null;
        },
        install:      function(mold,index){
            this.foundry.insert(mold,index);
        },
        goto:         function(name){
            var self = this;
            var next = this.cast(name);
		    if (!_.isNull(this.active)) {
                var prev = this.cast(this.active);
                prev.transitions.out.start(prev).then(function(){
                    self.previous = this.id;
                    _.log('trans out');
                });
		    }
            next.render().then(function(){
                this.$el.append(next.$el);
                this.transitions.in.start(this,'in').then(function(){
                    self.active = this.id;
                    _.log(self.active+': trans in');
                    self.def.resolveWith(this,[this]);
                });
            });
            return self.def.promise();
        },
        cast:         function(name){
            var mold = this.foundry.findWhere({ 'name': name });
            if(this.isMold(mold)) return (this.isLayout(mold.get('layout'))) ? mold.get('layout') : false;
        },
        isMold:       function(mold){
            return mold instanceof Backbone.Mold;
        },
        isLayout:     function(layout){
            return layout instanceof Backbone.Ion;
        }
    });
    Backbone.Forge = new Forge();
	return Backbone;
});
