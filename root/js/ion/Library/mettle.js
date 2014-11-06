define(["mettle","Velocity","Velocity.ui"], function(Backbone,Velocity) {
    $.fn.tagName = function() {
      return this.prop("tagName").toLowerCase();
    };
    var Backbone = window.Backbone = Backbone;
    Backbone.Mettle = {
        versions : {
            'root'          : '0.0.5',
            'Backbone'      : '1.1.2',
            'LayoutManager' : '0.9.5',
            'Velocity'      : '1.1.0',
            'Velocity-UI'   : '5.0.0',
            'Forge'         : '0.0.1',
            'Foundry'       : '0.0.1',
            'Mold'          : '0.0.1',
            'Mercury'       : '0.0.1'
        }
    };
    //==[ Layout Extensions ]===============================================================================================================
    // tbranyens LayoutManager is utilized for view lifecycle management
    // utility functions
    var ViewConstructor = Backbone.View;
    var aPush = Array.prototype.push;
    var aConcat = Array.prototype.concat;
    var aSplice = Array.prototype.splice;
    var trim = String.prototype.trim ? _.bind(String.prototype.trim.call, String.prototype.trim) : $.trim;
    Backbone.Layout = Backbone.View.extend({
      _render: function() {
        var view = this;
        var manager = view.__manager__;
        var beforeRender = view.beforeRender;
        var def = view.deferred();
        if (view.hasRendered) {
          view._removeViews();
        }
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
      _applyTemplate: function(rendered, manager, def) {
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
      _viewRender: function(manager) {
        var url, contents, def;
        var root = this;
        function done(context, template) {
          var rendered;
          manager.callback = function(rendered) {
            delete manager.isAsync;
            delete manager.callback;
            root._applyTemplate(rendered, manager, def);
          };
          Backbone.Layout.cache(url, template);
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
            if (contents = Backbone.Layout.cache(url)) {
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
      constructor: function Layout(options) {
        this.manage = true;
        _.extend(this, options);
        Backbone.View.apply(this, arguments);
      },
      async: function() {
        var manager = this.__manager__;
        manager.isAsync = true;
        return manager.callback;
      },
      promise: function() {
        return this.__manager__.renderDeferred.promise();
      },
      then: function() {
        return this.promise().then.apply(this, arguments);
      },
      renderViews: function(views) {
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
      insertView: function(selector, view) {
        if (view) return this.setView(selector, view, true);
        return this.setView(selector, true);
      },
      insertViews: function(views) {
        if (_.isArray(views)) return this.setViews({ "": views });
        _.each(views, function(view, selector) {
          views[selector] = _.isArray(view) ? view : [view];
        });
        return this.setViews(views);
      },
      getView: function(fn) {
        if (fn == null) fn = arguments[1];
        return this.getViews(fn).first().value();
      },
      getViews: function(fn) {
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
      removeView: function(fn) {
        return this.getViews(fn).each(function(nestedView) {
          nestedView.remove();
        });
      },
      setView: function(name, view, insert) {
        var manager, selector;
        var root = this;

        if (typeof name !== "string") {
          insert = view;
          view = name;
          name = "";
        }

        manager = view.__manager__;

        if (!manager) {
          throw new Error("The argument associated with selector '" + name +
            "' is defined and a View.  Set `manage` property to true for " +
            "Backbone.View instances.");
        }

        manager.parent = root;

        selector = manager.selector = root.sections[name] || name;

        if (!insert) {
          if (root.getView(name) !== view) {
            root.removeView(name);
          }
          return root.views[selector] = view;
        }
        root.views[selector] = aConcat.call([], root.views[name] || [], view);

        root.__manager__.insert = true;

        return view;
      },
      setViews: function(views) {
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
      render: function() {
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
      remove: function() {
        LayoutManager._removeView(this, true);
        return this._remove.apply(this, arguments);
      },
      _registerWithRAF: function(callback, deferred) {
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
      _cancelQueuedRAFRender: function() {
        var root = this;
        var manager = root.__manager__;
        if (manager.rafID != null) {
          root.cancelAnimationFrame(manager.rafID);
        }
      }
    }, {
      _cache: {},
      _removeViews: function(root, force) {
        if (typeof root === "boolean") {
          force = root;
          root = this;
        }
        root = root || this;
        root.getViews().each(function(view) {
          if (view.hasRendered || force) {
            Backbone.Layout._removeView(view, force);
          }
        });
      },
      _removeView: function(view, force) {
        var parentViews;
        var manager = view.__manager__;
        var rentManager = manager.parent && manager.parent.__manager__;
        var keep = typeof view.keep === "boolean" ? view.keep : view.options.keep;
        if ((!keep && rentManager && rentManager.insert === true) || force) {
          Backbone.Layout.cleanViews(view);
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
        _.extend(Backbone.Layout.prototype, options);
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
          var proto = Backbone.Layout.prototype;
          _.defaults(view, {
            views: {}, sections: {}, __manager__: {},
            _removeViews: Backbone.Layout._removeViews,
            _removeView: Backbone.Layout._removeView
          }, Backbone.Layout.prototype);
          view.options = options;
          _.extend(view, options);
          view._remove = Backbone.View.prototype.remove;
          view.render = Backbone.Layout.prototype.render;
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
      if (options.manage || this.manage) Backbone.Layout.setupView(this, options);
      if (this.__manager__) {
        this.__manager__.noel = noel;
        this.__manager__.suppressWarnings = options.suppressWarnings;
      }
      ViewConstructor.apply(this, arguments);
    };
    Backbone.View           = Backbone.View.prototype.constructor;
    Backbone.View.extend    = ViewConstructor.extend;
    Backbone.View.prototype = ViewConstructor.prototype;
    var defaultOptions = {
      prefix: "",
      useRAF: true,
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
          } else {
            $root = $root.find(manager.selector);
          }
        }
        if (rentManager.insert) {
          this.insert($root, $el);
        } else {
          this.html($root, $el);
        }
      },
      html: function($root, content) {
        $root.html(content);
      },
      htmlBatch: function(rootView, subViews, selector) {
        // Shorthand the parent manager object.
        var rentManager = rootView.__manager__;
        // Create a simplified manager object that tells partial() where
        // place the elements.
        var manager = { selector: selector };

        // Get the elements to be inserted into the root view.
        var els = _.reduce(subViews, function(memo, sub) {
          // Check if keep is present - do boolean check in case the user
          // has created a `keep` function.
          var keep = typeof sub.keep === "boolean" ? sub.keep : sub.options.keep;
          // If a subView is present, don't push it.  This can only happen if
          // `keep: true`.  We do the keep check for speed as $.contains is not
          // cheap.
          var exists = keep && $.contains(rootView.el, sub.el);

          // If there is an element and it doesn't already exist in our structure
          // attach it.
          if (sub.el && !exists) {
            memo.push(sub.el);
          }

          return memo;
        }, []);

        // Use partial to apply the elements. Wrap els in jQ obj for cheerio.
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
          cancelAnimationFrame =
            window[vendors[i] + "CancelAnimationFrame"] ||
            window[vendors[i] + "CancelRequestAnimationFrame"];
        }

        if (!cancelAnimationFrame) {
          cancelAnimationFrame = function(id) {
            clearTimeout(id);
          };
        }

        return _.bind(cancelAnimationFrame, window);
      })()
    };
    _.extend(Backbone.Layout.prototype, defaultOptions);
    _.extend(Backbone.Layout.prototype,{
        newEvents:       function(trigger,element,handler){
            trigger = (!_.isArray(trigger))?[trigger]:trigger;
            element = (!_.isArray(element))?[element]:element;
            handler = (!_.isArray(handler))?[handler]:handler;
            if(trigger.length == element.length && element.length == handler.length){
                var events = _.clone(this.events) || {};
                var eventKeys = [];
                for (var i in trigger) eventKeys[i] = trigger[i]+' '+element[i];
                _.extend(events,_.object(eventKeys,handler));
                this.events = events;
                this.delegateEvents();
            } else {
                _.log('arguments dont match');
            }
        },
        bond:            function(bonds){
            bonds = bonds || {};
			bonds = _.extend(this.bonds,bonds);
			for(var i in bonds){
                var obj  = bonds[i];
				var val  = this.model.get(obj.attr);
                var $el  = this.$(obj.el);
                var tag  = $el.tagName();
                if(!_.isBlank(obj.events)){
                    var _events = _.clone(this.events) || {};
                    var events = _.explode(obj.events," ");
                    if(_.isArray(events)){
                        for (var i in events) _.extend(_events, _.object([events[i]+' '+obj.el],[obj.set]));
                    } else {
                        _.extend(_events, _.object([obj.events+' '+obj.el],[obj.set]));
                    }
                    this.events = _events;
                    this.delegateEvents()
                }
                switch(tag){
                    case 'a': case 'aside': case 'b': case 'blockquote': case 'div': case 'em': case 'footer': case 'h1':
                    case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': case 'header': case 'i': case 'li': case 'p':
                    case 'section': case 'small': case 'span': case 'strong': case 'u':
                        (obj.html)?$el.html(val):$el.text(val);
                    break;
                    case 'input':
                        var type = $el.attr('type');
                        switch(type){
                            case 'button': case 'email': case 'hidden': case 'number': case 'password': case 'reset':
                            case 'submit': case 'tel': case 'text': case 'textarea':
                                $el.val(val);
                            break;
                            case 'checkbox':
                                if(_.isBoolean(val) && val) $el.prop('checked',true);
                            break;
                            case 'radio':
                                var $radio = this.$('input[value='+val+']');
                                if(_.isElement($radio) && ($radio.attr('type') === 'radio')) $radio.prop('checked', true);
                            break;
                        }
                    break;
                    case 'select':
                        var $option = this.$(el+'>option[value='+val+']');
                        if(_.isElement($option)) $option.prop('selected', true);
                    break;
                }
			}
		}
    });
    //==[ Messenger of the Gods, Transitional Metal ]========================================================================================
    //Mercury was inspired by blog by Mike Fowler
    Backbone.Mercury = Backbone.Model.extend({
        defaults: {
            status: 'not started',
            view:  null,
            type:  'js',
            name:  null
        },
        initialize:     function(options){
            this.listenTo(this, 'change:status', this.update);
            this.listenTo(this, 'end', this.finished);
        },
        update:         function(){
            var status = this.get('status');
            _.log('update: '+status);
        },
        start:          function(view,dir){
            this.set({status:'started',view:view});
            var def = $.Deferred();
            var Hg = this;
            var sequence = Hg.sequence();
            if(_.isEmpty(sequence)){
                Hg.animate(view,{right:(dir === 'in')?0:'100%'}).then(function(){
                    _.log('start');
                    def.resolveWith(view,[view]);
                });
            } else {
                this.run(sequence).then(function(){
                    def.resolveWith(view,[view]);
                });
            }
            return def.promise();
        },
        sequence:       function(active,next,steps){},
        run:            function(){
            var Hg = this;
            var view = Hg.get('view');
            return $.Velocity.RunSequence(sequence);
        },
        animate:        function(view,props,opts,then){
            opts = opts || {};
            then = (_.isFunction(then))? then : _.noop;
            var def = $.Deferred();
            var Hg = this;
            $.Velocity.animate(view.$el,props,opts).then(function(){
                then.call(Hg);
                def.resolveWith(view,[view]);
            });
            return def.promise();
        },
        end:            function(){
            this.set({status:'finished'});
            this.trigger('end',this.get('view'));
        },
        finished:       function(view){
            _.log(view.id+' fin.');
        }
    });
    //==[ Enhanced Models (Molds) ]=========================================================================================================
    Backbone.Mold                       = Backbone.Model.extend({});
    _.extend(Backbone.Mold.prototype, {
        defaults: { el: null, layout: null },
        log:            function(){
            console.log.apply(console,['[' + this.cid + ']'].concat([].splice.call(arguments, 0)));
        },
        match:          function(){
            return _.any(this.attributes, function(attr) {
                return _.isRegExp(test) ? test.test(attr) : attr == test;
            });
        },
        toggle:         function(attr, options) {
            options = options ? _.clone(options) : {};
            return this.set(attr, !this.get(attr), options);
        }
    });
    //==[ Foundry ]=========================================================================================================================
    Backbone.Foundry                    = Backbone.Collection.extend({});
    _.extend(Backbone.Foundry.prototype,{
        model:        Backbone.Mold,
        initialize:   function(options){
            _.log('Forge Initialized');
            this.listenTo(this, 'add', this.cast);
        },
        insert:       function(model,index){
            if(_.isNull(index) || index > this.length) index = this.length;
            else index = (!this.length)?0:this.length;
            if(model instanceof Backbone.Mold) this.add(model);
        },
        cast:         function(model,collection,options){
            _.log('alloy cast');
        },
        search:       function(test) {
            return this.filter(function(model) {
                return model.match(test);
            });
        }
    });
    //==[ Forge ]===========================================================================================================================
    var Forge                           = function(options){
        this._super                     = Forge.prototype;
        this.cid                        = _.uniqueId('Foundry-');
        this.foundry                    = new Backbone.Foundry();
        this.def                        = $.Deferred();
        this.initialize.apply(this, arguments);
    };
    _.extend(Forge.prototype, {
        initialize:   function(options){
            this.previous = null;
            this.active   = null;
        },
        //add a mold to the foundry optionally specify where
        install:      function(mold,index){
            this.foundry.insert(mold,index);
        },
        //page switch mechanism - accepts the page name & returns a promise with the new view as the context
        goto:         function(name,transIn,transOut){
            var self = this;
            var next = this.cast(name);
		    if (!_.isNull(this.active)) {
                var prev = this.cast(this.active);
                transOut.start(prev).then(function(){
                    self.previous = this.id;
                    _.log('trans out');
                });
		    }
            next.render().then(function(){
                this.$el.append(next.$el);
                transIn.start(this,'in').then(function(){
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
            return layout instanceof Backbone.Layout;
        },
        isTransition: function(trans){
            return trans instanceof Backbone.Transition;
        }
    });
    Backbone.Forge = new Forge();
	return Backbone;
});
