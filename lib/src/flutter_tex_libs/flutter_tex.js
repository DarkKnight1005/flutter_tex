"use strict";
var port = getUrlParam('port');
var urlRawTeXHTML = getUrlParam('urlRawTeXHTML');
var platformId = getUrlParam('platformId');
var configurations = JSON.parse(getUrlParam('configurations'));
var teXView;
var isWeb = true;

function initTeXView() {
    isWeb = platformId != null;
    if (!isWeb) {
        if (urlRawTeXHTML == null) {
            console.log('From Request source');
            var httpRequest = new XMLHttpRequest();
            httpRequest.onreadystatechange = function () {
                if (httpRequest.readyState === 4 && httpRequest.status === 200)
                    teXView.appendChild(createView(JSON.parse(httpRequest.responseText), teXView));
                onTeXViewRenderComplete();
            }
            httpRequest.open('GET', "http://localhost:" + port + "/?query=getRawTeXHTML");
            httpRequest.send();
        } else {
            console.log('From Url source');
            createView(JSON.parse(urlRawTeXHTML), teXView);
            onTeXViewRenderComplete();
        }
    }
}

function initWebTeXView(id, rawTeXHTML) {
    isWeb = true;
    var initiated = false;
    document.querySelectorAll("flt-platform-view").forEach(function (platformView) {
            var view = platformView.shadowRoot.children[1];
            if (view.id === 'tex_view_' + id) {
                initiated = true;
                var iframe = view.contentWindow;
                var webTeXView = iframe.document.getElementById('TeXView');
                webTeXView.appendChild(createView(rawTeXHTML, webTeXView))
                iframe.onTeXViewRenderComplete(function () {
                    renderedWebTeXViewHeight(getTeXViewHeight(webTeXView));
                });
            }
        }
    )
    if (!initiated) {
        setTimeout(function () {
            initWebTeXView(id, rawTeXHTML)
        }, 500);
        return;
    }
}

function createView(viewData) {
    var meta = viewData['meta'];
    var data = viewData['data'];
    var node = meta['node'];
    var element = document.createElement(meta['tag']);
    element.classList.add(meta['type']);
    element.setAttribute("style", viewData['style']);
    switch (node) {
        case 'leaf': {
            if (meta['tag'] === 'img') {
                if (meta['type'] === 'tex-view-asset-image') {
                    element.setAttribute('src', 'http://localhost:' + port + '/' + data);
                } else {
                    element.setAttribute('src', data);
                    element.addEventListener("load", function () {
                        RenderedTeXViewHeight.postMessage(getTeXViewHeight(teXView));
                    });
                }
            } else {
                element.innerHTML = data;
            }
        }
            break;
        case 'internal_child': {
            element.appendChild(createView(data))
            if (meta['type'] === 'tex-view-ink-well' && viewData['id'] != null) rippleManager(element, viewData);
        }
            break;
        default: {
            data.forEach(function (childViewData) {
                element.appendChild(createView(childViewData))
            });
        }
    }
    return element;
}


function rippleManager(element, viewData) {
    var id = viewData['id'];
    element.addEventListener('click', function (e) {
        TeXViewChildTapCallback.postMessage(id);
        var ripple = document.createElement('div');
        this.appendChild(ripple);
        var d = Math.max(this.clientWidth, this.clientHeight);
        ripple.style.width = ripple.style.height = d + 'px';
        var rect = this.getBoundingClientRect();
        ripple.style.left = e.clientX - rect.left - d / 2 + 'px';
        ripple.style.top = e.clientY - rect.top - d / 2 + 'px';
        ripple.classList.add('ripple');
    });
}

function getUrlParam(key) {
    var url = decodeURI(location.href);
    key = key.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + key + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function getTeXViewHeight(element) {
    var height = element.offsetHeight,
        style = window.getComputedStyle(element)
    return ['top', 'bottom']
        .map(function (side) {
            return parseInt(style["margin-" + side]);
        })
        .reduce(function (total, side) {
            return total + side;
        }, height)
}