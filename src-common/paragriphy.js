exports.paragriphy = (function() {

    var paragraphStyle='text-indent: 15pt; margin: 5pt 0 0; text-align: justify';

    function toArr(o) {
        return Array.prototype.slice.call(o);
    }

    function isParaSplit(el) {
        if (!el || el.nodeType != 1) {
            return false
        }
        if (el.nodeName.toUpperCase() == "BR") {
            return true
        }
        var dsp = el.ownerDocument.defaultView.getComputedStyle(el).display;

        // hidden blocks are more common than hidden spans, so count hidden elements as blocks too
        return dsp == "block" || dsp == "none";
    }

    function isLastParaSplit(el) {
        var res = isParaSplit(el);
        while (res && (el = el.nextSibling)) {
            res = res && !isParaSplit(el)
        }
        return res
    }

    function wrap(el, back) {
        var next = back ? function(e) { return e.previousSibling } : function(e) { return e.nextSibling }
          , first = next(el)
          , last = null
          , tmp = first
          , empty = true;

        while (tmp && !isParaSplit(tmp)) {
            empty = empty && tmp.nodeType == 3 && !tmp.textContent.trim();
            last = tmp;
            tmp = next(tmp)
        }

        if (!empty) {
            var p = el.ownerDocument.createElement('P')
              , from = back ? last : first
              , to = back ? first : last
              , children = [];

            if (back) {
                el.parentNode.insertBefore(p, el)
            } else if (el.nextSibling) {
                el.parentNode.insertBefore(p, el.nextSibling)
            } else {
                el.parentNode.appendChild(p)
            }

            for (var e = from; e != to; e = e.nextSibling) {
                children.push(e)
            }
            children.push(to);
            for (var i = 0; i < children.length; i++) {
                p.appendChild(children[i])
            }

            return true
        }

        return false
    }

    function handleBlock(block, blacklist) {
        var all = toArr(block.querySelectorAll('*'))
          , pre = toArr(block.querySelectorAll('PRE, PRE *'))
          , bl = blacklist ? toArr(block.querySelectorAll(blacklist)) : [];

        all.forEach(function(e) {
            if (0 <= pre.indexOf(e) || 0 <= bl.indexOf(e)) {
                return
            }

            if (isParaSplit(e)) {
                var wrapped = wrap(e, true);
                if (isLastParaSplit(e)) {
                    wrapped = wrap(e, false) || wrapped
                }
                if (e.nodeType == 1 && e.nodeName.toUpperCase() == "BR" &&
                    (wrapped || !isParaSplit(e.nextSibling))) {
                    e.parentNode.removeChild(e)
                }
            }
        });
    }

    function replaceDashes(node, starting, ending) {
        starting = starting || starting == null;
        ending = ending || ending == null;
        if (node.children.length) {
            for (var i = 0; i < node.children.length; i++) {
                replaceDashes(
                        node.children[i],
                        starting && i == 0,
                        ending && i == node.children.length - 1)
            }
        } else {
            node.textContent = node.textContent.replace(/(\s?)(?:--|-|–)(\s?)/g,
                    function(match, l, r, offset, text) {
                        if (!l && offset == 0)
                            return starting ? "\u2014\u00A0" : match;   // "&mdash;&nbsp;"
                        if (!r && offset == text.length - match.length)
                            return ending ? "\u00A0\u2014" : match;     // "&nbsp;&mdash;"
                        return l && r ? "\u00A0\u2014 " : match;        // "&nbsp;&mdash; "
                    });
        }
    }

    return function(block, blacklist) {
        handleBlock(block, blacklist);
        toArr(block.querySelectorAll('P')).forEach(function(p) {
            var style = p.getAttribute('style');
            p.setAttribute('style', style ? style + "; " + paragraphStyle : paragraphStyle);

            replaceDashes(p);
        });
    }
})();
