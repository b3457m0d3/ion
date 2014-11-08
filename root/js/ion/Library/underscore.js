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
            }
        })
    );
    return _;
});
