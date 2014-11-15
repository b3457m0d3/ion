ion
===

a frontend framework with mettle.

What started off as a proof of concept became a new way to realize how it all comes together.

ion is meant as a counterpart for Lattice - a php framework i am developing.  in tandem the two will open up new levels of interactive design, but the two also work 100% independent of one another.  
tandem makes use of jQuery( of course ), & RequireJS, along with Mettle( my own augmented flavor of Backbone.js ), & LoDash.  

ion strives to do one(1) thing - manage a set of views and transition between them - and do it well, along the way it manages to accomplish a lot more.

baked in goodness:
===
- <b>Forge</b>   : Global access object for the framework
- <b>Foundry</b> : Global storage for "Page" Models
- <b>Hg</b> ver:0.0.1 : Transition Engine 
- <b>Mettle</b> : Structurally re-enforced version of Backbone
- <b>Model</b> ver:0.0.1 : Enhanced Backbone.Model drop-in  

**Third Party Libraries/Extensions/Inspiration** 
- <b>Backbone.associate</b> : a "just the basics" ORM (object relation mapper) impementation for models
- <b>$.bbq </b> : url # (hash) listener for url-based state management
- <b>Backbone.Controller</b> : MV...C! Take back control from Backbone.Router
- <b>Backbone.fwd </b> : Make objects (Models,Views,Collections) listen to each other's events
- <b>Backbone.Global </b> : simplifies global event-binding (no more overusing listenTo in your initialize calls)
- <b>Backbone.Intercept</b> ver:0.3.1 : eliminates the need to call preventDefault when hijacking events. Forms & links.
- <b>Backbone.LayoutManager</b> ver:0.9.5 : View lifecycle management, nested views, auto-rendering, & template handling 
- <b>Backbone.Ribs</b> : Enhanced Model - deep get/set & computed attributes
- <b>$.Velocity</b> ver:1.1.0 : `jQuery.animate()` replacement/enhancement
- <b>$.Velocity-UI</b> ver:5.0.0 : support chained animations and more

special thanks:
  to tbranyen and all the contributors to Backbone.LayoutManager for making it one step closer to a surmountable goal.

note: a special collection called `Manual` is included in the source and contains a comprehensive list of all third-party extensions utilized along with versioning information (if any) and the URL of the respective repository and/or source
  
  
