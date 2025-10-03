/**
 * @ajax
 * Ajax related functions.
 */

function xhr(type, url, data, options) {
    options = options || {};

    var request = new XMLHttpRequest();
    request.open(type, url, true);

    if (type === "POST") {
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(data));
    } else {
        request.send();
    }

    request.onreadystatechange = function () {
        if (this.readyState === 4) {
            if (this.status >= 200 && this.status < 400) {
                options.success && options.success(parse(this.responseText));
            } else {
                options.error && options.error(this.status);
            }
        }
    };
}

function ajax(method, url, data, callback) {
    return xhr(method, url, data, { success: callback });
}

function ajaxGet(url, success, error) {
    success = success || (() => { });
    error = error || (() => { });
    return xhr("GET", url, undefined, { success: success, error: error });
}

function ajaxPost(url, data, success, error) {
    success = success || (() => { });
    error = error || (() => { });
    return xhr("POST", url, data, { success: success, error: error });
}

function parse(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
}

export { ajaxGet, ajaxPost }
export default ajax