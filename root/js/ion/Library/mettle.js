define(["mettle"], function(Backbone) {
    var Backbone = window.Backbone = Backbone;    
    _.extend(Backbone.Collection.prototype,{
        _super:         function(){
            return this.constructor.__super__[funcName].apply(this, _.rest(arguments));
        },
        search: function(test) {
            return this.filter(function(model) {
                return model.match(test);
            });
        }
    });
    //==[ LocalStorage ]==================================================================================================================== 
	function S4() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	};
	function guid() {
		return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	};
	function contains(array, item) {
		var i = array.length;
		while (i--) if (array[i] === item) return true;
		return false;
	}
	Backbone.LocalStorage = window.Store = function(name, serializer) {
		if( !this.localStorage ) throw "Backbone.localStorage: Environment does not support localStorage.";
		this.name = name;
		this.serializer = serializer || {
			serialize: function(item) {
			return _.isObject(item) ? JSON.stringify(item) : item;
			},
			// fix for "illegal access" error on Android when JSON.parse is passed null
			deserialize: function (data) {
			return data && JSON.parse(data);
			}
		};
		var store = this.localStorage().getItem(this.name);
		this.records = (store && store.split(",")) || [];
	};
	_.extend(Backbone.LocalStorage.prototype, {
		save: function() {
			this.localStorage().setItem(this.name, this.records.join(","));
		},
		create: function(model) {
			if (!model.id) {
                model.id = guid();
                model.set(model.idAttribute, model.id);
			}
			this.localStorage().setItem(this._itemName(model.id), this.serializer.serialize(model));
			this.records.push(model.id.toString());
			this.save();
			return this.find(model) !== false;
		},
		update: function(model) {
			this.localStorage().setItem(this._itemName(model.id), this.serializer.serialize(model));
			var modelId = model.id.toString();
			if (!contains(this.records, modelId)) {
                this.records.push(modelId);
                this.save();
			}
			return this.find(model) !== false;
		},
		find: function(model) {
			return this.serializer.deserialize(this.localStorage().getItem(this._itemName(model.id)));
		},
		findAll: function() {
			var result = [];
			for (var i = 0, id, data; i < this.records.length; i++) {
                id = this.records[i];
                data = this.serializer.deserialize(this.localStorage().getItem(this._itemName(id)));
                if (data != null) result.push(data);
			}
			return result;
		},
		destroy: function(model) {
			this.localStorage().removeItem(this._itemName(model.id));
			var modelId = model.id.toString();
			for (var i = 0, id; i < this.records.length; i++) {
                if (this.records[i] === modelId) this.records.splice(i, 1);
			}
			this.save();
			return model;
		},
		localStorage: function() {
			return localStorage;
		},
		_clear: function() {
			var local = this.localStorage(),
			itemRe = new RegExp("^" + this.name + "-");
			local.removeItem(this.name);
			for (var k in local) {
                if (itemRe.test(k)) {
                    local.removeItem(k);
                }
			}

			this.records.length = 0;
		},
		_storageSize: function() {
			return this.localStorage().length;
		},
		_itemName: function(id) {
			return this.name+"-"+id;
		}
	});
	Backbone.LocalStorage.sync          = window.Store.sync = Backbone.localSync = function(method, model, options) {
		var store = model.localStorage || model.collection.localStorage;

		var resp, errorMessage;
		//If $ is having Deferred - use it.
		var syncDfd = Backbone.$ ? (Backbone.$.Deferred && Backbone.$.Deferred()) : (Backbone.Deferred && Backbone.Deferred());

		try {
			switch (method) {
			case "read":
				resp = model.id != undefined ? store.find(model) : store.findAll();
				break;
			case "create":
				resp = store.create(model);
				break;
			case "update":
				resp = store.update(model);
				break;
			case "delete":
				resp = store.destroy(model);
				break;
			}

		} catch(error) {
			if (error.code === 22 && store._storageSize() === 0) errorMessage = "Private browsing is unsupported";
			else errorMessage = error.message;
		}

		if (resp) {
			if (options && options.success) {
				if (Backbone.VERSION === "0.9.10") {
					options.success(model, resp, options);
				} else {
					options.success(resp);
				}
			}
			if (syncDfd) {
				syncDfd.resolve(resp);
			}

		} else {
			errorMessage = errorMessage ? errorMessage : "Record Not Found";

			if (options && options.error)
			if (Backbone.VERSION === "0.9.10") {
				options.error(model, errorMessage, options);
			} else {
				options.error(errorMessage);
			}

			if (syncDfd)
			syncDfd.reject(errorMessage);
		}

		// add compatibility with $.ajax
		// always execute callback for success and error
		if (options && options.complete) options.complete(resp);

		return syncDfd && syncDfd.promise();
	};
	Backbone.ajaxSync                   = Backbone.sync;
	Backbone.getSyncMethod              = function(model) {
		if(model.localStorage || (model.collection && model.collection.localStorage)) {
			return Backbone.localSync;
		}

		return Backbone.ajaxSync;
	};
	Backbone.sync = function(method, model, options) {
		return Backbone.getSyncMethod(model).apply(this, [method, model, options]);
	};
    //==[ Layout Extensions ]=============================================================================================================== 
    var ViewConstructor = Backbone.View;
    var aPush = Array.prototype.push;
    var aConcat = Array.prototype.concat;
    var aSplice = Array.prototype.splice;
    var trim = String.prototype.trim ? _.bind(String.prototype.trim.call, String.prototype.trim) : $.trim;
    var LayoutManager = Backbone.View.extend({
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
        if (beforeRender) {
          beforeRender.call(view, view);
        }
        if (!manager.isAsync) {
          manager.callback();
        }
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

        // Once the template is successfully fetched, use its contents to proceed.
        // Context argument is first, since it is bound for partial application
        // reasons.
        function done(context, template) {
          // Store the rendered template someplace so it can be re-assignable.
          var rendered;

          // Trigger this once the render method has completed.
          manager.callback = function(rendered) {
            // Clean up asynchronous manager properties.
            delete manager.isAsync;
            delete manager.callback;

            root._applyTemplate(rendered, manager, def);
          };

          // Ensure the cache is up-to-date.
          LayoutManager.cache(url, template);

          // Render the View into the el property.
          if (template) {
            rendered = root.renderTemplate.call(root, template, context);
          }

          // If the function was synchronous, continue execution.
          if (!manager.isAsync) {
            root._applyTemplate(rendered, manager, def);
          }
        }

        return {
          // This `render` function is what gets called inside of the View render,
          // when `manage(this).render` is called.  Returns a promise that can be
          // used to know when the element has been rendered into its parent.
          render: function() {
            var context = root.serialize;
            var template = root.template;

            // Create a deferred specifically for fetching.
            def = root.deferred();

            // If data is a function, immediately call it.
            if (_.isFunction(context)) {
              context = context.call(root);
            }

            // Set the internal callback to trigger once the asynchronous or
            // synchronous behavior has completed.
            manager.callback = function(contents) {
              // Clean up asynchronous manager properties.
              delete manager.isAsync;
              delete manager.callback;

              done(context, contents);
            };

            // Set the url to the prefix + the view's template property.
            if (typeof template === "string") {
              url = root.prefix + template;
            }

            // Check if contents are already cached and if they are, simply process
            // the template with the correct data.
            if (contents = LayoutManager.cache(url)) {
              done(context, contents, url);

              return def;
            }

            // Fetch layout and template contents.
            if (typeof template === "string") {
              contents = root.fetchTemplate.call(root, root.prefix +
                template);
            // If the template is already a function, simply call it.
            } else if (typeof template === "function") {
              contents = template;
            // If its not a string and not undefined, pass the value to `fetch`.
            } else if (template != null) {
              contents = root.fetchTemplate.call(root, template);
            }

            // If the function was synchronous, continue execution.
            if (!manager.isAsync) {
              done(context, contents);
            }

            return def;
          }
        };
      },
      constructor: function Layout(options) {
        // Grant this View superpowers.
        this.manage = true;

        // Give this View access to all passed options as instance properties.
        _.extend(this, options);

        // Have Backbone set up the rest of this View.
        Backbone.View.apply(this, arguments);
      },
      async: function() {
        var manager = this.__manager__;

        // Set this View's action to be asynchronous.
        manager.isAsync = true;

        // Return the callback.
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
        if (views && _.isArray(views)) {
          views = _.chain(views);
        } else {
          views = root.getViews(views);
        }
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
        if (view) {
          return this.setView(selector, view, true);
        }
        return this.setView(selector, true);
      },
      insertViews: function(views) {
        // If an array of views was passed it should be inserted into the
        // root view. Much like calling insertView without a selector.
        if (_.isArray(views)) {
          return this.setViews({ "": views });
        }

        _.each(views, function(view, selector) {
          views[selector] = _.isArray(view) ? view : [view];
        });

        return this.setViews(views);
      },
      getView: function(fn) {
        // If `getView` is invoked with undefined as the first argument, then the
        // second argument will be used instead.  This is to allow
        // `getViews(undefined, fn)` to work as `getViews(fn)`.  Useful for when
        // you are allowing an optional selector.
        if (fn == null) {
          fn = arguments[1];
        }

        return this.getViews(fn).first().value();
      },
      getViews: function(fn) {
        var views;

        // If the filter argument is a String, then return a chained Version of the
        // elements. The value at the specified filter may be undefined, a single
        // view, or an array of views; in all cases, chain on a flat array.
        if (typeof fn === "string") {
          fn = this.sections[fn] || fn;
          views = this.views[fn] || [];

          // If Views is undefined you are concatenating an `undefined` to an array
          // resulting in a value being returned.  Defaulting to an array prevents
          // this.
          //return _.chain([].concat(views || []));
          return _.chain([].concat(views));
        }

        // Generate an array of all top level (no deeply nested) Views flattened.
        views = _.chain(this.views).map(function(view) {
          return _.isArray(view) ? view : [view];
        }, this).flatten();

        // If the argument passed is an Object, then pass it to `_.where`.
        if (typeof fn === "object") {
          return views.where(fn);
        }

        // If a filter function is provided, run it on all Views and return a
        // wrapped chain. Otherwise, simply return a wrapped chain of all Views.
        return typeof fn === "function" ? views.filter(fn) : views;
      },
      removeView: function(fn) {
        // Allow an optional selector or function to find the right model and
        // remove nested Views based off the results of the selector or filter.
        return this.getViews(fn).each(function(nestedView) {
          nestedView.remove();
        });
      },
      setView: function(name, view, insert) {
        var manager, selector;
        // Parent view, the one you are setting a View on.
        var root = this;

        // If no name was passed, use an empty string and shift all arguments.
        if (typeof name !== "string") {
          insert = view;
          view = name;
          name = "";
        }

        // Shorthand the `__manager__` property.
        manager = view.__manager__;

        // If the View has not been properly set up, throw an Error message
        // indicating that the View needs `manage: true` set.
        if (!manager) {
          throw new Error("The argument associated with selector '" + name +
            "' is defined and a View.  Set `manage` property to true for " +
            "Backbone.View instances.");
        }

        // Add reference to the parentView.
        manager.parent = root;

        // Add reference to the placement selector used.
        selector = manager.selector = root.sections[name] || name;

        // Code path is less complex for Views that are not being inserted.  Simply
        // remove existing Views and bail out with the assignment.
        if (!insert) {
          // Ensure remove is called only when swapping in a new view (when the
          // view is the same, it does not need to be removed or cleaned up).
          if (root.getView(name) !== view) {
            root.removeView(name);
          }

          // Assign to main views object and return for chainability.
          return root.views[selector] = view;
        }

        // Ensure this.views[selector] is an array and push this View to
        // the end.
        root.views[selector] = aConcat.call([], root.views[name] || [], view);

        // Put the parent view into `insert` mode.
        root.__manager__.insert = true;

        return view;
      },
      setViews: function(views) {
        _.each(views, function(view, name) {
          // If the view is an array put all views into insert mode.
          if (_.isArray(view)) {
            return _.each(view, function(view) {
              this.insertView(name, view);
            }, this);
          }

          // Assign each view using the view function.
          this.setView(name, view);
        }, this);

        // Allow for chaining
        return this;
      },
      render: function() {
        var root = this;
        var manager = root.__manager__;
        var parent = manager.parent;
        var rentManager = parent && parent.__manager__;
        var def = root.deferred();

        // Triggered once the render has succeeded.
        function resolve() {

          // Insert all subViews into the parent at once.
          _.each(root.views, function(views, selector) {
            // Fragments aren't used on arrays of subviews.
            if (_.isArray(views)) {
              root.htmlBatch(root, views, selector);
            }
          });

          // If there is a parent and we weren't attached to it via the previous
          // method (single view), attach.
          if (parent && !manager.insertedViaFragment) {
            if (!root.contains(parent.el, root.el)) {
              // Apply the partial using parent's html() method.
              parent.partial(parent.$el, root.$el, rentManager, manager);
            }
          }

          // Ensure events are always correctly bound after rendering.
          root.delegateEvents();

          // Set this View as successfully rendered.
          root.hasRendered = true;
          manager.renderInProgress = false;

          // Clear triggeredByRAF flag.
          delete manager.triggeredByRAF;

          // Only process the queue if it exists.
          if (manager.queue && manager.queue.length) {
            // Ensure that the next render is only called after all other
            // `done` handlers have completed.  This will prevent `render`
            // callbacks from firing out of order.
            (manager.queue.shift())();
          } else {
            // Once the queue is depleted, remove it, the render process has
            // completed.
            delete manager.queue;
          }

          // Reusable function for triggering the afterRender callback and event.
          function completeRender() {
            var console = window.console;
            var afterRender = root.afterRender;

            if (afterRender) {
              afterRender.call(root, root);
            }

            // Always emit an afterRender event.
            root.trigger("afterRender", root);

            // If there are multiple top level elements and `el: false` is used,
            // display a warning message and a stack trace.
            if (manager.noel && root.$el.length > 1) {
              // Do not display a warning while testing or if warning suppression
              // is enabled.
              if (_.isFunction(console.warn) && !root.suppressWarnings) {
                console.warn("`el: false` with multiple top level elements is " +
                  "not supported.");

                // Provide a stack trace if available to aid with debugging.
                if (_.isFunction(console.trace)) {
                  console.trace();
                }
              }
            }
          }

          // If the parent is currently rendering, wait until it has completed
          // until calling the nested View's `afterRender`.
          if (rentManager && (rentManager.renderInProgress || rentManager.queue)) {
            // Wait until the parent View has finished rendering, which could be
            // asynchronous, and trigger afterRender on this View once it has
            // completed.
            parent.once("afterRender", completeRender);
          } else {
            // This View and its parent have both rendered.
            completeRender();
          }

          return def.resolveWith(root, [root]);
        }

        // Actually facilitate a render.
        function actuallyRender() {

          // The `_viewRender` method is broken out to abstract away from having
          // too much code in `actuallyRender`.
          root._render().done(function() {
            // If there are no children to worry about, complete the render
            // instantly.
            if (!_.keys(root.views).length) {
              return resolve();
            }

            // Create a list of promises to wait on until rendering is done.
            // Since this method will run on all children as well, its sufficient
            // for a full hierarchical.
            var promises = _.map(root.views, function(view) {
              var insert = _.isArray(view);

              // If items are being inserted, they will be in a non-zero length
              // Array.
              if (insert && view.length) {
                // Mark each subview's manager so they don't attempt to attach by
                // themselves.  Return a single promise representing the entire
                // render.
                return root.when(_.map(view, function(subView) {
                  subView.__manager__.insertedViaFragment = true;
                  return subView.render().__manager__.renderDeferred;
                }));
              }

              // Only return the fetch deferred, resolve the main deferred after
              // the element has been attached to it's parent.
              return !insert ? view.render().__manager__.renderDeferred : view;
            });

            // Once all nested Views have been rendered, resolve this View's
            // deferred.
            root.when(promises).done(resolve);
          });
        }

        // Mark this render as in progress. This will prevent
        // afterRender from being fired until the entire chain has rendered.
        manager.renderInProgress = true;

        // Start the render.
        // Register this request & cancel any that conflict.
        root._registerWithRAF(actuallyRender, def);

        // Put the deferred inside of the `__manager__` object, since we don't want
        // end users accessing this directly anymore in favor of the `afterRender`
        // event.  So instead of doing `render().then(...` do
        // `render().once("afterRender", ...`.
        // FIXME: I think we need to move back to promises so that we don't
        // miss events, regardless of sync/async (useRAF setting)
        manager.renderDeferred = def;

        // Return the actual View for chainability purposes.
        return root;
      },
      remove: function() {
        // Force remove itself from its parent.
        LayoutManager._removeView(this, true);

        // Call the original remove function.
        return this._remove.apply(this, arguments);
      },
      _registerWithRAF: function(callback, deferred) {
        var root = this;
        var manager = root.__manager__;
        var rentManager = manager.parent && manager.parent.__manager__;

        // Allow RAF processing to be shut off using `useRAF`:false.
        if (this.useRAF === false) {
          if (manager.queue) {
            aPush.call(manager.queue, callback);
          } else {
            manager.queue = [];
            callback();
          }
          return;
        }

        // Keep track of all deferreds so we can resolve them.
        manager.deferreds = manager.deferreds || [];
        manager.deferreds.push(deferred);

        // Schedule resolving all deferreds that are waiting.
        deferred.done(resolveDeferreds);

        // Cancel any other renders on this view that are queued to execute.
        this._cancelQueuedRAFRender();

        // Trigger immediately if the parent was triggered by RAF.
        // The flag propagates downward so this view's children are also
        // rendered immediately.
        if (rentManager && rentManager.triggeredByRAF) {
          return finish();
        }

        // Register this request with requestAnimationFrame.
        manager.rafID = root.requestAnimationFrame(finish);

        function finish() {
          // Remove this ID as it is no longer valid.
          manager.rafID = null;

          // Set flag (will propagate to children) so they render
          // without waiting for RAF.
          manager.triggeredByRAF = true;

          // Call original cb.
          callback();
        }

        // Resolve all deferreds that were cancelled previously, if any.
        // This allows the user to bind callbacks to any render callback,
        // even if it was cancelled above.
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
            LayoutManager._removeView(view, force);
          }
        });
      },

      // Remove a single nested View.
      _removeView: function(view, force) {
        var parentViews;
        // Shorthand the managers for easier access.
        var manager = view.__manager__;
        var rentManager = manager.parent && manager.parent.__manager__;
        // Test for keep.
        var keep = typeof view.keep === "boolean" ? view.keep : view.options.keep;

        // In insert mode, remove views that do not have `keep` attribute set,
        // unless the force flag is set.
        if ((!keep && rentManager && rentManager.insert === true) || force) {
          // Clean out the events.
          LayoutManager.cleanViews(view);

          // Since we are removing this view, force subviews to remove
          view._removeViews(true);

          // Remove the View completely.
          view.$el.remove();

          // Cancel any pending renders, if present.
          view._cancelQueuedRAFRender();

          // Bail out early if no parent exists.
          if (!manager.parent) { return; }

          // Assign (if they exist) the sibling Views to a property.
          parentViews = manager.parent.views[manager.selector];

          // If this is an array of items remove items that are not marked to
          // keep.
          if (_.isArray(parentViews)) {
            // Remove duplicate Views.
            return _.each(_.clone(parentViews), function(view, i) {
              // If the managers match, splice off this View.
              if (view && view.__manager__ === manager) {
                aSplice.call(parentViews, i, 1);
              }
            });
          }

          // Otherwise delete the parent selector.
          delete manager.parent.views[manager.selector];
        }
      },

      // Cache templates into LayoutManager._cache.
      cache: function(path, contents) {
        // If template path is found in the cache, return the contents.
        if (path in this._cache && contents == null) {
          return this._cache[path];
        // Ensure path and contents aren't undefined.
        } else if (path != null && contents != null) {
          return this._cache[path] = contents;
        }

        // If the template is not in the cache, return undefined.
      },

      // Accept either a single view or an array of views to clean of all DOM
      // events internal model and collection references and all Backbone.Events.
      cleanViews: function(views) {
        // Clear out all existing views.
        _.each(aConcat.call([], views), function(view) {
          // Remove all custom events attached to this View.
          view.unbind();

          // Automatically unbind `model`.
          if (view.model instanceof Backbone.Model) {
            view.model.off(null, null, view);
          }

          // Automatically unbind `collection`.
          if (view.collection instanceof Backbone.Collection) {
            view.collection.off(null, null, view);
          }

          // Automatically unbind events bound to this View.
          view.stopListening();

          // If a custom cleanup method was provided on the view, call it after
          // the initial cleanup is done
          if (_.isFunction(view.cleanup)) {
            view.cleanup();
          }
        });
      },

      // This static method allows for global configuration of LayoutManager.
      configure: function(options) {
        _.extend(LayoutManager.prototype, options);

        // Allow LayoutManager to manage Backbone.View.prototype.
        if (options.manage) {
          Backbone.View.prototype.manage = true;
        }

        // Disable the element globally.
        if (options.el === false) {
          Backbone.View.prototype.el = false;
        }

        // Allow global configuration of `suppressWarnings`.
        if (options.suppressWarnings === true) {
          Backbone.View.prototype.suppressWarnings = true;
        }

        // Allow global configuration of `useRAF`.
        if (options.useRAF === false) {
          Backbone.View.prototype.useRAF = false;
        }
      },

      // Configure a View to work with the LayoutManager plugin.
      setupView: function(views, options) {
        // Ensure that options is always an object, and clone it so that
        // changes to the original object don't screw up this view.
        options = _.extend({}, options);

        // Set up all Views passed.
        _.each(aConcat.call([], views), function(view) {
          // If the View has already been setup, no need to do it again.
          if (view.__manager__) {
            return;
          }

          var views, declaredViews;
          var proto = LayoutManager.prototype;

          // Ensure necessary properties are set.
          _.defaults(view, {
            // Ensure a view always has a views object.
            views: {},

            // Ensure a view always has a sections object.
            sections: {},

            // Internal state object used to store whether or not a View has been
            // taken over by layout manager and if it has been rendered into the
            // DOM.
            __manager__: {},

            // Add the ability to remove all Views.
            _removeViews: LayoutManager._removeViews,

            // Add the ability to remove itself.
            _removeView: LayoutManager._removeView

          // Mix in all LayoutManager prototype properties as well.
          }, LayoutManager.prototype);

          // Assign passed options.
          view.options = options;

          // Merge the View options into the View.
          _.extend(view, options);

          // By default the original Remove function is the Backbone.View one.
          view._remove = Backbone.View.prototype.remove;

          // Ensure the render is always set correctly.
          view.render = LayoutManager.prototype.render;

          // If the user provided their own remove override, use that instead of
          // the default.
          if (view.remove !== proto.remove) {
            view._remove = view.remove;
            view.remove = proto.remove;
          }

          // Normalize views to exist on either instance or options, default to
          // options.
          views = options.views || view.views;

          // Set the internal views, only if selectors have been provided.
          if (_.keys(views).length) {
            // Keep original object declared containing Views.
            declaredViews = views;

            // Reset the property to avoid duplication or overwritting.
            view.views = {};

            // If any declared view is wrapped in a function, invoke it.
            _.each(declaredViews, function(declaredView, key) {
              if (typeof declaredView === "function") {
                declaredViews[key] = declaredView.call(view, view);
              }
            });

            // Set the declared Views.
            view.setViews(declaredViews);
          }
        });
      }
    });
    LayoutManager.VERSION = "0.9.5";
    Backbone.View.prototype.constructor = function(options) {
      var noel;

      // Ensure options is always an object.
      options = options || {};

      // Remove the container element provided by Backbone.
      if ("el" in options ? options.el === false : this.el === false) {
        noel = true;
      }

      // If manage is set, do it!
      if (options.manage || this.manage) {
        // Set up this View.
        LayoutManager.setupView(this, options);
      }

      // Assign the `noel` property once we're sure the View we're working with is
      // managed by LayoutManager.
      if (this.__manager__) {
        this.__manager__.noel = noel;
        this.__manager__.suppressWarnings = options.suppressWarnings;
      }

      // Act like nothing happened.
      ViewConstructor.apply(this, arguments);
    };
    Backbone.View = Backbone.View.prototype.constructor;
    Backbone.View.extend = ViewConstructor.extend;
    Backbone.View.prototype = ViewConstructor.prototype;
    var defaultOptions = {
      // Prefix template/layout paths.
      prefix: "",

      // Use requestAnimationFrame to queue up view rendering and cancel
      // repeat requests. Leave on for better performance.
      useRAF: true,

      // Can be used to supply a different deferred implementation.
      deferred: function() {
        return $.Deferred();
      },

      // Fetch is passed a path and is expected to return template contents as a
      // function or string.
      fetchTemplate: function(path) {
        return _.template($(path).html());
      },

      // By default, render using underscore's templating and trim output.
      renderTemplate: function(template, context) {
        return trim(template.call(this, context));
      },

      // By default, pass model attributes to the templates
      serialize: function() {
        return this.model ? _.clone(this.model.attributes) : {};
      },

      // This is the most common way you will want to partially apply a view into
      // a layout.
      partial: function($root, $el, rentManager, manager) {
        var $filtered;

        // If selector is specified, attempt to find it.
        if (manager.selector) {
          if (rentManager.noel) {
            $filtered = $root.filter(manager.selector);
            $root = $filtered.length ? $filtered : $root.find(manager.selector);
          } else {
            $root = $root.find(manager.selector);
          }
        }

        // Use the insert method if the parent's `insert` argument is true.
        if (rentManager.insert) {
          this.insert($root, $el);
        } else {
          this.html($root, $el);
        }
      },

      // Override this with a custom HTML method, passed a root element and content
      // (a jQuery collection or a string) to replace the innerHTML with.
      html: function($root, content) {
        $root.html(content);
      },

      // Used for inserting subViews in a single batch.  This gives a small
      // performance boost as we write to a disconnected fragment instead of to the
      // DOM directly. Smarter browsers like Chrome will batch writes internally
      // and layout as seldom as possible, but even in that case this provides a
      // decent boost.  jQuery will use a DocumentFragment for the batch update,
      // but Cheerio in Node will not.
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

      // Very similar to HTML except this one will appendChild by default.
      insert: function($root, $el) {
        $root.append($el);
      },

      // Return a deferred for when all promises resolve/reject.
      when: function(promises) {
        return $.when.apply(null, promises);
      },

      // A method to determine if a View contains another.
      contains: function(parent, child) {
        return $.contains(parent, child);
      },

      // Based on:
      // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
      // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and
      // Tino Zijdel.
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
    _.extend(LayoutManager.prototype, defaultOptions);
    _.extend(LayoutManager.prototype,{
        transition:      function(type,direction){
            var self = this;
            var trans = $.Deferred();
            if(type === 'in'){
                var animateIn = function () {
                    if(direction === 'right'){
                        self.$el.css({left:'600px'});
                        self.$el.animate({left:0}, 500, function(){
                            return trans.resolveWith(self,[self]);
                        });
                    } else {
                        self.$el.css({right:'600px'});
                        self.$el.animate({right:0}, 500, function(){
                            return trans.resolveWith(self,[self]);
                        });
                    }
                };
                _.delay(animateIn, 10);
            } else if(type === 'out'){
                self.$el.animate({top:'400px'}, 500, function(){
                    self.$el.animate({right:0},10,function(){
                        self.$el.animate({top:0},10,function(){
                            return trans.resolveWith(self,[self]);
                        });
                    });
                });
            }
            return trans.promise();
        },
        bond:            function(bindings){
			var bindings = _.extend(this.bindings,bindings) || {};
			_.each(bindings,function(attr,el){
				this.listenTo(this.model,'change:'+attr,function(){
					var val = this.model.get(attr);
					this.$(el).text(val);
				});
			},this);
		}
    });
    Backbone.Layout                     = LayoutManager || null;
    //==[ Singleton Models ]================================================================================================================ 
    Backbone.Mold                       = Backbone.Model.extend({_instance: undefined});
    _.extend(Backbone.Mold.prototype, {
        defaults: {
            states: {},
            activeState: null,
            el: null,
            layout: null
        },
        log:            function(){
            console.log.apply(console,
                ['[' + this.cid + ']'].concat([].splice.call(arguments, 0))
            );
        },
        match:          function(){
            return _.any(this.attributes, function(attr) {
                return _.isRegExp(test) ? test.test(attr) : attr == test;
            });
        },
        getInstance:    function () {
            if (_.isUndefined(this.get('_instance'))) {
                this.set({ _instance: new this() });
            }
            return this._instance;
        }
    });
    //==[ Validation ]======================================================================================================================
    /*Backbone.Validation                 = (function(_){
        'use strict';
        var defaultOptions = {
            forceUpdate: false,
            selector: 'name',
            labelFormatter: 'sentenceCase',
            valid: Function.prototype,
            invalid: Function.prototype
        };
        var formatFunctions = {
            formatLabel: function(attrName, model) {
                return defaultLabelFormatters[defaultOptions.labelFormatter](attrName, model);
            },
            format: function() {
                var args = Array.prototype.slice.call(arguments), text = args.shift();
                return text.replace(/\{(\d+)\}/g, function(match, number) {
                    return typeof args[number] !== 'undefined' ? args[number] : match;
                });
            }
        };
        var flatten = function (obj, into, prefix) {
            into = into || {};
            prefix = prefix || '';
            _.each(obj, function(val, key) {
                if(obj.hasOwnProperty(key)) {
                    if (val && typeof val === 'object' && !(
                        val instanceof Array ||
                        val instanceof Date ||
                        val instanceof RegExp ||
                        val instanceof Backbone.Model ||
                        val instanceof Backbone.Collection)
                    ) {
                        flatten(val, into, prefix + key + '.');
                    } else {
                        into[prefix + key] = val;
                    }
                }
            });
            return into;
        };
        var Validation = (function(){
            var getValidatedAttrs = function(model) {
                return _.reduce(_.keys(_.result(model, 'validation') || {}), function(memo, key) {
                    memo[key] = void 0;
                    return memo;
                }, {});
            };
            var getValidators = function(model, attr) {
                var attrValidationSet = model.validation ? _.result(model, 'validation')[attr] || {} : {};
                if (_.isFunction(attrValidationSet) || _.isString(attrValidationSet)) attrValidationSet = { fn: attrValidationSet };
                if(!_.isArray(attrValidationSet)) attrValidationSet = [attrValidationSet];
                return _.reduce(attrValidationSet, function(memo, attrValidation) {
                    _.each(_.without(_.keys(attrValidation), 'msg'), function(validator) {
                        memo.push({
                            fn: defaultValidators[validator],val: attrValidation[validator],msg: attrValidation.msg
                        });
                    });
                    return memo;
                }, []);
          };
            var validateAttr = function(model, attr, value, computed) {
                return _.reduce(getValidators(model, attr), function(memo, validator){
                    var ctx = _.extend({}, formatFunctions, defaultValidators),
                        result = validator.fn.call(ctx, value, attr, validator.val, model, computed);
                    if(result === false || memo === false) return false;
                    if (result && !memo) return _.result(validator, 'msg') || result;
                    return memo;
                }, '');
            };
            var validateModel = function(model, attrs) {
                var error,
                    invalidAttrs = {},
                    isValid = true,
                    computed = _.clone(attrs),
                    flattened = flatten(attrs);
                    _.each(flattened, function(val, attr) {
                        error = validateAttr(model, attr, val, computed);
                        if (error) {
                            invalidAttrs[attr] = error;
                            isValid = false;
                        }
                    });
                    return {
                        invalidAttrs: invalidAttrs,
                        isValid: isValid
                    };
            };
            var mixin = function(view, options) {
                return {
                    preValidate: function(attr, value) {
                        var self = this, result = {}, error;
                        if(_.isObject(attr)){
                            _.each(attr, function(value, key) {
                                error = self.preValidate(key, value);
                                if(error) result[key] = error;
                            });
                            return _.isEmpty(result) ? undefined : result;
                        } else {
                            return validateAttr(this, attr, value, _.extend({}, this.attributes));
                        }
                    },
                    isValid: function(option) {
                        var flattened = flatten(this.attributes);
                        if(_.isString(option)) return !validateAttr(this, option, flattened[option], _.extend({}, this.attributes));
                        if(_.isArray(option)){
                            return _.reduce(option, function(memo, attr) {
                                return memo && !validateAttr(this, attr, flattened[attr], _.extend({}, this.attributes));
                            }, true, this);
                        }
                        if(option === true) this.validate();
                        return this.validation ? this._isValid : true;
                    },
                    validate: function(attrs, setOptions){
                        var model = this, 
                            validateAll = !attrs, 
                            opt = _.extend({}, options, setOptions), 
                            validatedAttrs = getValidatedAttrs(model), 
                            allAttrs = _.extend({}, validatedAttrs, model.attributes, attrs),
                            changedAttrs = flatten(attrs || allAttrs),
                            result = validateModel(model, allAttrs);
                        model._isValid = result.isValid;
                        _.each(validatedAttrs, function(val, attr){
                            var invalid = result.invalidAttrs.hasOwnProperty(attr);
                            if(!invalid) opt.valid(view, attr, opt.selector);
                        });
                        _.each(validatedAttrs, function(val, attr){
                            var invalid = result.invalidAttrs.hasOwnProperty(attr), changed = changedAttrs.hasOwnProperty(attr);
                            if(invalid && (changed || validateAll)) opt.invalid(view, attr, result.invalidAttrs[attr], opt.selector);
                        });
                        _.defer(function() {
                            model.trigger('validated', model._isValid, model, result.invalidAttrs);
                            model.trigger('validated:' + (model._isValid ? 'valid' : 'invalid'), model, result.invalidAttrs);
                        });
                        if (!opt.forceUpdate && _.intersection(_.keys(result.invalidAttrs), _.keys(changedAttrs)).length > 0) return result.invalidAttrs;
                    }
                };
            };  
            var bindModel = function(view, model, options) {
                _.extend(model, mixin(view, options));
            };
            var unbindModel = function(model) {
                delete model.validate;
                delete model.preValidate;
                delete model.isValid;
            };
            var collectionAdd = function(model) {
                bindModel(this.view, model, this.options);
            };
            var collectionRemove = function(model) {
                unbindModel(model);
            };
            return {
                version: '0.9.1',
                configure: function(options) {
                  _.extend(defaultOptions, options);
                },
                bind: function(view, options) {
                    options = _.extend({}, defaultOptions, defaultCallbacks, options);
                    var model = options.model || view.model, collection = options.collection || view.collection;
                    if(typeof model === 'undefined' && typeof collection === 'undefined'){
                        throw 'Before you execute the binding your view must have a model or a collection.\n' +
                              'See http://thedersen.com/projects/backbone-validation/#using-form-model-validation for more information.';
                    }
                    if(model) bindModel(view, model, options);
                    else if(collection) {
                        collection.each(function(model){
                            bindModel(view, model, options);
                        });
                        collection.bind('add', collectionAdd, {view: view, options: options});
                        collection.bind('remove', collectionRemove);
                    }
                },
                unbind: function(view, options) {
                    options = _.extend({}, options);
                    var model = options.model || view.model, collection = options.collection || view.collection;
                    if(model) {
                        unbindModel(model);
                    } else if(collection) {
                        collection.each(function(model){
                            unbindModel(model);
                        });
                        collection.unbind('add', collectionAdd);
                        collection.unbind('remove', collectionRemove);
                    }
                },
                mixin: mixin(null, defaultOptions)
            };
        }());
        var defaultCallbacks                = Validation.callbacks = {
            valid: function(view, attr, selector) {
                view.$('[' + selector + '~="' + attr + '"]').removeClass('invalid').removeAttr('data-error');
            },
            invalid: function(view, attr, error, selector) {
            view.$('[' + selector + '~="' + attr + '"]')
                .addClass('invalid')
                .attr('data-error', error);
          }
        };
        var defaultPatterns                 = Validation.patterns = {
            digits: /^\d+$/,  
            number: /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/,  
            email: /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
            url: /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
        };
        var defaultMessages                 = Validation.messages = {
            required: '{0} is required',
            acceptance: '{0} must be accepted',
            min: '{0} must be greater than or equal to {1}',
            max: '{0} must be less than or equal to {1}',
            range: '{0} must be between {1} and {2}',
            length: '{0} must be {1} characters',
            minLength: '{0} must be at least {1} characters',
            maxLength: '{0} must be at most {1} characters',
            rangeLength: '{0} must be between {1} and {2} characters',
            oneOf: '{0} must be one of: {1}',
            equalTo: '{0} must be the same as {1}',
            digits: '{0} must only contain digits',
            number: '{0} must be a number',
            email: '{0} must be a valid email',
            url: '{0} must be a valid url',
            inlinePattern: '{0} is invalid'
        };
        var defaultLabelFormatters          = Validation.labelFormatters = {
            none: function(attrName) {
                return attrName;
            },
            sentenceCase: function(attrName) {
                return attrName.replace(/(?:^\w|[A-Z]|\b\w)/g, function(match, index) {
                    return index === 0 ? match.toUpperCase() : ' ' + match.toLowerCase();
                }).replace(/_/g, ' ');
            },
            label: function(attrName, model) {
                return (model.labels && model.labels[attrName]) || defaultLabelFormatters.sentenceCase(attrName, model);
            }
        };
        var defaultValidators               = Validation.validators = (function(){
            var trim = String.prototype.trim ?
                function(text) {
                  return text === null ? '' : String.prototype.trim.call(text);
                } :
                function(text) {
                    var trimLeft = /^\s+/, trimRight = /\s+$/;
                    return text === null ? '' : text.toString().replace(trimLeft, '').replace(trimRight, '');
                };  
            var isNumber = function(value){
                    return _.isNumber(value) || (_.isString(value) && value.match(defaultPatterns.number));
                };  
            var hasValue = function(value) {
                    return !(_.isNull(value) || _.isUndefined(value) || (_.isString(value) && trim(value) === '') || (_.isArray(value) && _.isEmpty(value)));
                };
            return {
                fn: function(value, attr, fn, model, computed) {
                  if(_.isString(fn)){
                    fn = model[fn];
                  }
                  return fn.call(model, value, attr, computed);
                },
                required: function(value, attr, required, model, computed) {
                  var isRequired = _.isFunction(required) ? required.call(model, value, attr, computed) : required;
                  if(!isRequired && !hasValue(value)) {
                    return false; // overrides all other validators
                  }
                  if (isRequired && !hasValue(value)) {
                    return this.format(defaultMessages.required, this.formatLabel(attr, model));
                  }
                },
                acceptance: function(value, attr, accept, model) {
                  if(value !== 'true' && (!_.isBoolean(value) || value === false)) {
                    return this.format(defaultMessages.acceptance, this.formatLabel(attr, model));
                  }
                },
                min: function(value, attr, minValue, model) {
                  if (!isNumber(value) || value < minValue) {
                    return this.format(defaultMessages.min, this.formatLabel(attr, model), minValue);
                  }
                },
                max: function(value, attr, maxValue, model) {
                  if (!isNumber(value) || value > maxValue) {
                    return this.format(defaultMessages.max, this.formatLabel(attr, model), maxValue);
                  }
                },
                range: function(value, attr, range, model) {
                  if(!isNumber(value) || value < range[0] || value > range[1]) {
                    return this.format(defaultMessages.range, this.formatLabel(attr, model), range[0], range[1]);
                  }
                },
                length: function(value, attr, length, model) {
                  if (!_.isString(value) || value.length !== length) {
                    return this.format(defaultMessages.length, this.formatLabel(attr, model), length);
                  }
                },
                minLength: function(value, attr, minLength, model) {
                  if (!_.isString(value) || value.length < minLength) {
                    return this.format(defaultMessages.minLength, this.formatLabel(attr, model), minLength);
                  }
                },
                maxLength: function(value, attr, maxLength, model) {
                  if (!_.isString(value) || value.length > maxLength) {
                    return this.format(defaultMessages.maxLength, this.formatLabel(attr, model), maxLength);
                  }
                },
                rangeLength: function(value, attr, range, model) {
                  if (!_.isString(value) || value.length < range[0] || value.length > range[1]) {
                    return this.format(defaultMessages.rangeLength, this.formatLabel(attr, model), range[0], range[1]);
                  }
                },
                oneOf: function(value, attr, values, model) {
                  if(!_.include(values, value)){
                    return this.format(defaultMessages.oneOf, this.formatLabel(attr, model), values.join(', '));
                  }
                },
                equalTo: function(value, attr, equalTo, model, computed) {
                  if(value !== computed[equalTo]) {
                    return this.format(defaultMessages.equalTo, this.formatLabel(attr, model), this.formatLabel(equalTo, model));
                  }
                },
                pattern: function(value, attr, pattern, model) {
                  if (!hasValue(value) || !value.toString().match(defaultPatterns[pattern] || pattern)) {
                    return this.format(defaultMessages[pattern] || defaultMessages.inlinePattern, this.formatLabel(attr, model), pattern);
                  }
                }
              };
        }());
        _.each(defaultValidators, function(validator, key){
            defaultValidators[key] = _.bind(defaultValidators[key], _.extend({}, formatFunctions, defaultValidators));
        });
    });*/
    //==[ Foundry ]=========================================================================================================================
    Backbone.Foundry                    = Backbone.Collection.extend({});
    _.extend(Backbone.Foundry.prototype,{
        localStorage: new Backbone.LocalStorage('Foundry-'),
        model:        Backbone.Mold,
        initialize:   function(options){
            _.log('Forge Initialized');
            this.listenTo(this, 'add', this.cast);
        },
        insert:     function(model,index){
            if(_.isNull(index) || index > this.length) index = this.length;
            else index = (!this.length)?0:this.length;
            
            if(model instanceof Backbone.Mold){
                _.log('alloy received - '+index);
                this.add(model);                
            }
        },
        cast:         function(model,collection,options){
            _.log('alloy cast');
        }
    });
    //==[ Forge ]===========================================================================================================================
    var Forge                           = function(options){
        this._super                     = Forge.prototype;
        this.cid                        = _.uniqueId('Foundry-');
        this.foundry                    = new Backbone.Foundry(); 
        this.initialize.apply(this, arguments);
    };
    _.extend(Forge.prototype, {
        initialize:   function(options){
            this.previous = null;
            this.active   = null;
        },
        insert: function(model,index){
            this.foundry.insert(model,index);
        },
        goto:         function(name){
            var self = this;
		    if (!_.isNull(this.active)) {
                var prev = this.cast(this.active);
                prev.transition('out').done(function(){
                    self.previous = self.active;
                    _.log(this.id+': transitioned : out - previous ='+self.previous);
                });         
		    } 
            var next = this.cast(name);
            next.render().then(function(){
                this.$el.append(next.$el);
                next.transition('in','right').done(function(){
                    _.log(this.id+': transitioned : in');
                    self.active = next.id;
                });
            });	
        },
        cast:         function(name){
            var mold = this.foundry.findWhere({ 'name': name });
            if(this.isMold(mold)) return (this.isLayout(mold.get('layout'))) ? mold.get('layout') : undefined;
        },
        isMold:       function(mold){
            return mold instanceof Backbone.Mold;
        },
        isLayout:     function(layout){
            return layout instanceof Backbone.Layout;
        }
    });
    Backbone.Forge = new Forge();
	return Backbone;
});