var view  = require('../view'),
    uki   = require('../uki'),
    utils = require('../utils'),
    fun   = require('../function'),
    dom   = require('../dom'),
    evt   = require('../event');

var Base = view.Base = exports.Base = fun.newClass({});

var proto = Base.prototype;

proto.typeName = 'Base';

proto.init = function(initArgs) {
    initArgs = initArgs || {};
    this._setup(initArgs);
    this._createDom(initArgs);
    this.dom()[uki.expando] = this.dom()[uki.expando] || uki.guid++;
    view.register(this);
};

proto.destruct = function() {
    uki.unregisterId(this);
    view.unregister(this);
    this.removeListener();
    this.destructed = true;
};

proto._setup = uki.FS;

/**#@+ @memberOf uki.view.Base# */

proto._createDom = function(initArgs) {
    this._dom = dom.createElement(initArgs.tagName || 'div');
};

/**
* Called when view was resized
*/
proto.resized = uki.FS;

/**
* Get views container dom node.
* @returns {Element} dom
*/
proto.dom = function() {
    return this._dom;
};


fun.delegateProp(proto, 'html', '_dom', 'innerHTML');

proto.text = function(v) {
    return this.html(v && utils.escapeHTML(v));
};

/* ------------------------------- Common settings --------------------------------*/
/**
* Used for fast (on hash lookup) view searches: uki('#view_id');
*
* @param {string=} id New id value
* @returns {string|uki.view.Base} current id or self
*/
proto.id = function(id) {
    if (id === undefined) { return this._dom.id; }
    if (this._dom.id) { uki.unregisterId(this); }
    this._dom.id = id;
    uki.registerId(this);
    return this;
};

/**
* Accessor for dom().className
* @param {string=} className
*
* @returns {string|uki.view.Base} className or self
*/
fun.delegateProp(proto, 'className', 'dom');

proto.addClass = function(className) {
    dom.addClass(this.dom(), className);
    return this;
};

proto.hasClass = function(className) {
    return dom.hasClass(this.dom(), className);
};

proto.removeClass = function(className) {
    dom.removeClass(this.dom(), className);
    return this;
};

proto.toggleClass = function(className, condition) {
    dom.toggleClass(this.dom(), className, condition);
    return this;
};




proto.domForEvent = function(type) {
    return this.dom();
};

/**
 * @param {String} name Event name, or space separated names
 * @param {function()} callback
 */
proto.addListener = function(names, callback) {
    var wrapper = fun.bindOnce(callback, this);
    utils.forEach(names.split(' '), function(name) {
        evt.addListener(this.domForEvent(name), name, wrapper);
    }, this);
    return this;
};

/**
 * @param {String} name Event name, or space separated names,
 *                      or null to remove from all types
 * @param {function()} callback or null to remove all callbacks
 */
proto.removeListener = function(names, callback) {
    var wrapper = fun.bindOnce(callback, this);
    utils.forEach(names.split(' '), function(name) {
        evt.removeListener(this.domForEvent(name), name, wrapper);
    }, this);
    return this;
};

proto.trigger = function(e) {
    var node = this.domForEvent(e.type);
    var wrapped = evt.createEvent(e, { target: node });
    return evt.trigger.call(node, e);
};

proto.on = proto.addListener;
proto.emit = proto.trigger;


/**
* Shortcut to set absolute positioning props
* @param {string|object} p Position string in the form of
*                          'l:10px t:10px r:30% h:200px'
*/
proto.pos = function(pos) {
    if (pos === undefined) {
        return this._styleToPos(this.dom().style);
    }
    pos = this._expandPos(pos);
    this._applyPosToStyle(pos, this.dom().style);
    return this;
};

var rules = [
    'top', 'right', 'left', 'bottom', 'width', 'height',
    'marginLeft', 'marginTop', 'marginBottom', 'marginRight'
],
ruleMap = {
    t: 'top', r: 'right',
    l: 'left', b: 'bottom',
    w: 'width', h: 'height',
    ml: 'marginLeft', mr: 'marginRight',
    mt: 'marginTop', mb: 'marginBottom'
};

proto._styleToPos = function(style) {
    var res = {};
    utils.forEach(rules, function(rule) {
        if (style[rule]) {
            res[rule] = style[rule];
        }
    });
    return res;
};

proto._expandPos = function(pos) {
    if (typeof pos === 'string') {
        var p = pos;
        pos = {};
        utils.forEach(p.split(/\s+/), function(rule) {
            var parts = rule.split(':');
            pos[parts[0]] = parts[1];
        });
    }
    utils.forEach(ruleMap, function(longRule, shortRule) {
        if (pos[shortRule]) pos[longRule] = pos[shortRule];
    });
    return pos;
};

proto._applyPosToStyle = function(pos, style) {
    style.position = 'absolute';
    utils.forEach(rules, function(rule) {
        style[rule] = pos[rule] || '';
    });
};

/**
* Accessor for view visibility.
*
* @param {boolean=} state
* @returns {boolean|uki.view.Base} current visibility state of self
*/
proto.visible = function(state) {
    if (state === undefined) {
        return this._dom.style.display != 'none';
    }

    var origState = this.visible();
    this._dom.style.display = state ? '' : 'none';

    // if we change from invis to vis, and we have dom, and we're attached
    // redraw
    if (state && !origState && this.dom() && this.dom().offsetWidth) {
        this.resized();
    }
    return this;
};

/* ----------------------------- Container api ------------------------------*/

/**
* Accessor attribute for parent view. When parent is set view appends its #dom
* to parents #dom
*
* @param {?view.Base=} parent
* @returns {view.Base} parent or self
*/
proto.parent = function(parent) {
    if (parent === undefined) {
        return this._parent;
    }

    this._parent = parent;
    return this;
};

/**
* Reader for previous view
* @returns {view.Base}
*/
proto.prevView = function() {
    if (!this.parent()) { return null; }
    return this.parent().childViews()[this._viewIndex - 1] || null;
};

/**
* Reader for next view
* @returns {view.Base}
*/
proto.nextView = function() {
    if (!this.parent()) { return null; }
    return this.parent().childViews()[this._viewIndex + 1] || null;
};

fun.delegateProp(proto, ['scrollTop', 'scrollLeft', 'title', 'alt'], 'dom');

proto.scroll = function(dx, dy) {
    dx && this.scrollLeft(this.scrollLeft() + dx);
    dy && this.scrollTop(this.scrollTop() + dy);
};

/* ----------------------------- Layout ------------------------------*/

/**
*/
proto.clientRect = function(ignoreScroll) {
    return dom.clientRect(this.dom(), ignoreScroll);
};


proto.childViews = function() {
    return [];
};
