define(["jquery","underscore","backbone"], function($,_,Backbone){
	var Backbone = window.Backbone = Backbone;
	var _filterAssociates = function (context, attributes, options) {
		var attrs, current = context.attributes, action, key, association, associations = context._associations, omit = [];
		for (key in associations) {
			association = associations[key];
			attrs = attributes[key];
			if (_isAssociatedType(association, current[key])) {
				if (_isAssociatedType(association, attrs)) {
					current[key] = attrs;
					omit.push(key);
				} else if (attrs && attrs !== null){
					current[key].set(attrs, options);
					omit.push(key);
				}
			} else {
				attributes[key] = _buildAssociation(context, association, attrs, options);
			}
		}
		return _.omit(attributes, omit);
	},
	_isAssociatedType = function (association, obj) {
		return (obj instanceof association.type);
	},
	_buildAssociation = function (context, association, attributes, options) {
		var result = new (association.type)(attributes, options);
		if (association.url) {
			result.url = function () {
				return _.result(context, 'url') + _.result(association, 'url');
			};
		}
		return result;
	},
	_wrapMethod = function (context, wrapper, key) {
		var original = context[key], wrapped = _.wrap(original, wrapper);
		wrapped.unwrap = function () {
			context[key] = original;
		};
		context[key] = wrapped;
	},
	_extensions = {
		set: function (original, key, val, options) {
			var self = this, attributes = {};
			if (_.isObject(key)) {
				_.extend(attributes, key);
			} else {
				attributes[key] = val;
			}
			if (_.isObject(val) && (typeof options === "undefined" || options === null)) {
				options = val;
			}
			return original.call(self, _filterAssociates(self, attributes, options), options);
		},
		toJSON: function (original, options) {
			var self = this, key, associations = self._associations, attributes = original.call(self, options);
			for (key in associations) {
				if (_isAssociatedType(associations[key], attributes[key])) {
					attributes[key] = attributes[key].toJSON();
				}
			}
			return attributes;
		}
	},
	_initialize = function (original, attrs, options) {
		var self = this, key, extensions = _.clone(_extensions);
		for (key in self._associations) {
			extensions[key] = _.partial(self.get, key);
		}
		_.each(extensions, _.partial(_wrapMethod, self));
		_filterAssociates(self, self.attributes, options);
		return original.call(self, attrs, options);
	};
	Backbone.associate = function (klass, associations) {
		var proto = klass.prototype;
		if (!proto._associations) {
			_wrapMethod(proto, _initialize, 'initialize');
			proto._associations = {};
		}
		_.extend(proto._associations, associations);
	};
	Backbone.dissociate = function (klass) {
		var proto = klass.prototype;
		proto.initialize.unwrap();
		proto._associations = null;
	};

});
