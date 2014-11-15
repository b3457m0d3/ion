/*global require*/
'use strict';

// Require.js allows us to configure shortcut alias
require.config({
    paths: {
        //################################################################# Core Classes ########################
        "Controller"   : "ion/Core/Controller",
        "Router"       : "ion/Core/Router",
        //################################################################# END Core Classes #####################
        //Libraries =======================================================================================
        "jquery"       : "ion/Library/jquery",
        "lodash"       : "ion/Library/lodash",
        "us-string"    : "ion/Library/underscore-string",
        "mettle"       : "ion/Library/backbone",
        "Manual"       : "ion/Library/Manual",
        "Forge"        : "ion/Library/Forge",
        "Foundry"      : "ion/Library/Foundry",
        "Ion"          : "ion/Library/Ion",
        "Associate"    : "ion/Library/Associate",
        "bbq"          : "ion/Library/bbq",
        "Velocity"     : "ion/Library/Velocity",
        "Velocity.ui"  : "ion/Library/Velocity-ui",
        // custom extended versions for ion
          "underscore" : "ion/Library/underscore",
          "backbone"   : "ion/Library/mettle",
        //Helpers =========================================================================================
        "us-helpers"   : "ion/Helper/template-helpers",
        "Index"        : "ion/Helper/Index",
        "Editor"       : "ion/Helper/Editor",
        "Cookie"       : "ion/Helper/Cookie",
        //"text"         : "http://cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text.min",
        //UI Components ==========================================================================================
        //"mCScroll"     : "http://malihu.github.io/custom-scrollbar/jquery.mCustomScrollbar.concat.min",
        //"ace"          : "http://cdnjs.cloudflare.com/ajax/libs/ace/1.1.3/ace",
        //"hcolumns"     : "jq/hcolumns",

        //################################################################# Backbone Classes #####################
        //== controllers
        "Main"         : "ion/Controller/Main",
        //== models
        "Model"        : "ion/Model/Model",
        "IndexModel"   : "ion/Model/IndexModel",
        "EditorModel"  : "ion/Model/EditorModel",
        "Mold"         : "ion/Model/Mold",
        "Mercury"      : "ion/Model/Hg",
        //== views
        "IndexView"    : "ion/View/IndexView",
        "EditorView"   : "ion/View/EditorView",
    },
    shim: {
        'mettle'       : { deps: ["jquery","underscore"], exports: 'Backbone' },
        'bbq'          : { deps: ["jquery"], exports: 'bbq'},
        'Controller'   : ['backbone','underscore'],
        'us-string'    : ['lodash'],
        'Velocity'     : ['jquery'],
        'Velocity.ui'  : ['Velocity'],
        'Cookie'       : ["jquery"]
        //"mCScroll"     : ['jquery']
    }
});

require(['jquery','underscore','backbone','Router'], function ($,_,Backbone,Router) {
	var App = new Router();
});
