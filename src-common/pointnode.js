exports.pointNode = (function() {
    var style = "background: #FF0;";
    var appendedStyle = "; " + style;

    function addStyle(e) {
        var s = e.getAttribute('style');
        if (s == null) {
             e.setAttribute('style', style);
        } else {
             e.setAttribute('style', s + appendedStyle);
        }
    }
    function removeStyle(e) {
        var s = e.getAttribute('style');
        if (s == style) {
            e.removeAttribute('style');
        } else if (s && s.length > appendedStyle.length && s.substring(s.length - appendedStyle.length) == appendedStyle) {
            e.setAttribute('style', s.substring(0, s.length - appendedStyle.length));
        }
    }

    return function(doc, callback) {
        var e = null;

        function unreg() {
            doc.removeEventListener('mouseover', onMouseOver, true);
            doc.removeEventListener('mouseout', onMouseOut, true);
            doc.removeEventListener('keypress', onKeyPress, true);
            doc.removeEventListener('click', onClick, true);
        }

        function onMouseOver(ev) {
            e = ev.originalTarget;
            addStyle(e);
        }

        function onMouseOut(ev) {
            removeStyle(e);
            e = null;
        }

        function onClick(ev) {
            unreg();
            removeStyle(e);
            callback(e);
            e = null;
        }

        function onKeyPress(ev) {
            unreg();
            removeStyle(e);
            e = null;
        }

        doc.addEventListener('mouseover', onMouseOver, true);
        doc.addEventListener('mouseout', onMouseOut, true);
        doc.addEventListener('keypress', onKeyPress, true);
        doc.addEventListener('click', onClick, true);
    }
})();
