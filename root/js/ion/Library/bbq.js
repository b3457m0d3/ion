/*!
 * jQuery BBQ: Back Button & Query Library - v1.3pre - 8/26/2010
 * http://benalman.com/projects/jquery-bbq-plugin/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
// Basic AJAX     - http://benalman.com/code/projects/jquery-bbq/examples/fragment-basic/
// Advanced AJAX  - http://benalman.com/code/projects/jquery-bbq/examples/fragment-advanced/

define(['jquery','underscore','backbone'], function($,_,Backbone){ 
  (function($,_,window,undefined){
      // Some convenient shortcuts.
      var undefined, aps = Array.prototype.slice, decode = decodeURIComponent,
        // Method / object references.
        jq_param = $.param, jq_param_sorted, jq_param_fragment,
        jq_deparam, jq_deparam_fragment,
        jq_bbq = $.bbq = $.bbq || {}, jq_bbq_pushState, jq_bbq_getState,
        jq_elemUrlAttr,
        special = $.event.special,
        str_hashchange  = 'hashchange',  str_querystring = 'querystring', str_fragment = 'fragment', 
        str_elemUrlAttr = 'elemUrlAttr', str_href        = 'href',        str_src      = 'src',
        re_params_querystring = /^.*\?|#.*$/g, re_params_fragment, re_fragment, re_no_escape,
        ajax_crawlable,
        fragment_prefix,
        elemUrlAttr_cache = {};
      function curry( func ) {
        var args = aps.call( arguments, 1 );
        return function() {
          return func.apply( this, args.concat( aps.call( arguments ) ) );
        };
      };
      function get_fragment( url ) {
        return url.replace( re_fragment, '$2' );
      };
      function get_querystring( url ) {
        return url.replace( /(?:^[^?#]*\?([^#]*).*$)?.*/, '$1' );
      }; 
      function jq_param_sub( is_fragment, get_func, url, params, merge_mode ) {
        var result, qs, matches, url_params, hash;

        if ( params !== undefined ) {      
          // matches[1] = url part that precedes params, not including trailing ?/#
          // matches[2] = params, not including leading ?/#
          // matches[3] = if in 'querystring' mode, hash including leading #, otherwise ''
          matches = url.match( is_fragment ? re_fragment : /^([^#?]*)\??([^#]*)(#?.*)/ );
          hash = matches[3] || '';

          if ( merge_mode === 2 && _.isString( params ) ) {
            qs = params.replace( is_fragment ? re_params_fragment : re_params_querystring, '' );  
          } else {
            url_params = jq_deparam( matches[2] );
            params = _.isString( params )

              // Convert passed params string into object.
              ? jq_deparam[ is_fragment ? str_fragment : str_querystring ]( params )

              // Passed params object.
              : params;

            qs = merge_mode === 2 ? params                              // passed params replace url params
              : merge_mode === 1  ? $.extend( {}, params, url_params )  // url params override passed params
              : $.extend( {}, url_params, params );                     // passed params override url params

            // Convert params object into a sorted params string.
            qs = jq_param_sorted( qs );
            if ( is_fragment ) {
              qs = qs.replace( re_no_escape, decode );
            }
          }
          result = matches[1] + ( is_fragment ? fragment_prefix : qs || !matches[1] ? '?' : '' ) + qs + hash;
        } else {
          result = get_func( url !== undefined ? url : location.href );
        }
        return result;
      };
      jq_param[ str_querystring ]                  = curry( jq_param_sub, 0, get_querystring );
      jq_param[ str_fragment ] = jq_param_fragment = curry( jq_param_sub, 1, get_fragment );
      jq_param.sorted = jq_param_sorted = function( a, traditional ) {
        var arr = [], obj = {};
        $.each( jq_param( a, traditional ).split( '&' ), function(i,v){
          var key = v.replace( /(?:%5B|=).*$/, '' ),
            key_obj = obj[ key ];

          if ( !key_obj ) {
            key_obj = obj[ key ] = [];
            arr.push( key );
          }

          key_obj.push( v );
        });
        return $.map( arr.sort(), function(v){
          return obj[ v ];
        }).join( '&' );
      };
      jq_param_fragment.noEscape = function( chars ) {
        chars = chars || '';
        var arr = $.map( chars.split(''), encodeURIComponent );
        re_no_escape = new RegExp( arr.join('|'), 'g' );
      };
      jq_param_fragment.noEscape( ',/' );  
      jq_param_fragment.ajaxCrawlable = function( state ) {
        if ( state !== undefined ) {
          if ( state ) {
            re_params_fragment = /^.*(?:#!|#)/;
            re_fragment = /^([^#]*)(?:#!|#)?(.*)$/;
            fragment_prefix = '#!';
          } else {
            re_params_fragment = /^.*#/;
            re_fragment = /^([^#]*)#?(.*)$/;
            fragment_prefix = '#';
          }
          ajax_crawlable = !!state;
        }

        return ajax_crawlable;
      };
      jq_param_fragment.ajaxCrawlable( 0 );
      $.deparam = jq_deparam = function( params, coerce ) {
        var obj = {}, coerce_types = { 'true': !0, 'false': !1, 'null': null };
        $.each( params.replace( /\+/g, ' ' ).split( '&' ), function(j,v){
          var param = v.split( '=' ),
            key = decode( param[0] ),
            val,
            cur = obj,
            i = 0,

            // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
            // into its component parts.
            keys = key.split( '][' ),
            keys_last = keys.length - 1;

          // If the first keys part contains [ and the last ends with ], then []
          // are correctly balanced.
          if ( /\[/.test( keys[0] ) && /\]$/.test( keys[ keys_last ] ) ) {
            // Remove the trailing ] from the last keys part.
            keys[ keys_last ] = keys[ keys_last ].replace( /\]$/, '' );

            // Split first keys part into two parts on the [ and add them back onto
            // the beginning of the keys array.
            keys = keys.shift().split('[').concat( keys );

            keys_last = keys.length - 1;
          } else {
            // Basic 'foo' style key.
            keys_last = 0;
          }

          // Are we dealing with a name=value pair, or just a name?
          if ( param.length === 2 ) {
            val = decode( param[1] );

            // Coerce values.
            if ( coerce ) {
              val = val && !isNaN(val)            ? +val              // number
                : val === 'undefined'             ? undefined         // undefined
                : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
                : val;                                                // string
            }

            if ( keys_last ) {
              // Complex key, build deep object structure based on a few rules:
              // * The 'cur' pointer starts at the object top-level.
              // * [] = array push (n is set to array length), [n] = array if n is 
              //   numeric, otherwise object.
              // * If at the last keys part, set the value.
              // * For each keys part, if the current level is undefined create an
              //   object or array based on the type of the next keys part.
              // * Move the 'cur' pointer to the next level.
              // * Rinse & repeat.
              for ( ; i <= keys_last; i++ ) {
                key = keys[i] === '' ? cur.length : keys[i];
                cur = cur[key] = i < keys_last
                  ? cur[key] || ( keys[i+1] && isNaN( keys[i+1] ) ? {} : [] )
                  : val;
              }

            } else {
              // Simple key, even simpler rules, since only scalars and shallow
              // arrays are allowed.

              if ( $.isArray( obj[key] ) ) {
                // val is already an array, so push on the next value.
                obj[key].push( val );

              } else if ( obj[key] !== undefined ) {
                // val isn't an array, but since a second value has been specified,
                // convert val into an array.
                obj[key] = [ obj[key], val ];

              } else {
                // val is a scalar.
                obj[key] = val;
              }
            }

          } else if ( key ) {
            // No value was defined, so set something meaningful.
            obj[key] = coerce
              ? undefined
              : '';
          }
        });
        return obj;
      };
      function jq_deparam_sub( is_fragment, url_or_params, coerce ) {
        if ( url_or_params === undefined || typeof url_or_params === 'boolean' ) {
          // url_or_params not specified.
          coerce = url_or_params;
          url_or_params = jq_param[ is_fragment ? str_fragment : str_querystring ]();
        } else {
          url_or_params = _.isString( url_or_params )
            ? url_or_params.replace( is_fragment ? re_params_fragment : re_params_querystring, '' )
            : url_or_params;
        }

        return jq_deparam( url_or_params, coerce );
      };
      jq_deparam[ str_querystring ]                    = curry( jq_deparam_sub, 0 );
      jq_deparam[ str_fragment ] = jq_deparam_fragment = curry( jq_deparam_sub, 1 );
      $[ str_elemUrlAttr ] || ($[ str_elemUrlAttr ] = function( obj ) {
        return $.extend( elemUrlAttr_cache, obj ); 
      })({
        a: str_href,
        base: str_href,
        iframe: str_src,
        img: str_src,
        input: str_src,
        form: 'action',
        link: str_href,
        script: str_src
      });
      jq_elemUrlAttr = $[ str_elemUrlAttr ];  
      function jq_fn_sub( mode, force_attr, params, merge_mode ) {
        if ( !_.isString( params ) && typeof params !== 'object' ) {
          // force_attr not specified.
          merge_mode = params;
          params = force_attr;
          force_attr = undefined;
        }
        return this.each(function(){
          var that = $(this),
            attr = force_attr || jq_elemUrlAttr()[ ( this.nodeName || '' ).toLowerCase() ] || '',
            url = attr && that.attr( attr ) || '';
          that.attr( attr, jq_param[ mode ]( url, params, merge_mode ) );
        });
      };
      $.fn[ str_querystring ] = curry( jq_fn_sub, str_querystring );
      $.fn[ str_fragment ]    = curry( jq_fn_sub, str_fragment );
      jq_bbq.pushState = jq_bbq_pushState = function( params, merge_mode ) {
        if ( _.isString( params ) && /^#/.test( params ) && merge_mode === undefined ) {
          // Params string begins with # and merge_mode not specified, so completely
          // overwrite window.location.hash.
          merge_mode = 2;
        }

        var has_args = params !== undefined,
          // Merge params into window.location using $.param.fragment.
          url = jq_param_fragment( location.href,
            has_args ? params : {}, has_args ? merge_mode : 2 );

        // Set new window.location.href. Note that Safari 3 & Chrome barf on
        // location.hash = '#' so the entire URL is set.
        location.href = url;
      };
      jq_bbq.getState = jq_bbq_getState = function( key, coerce ) {
        return key === undefined || typeof key === 'boolean'
          ? jq_deparam_fragment( key ) // 'key' really means 'coerce' here
          : jq_deparam_fragment( coerce )[ key ];
      };
      jq_bbq.removeState = function( arr ) {
        var state = {};

        if ( arr !== undefined ) {
          state = jq_bbq_getState();
          $.each( $.isArray( arr ) ? arr : arguments, function(i,v){
            delete state[ v ];
          });
        }
        jq_bbq_pushState( state, 2 );
      };  
      special[ str_hashchange ] = $.extend( special[ str_hashchange ], {
    add: function( handleObj ) {
      var old_handler;
      
      function new_handler(e) {
        // e.fragment is set to the value of location.hash (with any leading #
        // removed) at the time the event is triggered.
        var hash = e[ str_fragment ] = jq_param_fragment();
        
        // e.getState() works just like $.bbq.getState(), but uses the
        // e.fragment property stored on the event object.
        e.getState = function( key, coerce ) {
          return key === undefined || typeof key === 'boolean'
            ? jq_deparam( hash, key ) // 'key' really means 'coerce' here
            : jq_deparam( hash, coerce )[ key ];
        };
        
        old_handler.apply( this, arguments );
      };
      
      // This may seem a little complicated, but it normalizes the special event
      // .add method between jQuery 1.4/1.4.1 and 1.4.2+
      if ( $.isFunction( handleObj ) ) {
        // 1.4, 1.4.1
        old_handler = handleObj;
        return new_handler;
      } else {
        // 1.4.2+
        old_handler = handleObj.handler;
        handleObj.handler = new_handler;
      }
    }
  });
    })(jQuery,_,this);
    (function($,_,window,undefined){
  // Reused string.
  var str_hashchange = 'hashchange', doc = document, fake_onhashchange, special = $.event.special,
    doc_mode = doc.documentMode, supports_onhashchange = 'on' + str_hashchange in window && ( doc_mode === undefined || doc_mode > 7 );
  function get_fragment( url ) {
    url = url || location.href;
    return '#' + url.replace( /^[^#]*#?(.*)$/, '$1' );
  };
  $.fn[ str_hashchange ] = function( fn ) {
    return fn ? this.bind( str_hashchange, fn ) : this.trigger( str_hashchange );
  };
  $.fn[ str_hashchange ].delay = 50;
  special[ str_hashchange ] = $.extend( special[ str_hashchange ], {
    setup: function() {
      if ( supports_onhashchange ) { return false; }
      $( fake_onhashchange.start );
    },
    teardown: function() {
      if ( supports_onhashchange ) { return false; }
      $( fake_onhashchange.stop );
    } 
  });
  fake_onhashchange = (function(){
    var self = {},
      timeout_id,
      last_hash = get_fragment(),
      
      fn_retval = function(val){ return val; },
      history_set = fn_retval,
      history_get = fn_retval;
    
    self.start = function() {
      timeout_id || poll();
    };
    self.stop = function() {
      timeout_id && clearTimeout( timeout_id );
      timeout_id = undefined;
    };
    function poll() {
      var hash = get_fragment(),
        history_hash = history_get( last_hash );
      
      if ( hash !== last_hash ) {
        history_set( last_hash = hash, history_hash );
        
        $(window).trigger( str_hashchange );
        
      } else if ( history_hash !== last_hash ) {
        location.href = location.href.replace( /#.*/, '' ) + history_hash;
      }
      
      timeout_id = setTimeout( poll, $.fn[ str_hashchange ].delay );
    };
        
    return self;
  })();
})(jQuery,_,this);
});
