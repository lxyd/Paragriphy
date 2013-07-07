/* ***** BEGIN LICENSE BLOCK *****
 * Version: MIT/X11 License
 * 
 * Copyright (c) 2010 Erik Vold
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Contributor(s):
 *   Erik Vold <erikvvold@gmail.com> (Original Author)
 *   Greg Parris <greg.parris@gmail.com>
 *   Nils Maier <maierman@web.de>
 *   Szabolcs Hubai <szab.hu@gmail.com>
 *
 * ***** END LICENSE BLOCK ***** */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const keyID = "Paragriphy:Paragriphy";
const toolsMenuitemID = "menu_ToolsParagriphyItem";
var XUL_APP = {name: Services.appinfo.name};

switch(Services.appinfo.name) {
case "Thunderbird":
  XUL_APP.winType = "mail:3pane";
  XUL_APP.baseKeyset = "mailKeys";
  break;
case "Fennec": break;
default: //"Firefox", "SeaMonkey"
  XUL_APP.winType = "navigator:browser";
  XUL_APP.baseKeyset = "mainKeyset";
}

const PREF_BRANCH = "extensions.paragriphy.";
const PREFS = {
  locale: Cc["@mozilla.org/chrome/chrome-registry;1"]
      .getService(Ci.nsIXULChromeRegistry).getSelectedLocale("global"),
  "disable_fastload": false,
  toolbar: "",
  "toolbar.before": "",
};

var prefChgHandlers = [];
let PREF_OBSERVER = {
  observe: function(aSubject, aTopic, aData) {
    if ("nsPref:changed" != aTopic || !(aData in PREFS)) return;
    prefChgHandlers.forEach(function(func) func && func(aData));
  }
}

let logo = "";


/* Includes a javascript file with loadSubScript
*
* @param src (String)
* The url of a javascript file to include.
*/
(function(global) global.include = function include(src) {
  var o = {};
  Components.utils.import("resource://gre/modules/Services.jsm", o);
  var uri = o.Services.io.newURI(
      src, null, o.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null));
  o.Services.scriptloader.loadSubScript(uri.spec, global);
})(this);

/* Imports a commonjs style javascript file with loadSubScrpt
 * 
 * @param src (String)
 * The url of a javascript file.
 */
(function(global) {
  var modules = {};
  global.require = function require(src) {
    if (modules[src]) return modules[src];
    var scope = {require: global.require, exports: {}};
    var tools = {};
    Components.utils.import("resource://gre/modules/Services.jsm", tools);
    var baseURI = tools.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null);
    try {
      var uri = tools.Services.io.newURI(
          "packages/" + src + ".js", null, baseURI);
      tools.Services.scriptloader.loadSubScript(uri.spec, scope);
    } catch (e) {
      var uri = tools.Services.io.newURI(src, null, baseURI);
      tools.Services.scriptloader.loadSubScript(uri.spec, scope);
    }
    return modules[src] = scope.exports;
  }
})(this);


var {unload} = require("unload");
var {runOnLoad, runOnWindows, watchWindows} = require("window-utils");
var {paragriphy: paragriphyBlock} = require("paragriphy");
var {pointNode} = require("pointnode");
include("includes/l10n.js");
include("includes/prefs.js");


function setPref(aKey, aVal) {
  aVal = ("wrapper-paragriphy-toolbarbutton" == aVal) ? "" : aVal;
  switch (typeof(aVal)) {
    case "string":
      var ss = Cc["@mozilla.org/supports-string;1"]
          .createInstance(Ci.nsISupportsString);
      ss.data = aVal;
      Services.prefs.getBranch(PREF_BRANCH)
          .setComplexValue(aKey, Ci.nsISupportsString, ss);
      break;
  }
}

function addMenuItem(win) {
  var $ = function(id) win.document.getElementById(id);

  function removeMI() {
    var menuitem = $(toolsMenuitemID);
    menuitem && menuitem.parentNode.removeChild(menuitem);
  }
  removeMI();

  // add the new menuitem to Tools menu
  let (paragriphyMI = win.document.createElementNS(NS_XUL, "menuitem")) {
    paragriphyMI.setAttribute("id", toolsMenuitemID);
    paragriphyMI.setAttribute("class", "menuitem-iconic");
    paragriphyMI.setAttribute("label", _("paragriphy", getPref("locale")));
    paragriphyMI.setAttribute("accesskey", "P");
    paragriphyMI.setAttribute("key", keyID);
    paragriphyMI.style.listStyleImage = "url('" + logo + "')";
    paragriphyMI.addEventListener("command", paragriphy, true);

    $("menu_ToolsPopup").appendChild(paragriphyMI);
  }

  unload(removeMI, win);
}

function paragriphy(ev) {
  pointNode(ev.view.content.document, function(block) {
    paragriphyBlock(block);
  });

  return true;
}

function main(win) {
  let doc = win.document;
  function $(id) doc.getElementById(id);
  function xul(type) doc.createElementNS(NS_XUL, type);

  // add menu bar item to File menu
  addMenuItem(win);

  // add toolbar button
  let paragriphyTBB = xul("toolbarbutton");
  paragriphyTBB.setAttribute("id", "paragriphy-toolbarbutton");
  paragriphyTBB.setAttribute("type", "button");
  paragriphyTBB.setAttribute("image", addon.getResourceURI("icon16.png").spec);
  paragriphyTBB.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
  paragriphyTBB.setAttribute("label", _("paragriphy", getPref("locale")));
  paragriphyTBB.addEventListener("command", paragriphy, true);
  let tbID = getPref("toolbar");
  ($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(paragriphyTBB);
  if (tbID) {
    var tb = $(tbID);
    if (tb) {
      let b4ID = getPref("toolbar.before");
      let b4 = $(b4ID);
      if (!b4) { // fallback for issue 34
        let currentset = tb.getAttribute("currentset").split(",");
        let i = currentset.indexOf("paragriphy-toolbarbutton") + 1;
        if (i > 0) {
          let len = currentset.length;
          for (; i < len; i++) {
            b4 = $(currentset[i]);
            if (b4) break;
          }
        }
      }
      tb.insertItem("paragriphy-toolbarbutton", b4, null, false);
    }
  }

  function saveTBNodeInfo(aEvt) {
    setPref("toolbar", paragriphyTBB.parentNode.getAttribute("id") || "");
    setPref("toolbar.before", (paragriphyTBB.nextSibling || "")
        && paragriphyTBB.nextSibling.getAttribute("id").replace(/^wrapper-/i, ""));
  }
  win.addEventListener("aftercustomization", saveTBNodeInfo, false);

  var prefChgHandlerIndex = prefChgHandlers.push(function(aData) {
    switch (aData) {
      case "locale":
        let label = _("paragriphy", getPref("locale"));
        $(keyID).setAttribute("label", label);
        paragriphyTBB.setAttribute("label", label);
        break;
      case "key":
      case "modifiers":
        $(keyID).setAttribute(aData, getPref(aData));
        break;
    }
    addMenuItem(win);
  }) - 1;

  unload(function() {
    paragriphyTBB.parentNode.removeChild(paragriphyTBB);
    win.removeEventListener("aftercustomization", saveTBNodeInfo);
    prefChgHandlers[prefChgHandlerIndex] = null;
  }, win);
}

var addon = {
  getResourceURI: function(filePath) ({
    spec: __SCRIPT_URI_SPEC__ + "/../" + filePath
  })
}

function disable(id) {
  Cu.import("resource://gre/modules/AddonManager.jsm");
  AddonManager.getAddonByID(id, function(addon) {
    addon.userDisabled = true;
  });
}

function install(data) {
  if ("Fennec" == XUL_APP.name) disable(data.id);
}
function uninstall(){}
function startup(data, reason) {
  if ("Fennec" == XUL_APP.name) {
    if (ADDON_ENABLE == reason) paragriphy();
    disable(data.id);
  }

  var prefs = Services.prefs.getBranch(PREF_BRANCH);

  // setup l10n
  l10n(addon, "paragriphy.properties");
  unload(l10n.unload);

  // setup prefs
  setDefaultPrefs();

  logo = addon.getResourceURI("images/paragriphy_16.png").spec;
  watchWindows(main, XUL_APP.winType);
  prefs = prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
  prefs.addObserver("", PREF_OBSERVER, false);
  unload(function() prefs.removeObserver("", PREF_OBSERVER));
};
function shutdown(data, reason) unload()
