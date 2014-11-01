/*global require*/
'use strict';

// Require.js allows us to configure shortcut alias
require.config({
    paths: {
        //################################################################# Core Classes ########################
        "Controller"   : "ion/Core/Controller",
        "Model"        : "ion/Core/Model",
        "Router"       : "ion/Core/Router",
        "View"         : "ion/Core/View",
        //################################################################# END Core Classes #####################
        //Libraries =======================================================================================
        "jquery"       : "ion/Library/jquery",
        "lodash"       : "ion/Library/lodash",
        "us-string"    : "ion/Library/underscore-string",
        "mettle"       : "ion/Library/backbone",
        // custom extended versions for ion
          "underscore" : "ion/Library/underscore",
          "backbone"   : "ion/Library/mettle",
          //"Stack"      : "ion/Library/Stack",
        //Helpers =========================================================================================
        "us-helpers"   : "ion/Helper/template-helpers",
        "Index"        : "ion/Helper/Index",
        "Editor"       : "ion/Helper/Editor",
        //"text"         : "http://cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text.min",
        //UI Components ==========================================================================================
        //"mCScroll"     : "http://malihu.github.io/custom-scrollbar/jquery.mCustomScrollbar.concat.min",
        //"ace"          : "http://cdnjs.cloudflare.com/ajax/libs/ace/1.1.3/ace",
        //"hcolumns"     : "jq/hcolumns",

        //################################################################# Backbone Classes #####################
        //== controllers
        "Main"          : "ion/Controller/Main",
        //== models
        "IndexModel"   : "ion/Model/IndexModel",
        "EditorModel"  : "ion/Model/EditorModel",
        //== views
        "IndexView"    : "ion/View/IndexView",
        "EditorView"   : "ion/View/EditorView",
    },
    shim: {
        'mettle'       : { deps: ["jquery","underscore"], exports: 'Backbone' },
        'Controller'   : ['backbone','underscore'],
        'us-string'    : ['lodash'],
        //"mCScroll"     : ['jquery']
    }
});

require(['jquery','underscore','backbone','Router'], function ($,_,Backbone,Router) {
	var App = new Router();
});