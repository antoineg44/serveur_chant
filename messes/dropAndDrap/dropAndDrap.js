var eventSortable;
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

//var crossvent = require('crossvent');
var sortable = $('sortable');

eventSortable = dragula([sortable]);
if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
  eventSortable.enable = false;
}

eventSortable.on('drop', dropHandler);
eventSortable.on('drag', dragHandler);
eventSortable.on('dragend', dragendHandler);

function dropHandler (item, target, _source, _currentSibling) {
  console.log(item);
  var path = item.textContent;
  var name_target = item.id.split("line_")[1];
  var type_target = item.classList[1];
  if(type_target == "pdf")type_target = "chant";
  else type_target = "partie";
  var next_part = _currentSibling;
  var type_next = null;
  var next_path = null;
  if(_currentSibling != null)
  {
    next_part = _currentSibling.id.split("line_")[1];
    next_part = decodage_path_javascript(next_part);
    type_next = _currentSibling.classList[1];
    next_path = _currentSibling.textContent;
    if(type_next == "pdf")type_next = "chant";
    else type_next = "partie";
  }
  programme.echange(decodage_path_javascript(name_target), type_target, path, next_part, type_next, next_path);
}

/*crossvent.add(sortable, 'click', clicakHandler);

function clickHandler (e) {
  var target = e.target;
  if (target === sortable) {
    return;
  }
  target.style.backgroundColor = "#ecf1a4";
  
  //target.innerHTML += ' [click!]';

  /*setTimeout(function () {
    target.innerHTML = target.innerHTML.replace(/ \[click!\]/g, '');
  }, 500);*
}*/

function $ (id) {
  return document.getElementById(id);
}

},{"crossvent":3}],2:[function(require,module,exports){
(function (global){

var NativeCustomEvent = global.CustomEvent;

function useNative () {
  try {
    var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
    return  'cat' === p.type && 'bar' === p.detail.foo;
  } catch (e) {
  }
  return false;
}

/**
 * Cross-browser `CustomEvent` constructor.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
 *
 * @public
 */

module.exports = useNative() ? NativeCustomEvent :

// IE >= 9
'function' === typeof document.createEvent ? function CustomEvent (type, params) {
  var e = document.createEvent('CustomEvent');
  if (params) {
    e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
  } else {
    e.initCustomEvent(type, false, false, void 0);
  }
  return e;
} :

// IE <= 8
function CustomEvent (type, params) {
  var e = document.createEventObject();
  e.type = type;
  if (params) {
    e.bubbles = Boolean(params.bubbles);
    e.cancelable = Boolean(params.cancelable);
    e.detail = params.detail;
  } else {
    e.bubbles = false;
    e.cancelable = false;
    e.detail = void 0;
  }
  return e;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
(function (global){
'use strict';

var customEvent = require('custom-event');
var eventmap = require('./eventmap');
var doc = global.document;
var addEvent = addEventEasy;
var removeEvent = removeEventEasy;
var hardCache = [];

if (!global.addEventListener) {
  addEvent = addEventHard;
  removeEvent = removeEventHard;
}

module.exports = {
  add: addEvent,
  remove: removeEvent,
  fabricate: fabricateEvent
};

function addEventEasy (el, type, fn, capturing) {
  return el.addEventListener(type, fn, capturing);
}

function addEventHard (el, type, fn) {
  return el.attachEvent('on' + type, wrap(el, type, fn));
}

function removeEventEasy (el, type, fn, capturing) {
  return el.removeEventListener(type, fn, capturing);
}

function removeEventHard (el, type, fn) {
  var listener = unwrap(el, type, fn);
  if (listener) {
    return el.detachEvent('on' + type, listener);
  }
}

function fabricateEvent (el, type, model) {
  var e = eventmap.indexOf(type) === -1 ? makeCustomEvent() : makeClassicEvent();
  if (el.dispatchEvent) {
    el.dispatchEvent(e);
  } else {
    el.fireEvent('on' + type, e);
  }
  function makeClassicEvent () {
    var e;
    if (doc.createEvent) {
      e = doc.createEvent('Event');
      e.initEvent(type, true, true);
    } else if (doc.createEventObject) {
      e = doc.createEventObject();
    }
    return e;
  }
  function makeCustomEvent () {
    return new customEvent(type, { detail: model });
  }
}



}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./eventmap":4,"custom-event":2}],4:[function(require,module,exports){
(function (global){
'use strict';



}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])

var input_in_modification = false;

function initDoubleClick()
{
  document.querySelectorAll(".part-column span").forEach(function(node){
    node.ondblclick=function(){
      if(input_in_modification)return;
      var val=this.innerHTML;
      var input=document.createElement("input");
      input.value=val;
      input.addEventListener("keydown", function (e) {
        console.log("click");
        if (e.key === "Enter" && input.value.trim() !== "") {
          var new_val=this.value;
          programme.modifyPart(val, new_val);
          this.parentNode.innerHTML=new_val;
          input_in_modification = false;
        }
      });
      input.onblur=function(){
        var new_val=this.value;
        programme.modifyPart(val, new_val);
        this.parentNode.innerHTML=new_val;
        input_in_modification = false;
      }
      this.innerHTML="";
      this.appendChild(input);
      input.focus();
      input_in_modification = true;
    }
  });
}

function modify_part(name)
{
	document.querySelectorAll("#line_" + name + " .part-column span").forEach(function(node){
		if(input_in_modification)return;
		var val=node.innerHTML;
		var input=document.createElement("input");
		input.value=val;
		input.addEventListener("keydown", function (e) {
			if (e.key === "Enter" && input.value.trim() !== "") {
				var val=this.value;
        programme.modifyPart(decodage_path_javascript(name), val);
				this.parentNode.innerHTML=val;
				input_in_modification = false;
			}
		});
		input.onblur=function(){
			var val=this.value;
      programme.modifyPart(decodage_path_javascript(name), val);
			this.parentNode.innerHTML=val;
			input_in_modification = false;
		}
		node.innerHTML="";
		node.appendChild(input);
		input.focus();
		input_in_modification = true;
});
}

function delete_part(name)
{
  $("#line_" + name).remove();
  console.log("search element : " + "#line_" + name);
}

var actual_line_selected = null;

function select_line(name) {
	if(actual_line_selected != null)
	{
		if(document.getElementById("line_" + actual_line_selected).className == "line part")
			document.getElementById("line_" + actual_line_selected).style.backgroundColor = "rgba(0, 0, 0, 0.17)";
		else
			document.getElementById("line_" + actual_line_selected).style.backgroundColor = "rgba(0, 0, 0, 0.02)";
	}
	actual_line_selected = name;
	document.getElementById("line_" + name).style.backgroundColor = "#ecf1a4";
}



function start_drag_button() {
  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
	console.log("disable scroll");
    disable_scroll();
	eventSortable.enable = true;
  }
}

function dragHandler (item, target, _source, _currentSibling) {
  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
    console.log("dragHandler");
  }
}

function dragendHandler (item, target, _source, _currentSibling) {
  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
    console.log("dragendHandler");
	eventSortable.enable = false;
    enable_scroll();
  }
}





// FOR SMARTPHONE ONLY !!!

var scroll_enable = true;


// DESKTOP

// TRIGGER
function switchScroll() {
  if (scroll_enable == false){
    enable_scroll();
	scroll_enable = true;
  } else {
    disable_scroll();
	scroll_enable = false;
  }
}

// PREVENT DEFAULT HANDLER
function preventDefault(e) {
  e = e || window.event;
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.returnValue = false;
}
// PREVENT SCROLL KEYS
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
// left: 37, up: 38, right: 39, down: 40,
// (Source: http://stackoverflow.com/a/4770179)
function keydown(e) {
  var keys = [32,33,34,35,36,37,38,39,40];
  for (var i = keys.length; i--;) {
    if (e.keyCode === keys[i]) {
      preventDefault(e);
      return;
    }
  }
}
// PREVENT MOUSE WHEEL
function wheel(event) {
  event.preventDefault();
  event.stopPropagation();
  return false;
}
// DISABLE SCROLL
function disable_scroll() {
  if (document.addEventListener) {
    document.addEventListener('wheel', wheel, false);
    document.addEventListener('mousewheel', wheel, false);
    document.addEventListener('DOMMouseScroll', wheel, false);
  }
  else {
    document.attachEvent('onmousewheel', wheel);
  }
  document.onmousewheel = document.onmousewheel = wheel;
  document.onkeydown = keydown;
  
  x = window.pageXOffset || document.documentElement.scrollLeft,
  y = window.pageYOffset || document.documentElement.scrollTop,
  window.onscroll = function() {
    window.scrollTo(x, y);
  };
  // document.body.style.overflow = 'hidden'; // CSS
  disable_scroll_mobile();
}
// ENABLE SCROLL
function enable_scroll() {
  if (document.removeEventListener) {
    document.removeEventListener('wheel', wheel, false);
    document.removeEventListener('mousewheel', wheel, false);
    document.removeEventListener('DOMMouseScroll', wheel, false);
  }
  document.onmousewheel = document.onmousewheel = document.onkeydown = null;
  window.onscroll = function() {};
  // document.body.style.overflow = 'auto'; // CSS
  enable_scroll_mobile();
}

// MOBILE
function disable_scroll_mobile(){
  document.addEventListener('touchmove', preventDefault, false);
}
function enable_scroll_mobile(){
  document.removeEventListener('touchmove', preventDefault, false);
}