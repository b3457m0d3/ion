define("underscore",["jquery","lodash", "us-string"], function($,_) {
    _.mixin(
		_.extend(_.str.exports(),{
            /*
            *  an alias (shortcut method) for logging data to the console
            */
            log: function(val){
                console.log(val);
            },
            explode: function(str,by){
                return (_.inStr(str,by)) ? str.split(by) : str;
            },
            inStr: function(str,search){
                return _.str.include(str,search);
            },
            elType: function(el){
                var type;
                if(_.startsWith(el,'#')) type = '#';
                else if(_.startsWith(el,'.')) type = '.';
                else type = 'name';
                return type;
            },
            tagType: function(tag,el){
                var tagType;
                switch(tag){
                    case 'a': case 'aside': case 'b': case 'blockquote': case 'div': case 'em': case 'footer': case 'h1':
                    case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': case 'header': case 'i': case 'li': case 'p':
                    case 'section': case 'small': case 'span': case 'strong': case 'u': tagType = 'content'; break;
                    case 'select': tagType = 'select'; break;
                    case 'input':
                        var type = $(el).attr('type');
                        switch(type){
                            case 'email': case 'hidden': case 'number': case 'password': case 'reset': case 'submit': case 'tel':
                            case 'text': case 'textarea': tagType = 'value';    break;
                            case 'checkbox':              tagType = 'checkbox'; break;
                            case 'radio':                 tagType = 'radio';    break;
                        }
                    break;
                }
                return tagType;
            },
	        prius: function(str,before){
                return (_.inStr(str,before))? _(str).strLeft(before) : false;
            },
            post: function(str,after){
                return (_.inStr(str,after))? _(str).strRight(after) : false;
            },
            notArray: function(x){
                return (!_.isArray(x))?true:false;
            },
            filterAssociates: function (context, attributes, options) {
                var attrs, current = context.attributes, action, key, association, associations = context._associations, omit = [];
                for (key in associations) {
                    association = associations[key];
                    attrs = attributes[key];
                    if (_.isAssociatedType(association, current[key])) {
                        if (_.isAssociatedType(association, attrs)) {
                            current[key] = attrs;
                            omit.push(key);
                        } else if (attrs && attrs !== null){
                            current[key].set(attrs, options);
                            omit.push(key);
                        }
                    } else {
                        attributes[key] = _.buildAssociation(context, association, attrs, options);
                    }
                }
                return _.omit(attributes, omit);
            },
            isAssociatedType: function (association, obj) {
                return (obj instanceof association.type);
            },
            buildAssociation: function (context, association, attributes, options) {
                var result = new (association.type)(attributes, options);
                if (association.url) {
                    result.url = function () {
                        return _.result(context, 'url') + _.result(association, 'url');
                    };
                }
                return result;
            },
            wrapMethod: function (context, wrapper, key) {
                var original = context[key], wrapped = _.wrap(original, wrapper);
                wrapped.unwrap = function () {
                    context[key] = original;
                };
                context[key] = wrapped;
            },
            initWrapper: function (original, attrs, options) {
                var mixins = {
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
                        return original.call(self, _.filterAssociates(self, attributes, options), options);
                    },
                    toJSON: function (original, options) {
                        var self = this, key, associations = self._associations, attributes = original.call(self, options);
                        for (key in associations) {
                            if (_.isAssociatedType(associations[key], attributes[key])) {
                                attributes[key] = attributes[key].toJSON();
                            }
                        }
                        return attributes;
                    }
                };
                var self = this, key, extensions = _.clone(mixins);
                for (key in self._associations) { extensions[key] = _.partial(self.get, key); }
                _.each(extensions, _.partial(_.wrapMethod, self));
                _.filterAssociates(self, self.attributes, options);
                return original.call(self, attrs, options);
            },
            /*splitModelAttr  function (modelAttr) {
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
            },*/
            deletePath: function (path, obj) {
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
            split: function (str) {
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
            getPath: function (path, obj) {
                var p, i, l;
                if (typeof path === 'string') {
                    path = _.split(path);
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
        })
    );
    return _;
});
