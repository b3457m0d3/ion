define(["jquery","underscore","backbone"], function($,_,Backbone){
	var _super = function (self, method, args){
		if(_.has(self,method)) return self[method].apply(self,args);
	},
	_split = function (str) {
		if (str.indexOf('!.') === -1) {
			return str.split('.');
		}
		var res = [], length, _length, l, last, s, i, j;
		str = str.split('!.');
		length = str.length;
		for (i = 0; i < length; i++) {
			s = str[i].split('.');
			_length = s.length;
			if (last !== undefined) {
				last += '.' + s[0];

				if (_length > 1) {
					res.push(last);
				} else {
					if (i + 1 === length) {
						res.push(last);
					}
					continue;
				}
				j = 1;
			} else {
				j = 0;
			}
			if (i + 1 < length) {
				l = _length - 1;
				last = s[_length - 1];
			} else {
				l = _length;
			}
			for (; j < l; j++) {
				res.push(s[j]);
			}
		}
		return res;
	},
	getPath = function (path, obj) {
		var p, i, l;
		if (typeof path === 'string') {
			path = _split(path);
		}
		for (i = 0, l = path.length; i < l; i++) {
			p = path[i];
			if (obj.hasOwnProperty(p)) {
				obj = obj[p];
			} else {
				if (l > i + 1) {
					throw new Error('can\'t get "' + path[i + 1] + '" of "' + p + '", "' + p +'" is undefined');
				} else {
					return undefined;
				}
			}
		}
		return obj;
	},
	deletePath = function (path, obj) {
		var p;
		for (var i = 0, l = path.length; i < l; i++) {
			p = path[i];
			if (i + 1 === l) {
				delete obj[p];
			} else {
				if (obj.hasOwnProperty(p)) {
					obj = obj[p];
				} else {
					break;
				}
			}
		}
	},
	splitModelAttr = function (modelAttr) {
		var parsed = modelAttr.match(/^(?:!\.|[^.])+/), model, attr;
		try {
			model = parsed[0];
			attr = modelAttr.slice(model.length + 1);
			if (!attr.length || !model.length) {
				throw '';
			}
		} catch (e) {
			throw new Error('wrong binging data"' + modelAttr + '"');
		}
		return {
			model: model,attr: attr
		};
	},
	Computed = function (data, name, model) {
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
	var Model = Backbone.Model.extend(_.extend({
		_super:          Backbone.Model,
		constructor:     function(attributes, options) {
			this.cid = _.uniqueId('c');
			this.associations = this.associations || {};
			if(!this.associations.length){
				_.log('no association for'+ this.cid);
			} else {
				Backbone.associate(this,this.associations);
				_.each(this.associations,function(val,key){
					_.log(key+" "+val);
				});
			}
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
			var path = _split(attr);
			if (path.length === 1) {
				return this.attributes[path[0]];
			} else {
				return getPath(path, this.attributes);
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
					path = _split(attr);
					if (!_.isEqual(getPath(path, current), val)) {
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
					if (!_.isEqual(getPath(path, prev), val)) {
						this.changed[attr] = val;
					} else {
						delete this.changed[attr];
					}
					if (unset && (attr in realAttrs)) {
						deletePath(path, current);
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
			return Backbone.Model.trigger.apply(this,arguments);
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
							depArr = _split(deps[i]);
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
	return Model;
});
