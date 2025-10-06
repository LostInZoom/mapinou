import { ajaxGet } from './ajax.js';
import { remap } from './math.js';

/**
 * Create a div with custom properties. Append the div to the parent if provided.
 * @param  {String} id         ID of the element.
 * @param  {String} c          Class of the element.
 * @param  {String} html       Content of the element.
 * @param  {DOMElement} parent Parent element to append the div to.
 * @return {DOMElement}        Created element.
 */
function makeDiv(id = null, c = null, html = null, parent = null) {
    let div = document.createElement('div');
    if (id !== null) { div.setAttribute('id', id); }
    if (c !== null) { div.setAttribute('class', c); }
    if (html !== null) { div.innerHTML = html; }
    if (parent !== null) { parent.appendChild(div); }
    return div;
}

/**
 * Check if the given element has the class.
 * @param  {DOMElement} e Element to check.
 * @param  {String} c     Class to check.
 */
function hasClass(e, c) {
    if (e.classList)
        return e.classList.contains(c)
    else
        return !!e.c.match(new RegExp('(\\s|^)' + c + '(\\s|$)'))
};

/**
 * Remove the given class from a given element.
 * @param  {DOMElement} e Element to remove the class from.
 * @param  {String} c     Class to remove.
 */
function removeClass(e, c) {
    if (e.classList)
        e.classList.remove(c)
    else if (hasClass(e, c)) {
        var reg = new RegExp('(\\s|^)' + c + '(\\s|$)')
        e.c = el.c.replace(reg, ' ')
    }
};

/**
 * Remove the given class from a list of given elements.
 * @param  {Array} e   Elements to remove the class from.
 * @param  {String} c  Class to remove.
 */
function removeClassList(e, c) {
    for (let i = 0; i < e.length; ++i) { removeClass(e[i], c) }
};

/**
 * Add the given class to a given element.
 * @param  {DOMElement} e Element to add the class to.
 * @param  {String} c     Class to add.
 */
function addClass(e, c) {
    if (e.classList)
        e.classList.add(c)
    else if (!hasClass(e, c)) e.c += " " + c
};

/**
 * Add the given class to a list of given elements.
 * @param  {Array} e   Elements to add the class to.
 * @param  {String} c  Class to add.
 */
function addClassList(e, c) {
    for (let i = 0; i < e.length; ++i) { addClass(e[i], c) }
};

/**
 * Activate the element.
 * @param  {DOMElement} e   Element to activate.
 */
function activate(e) { addClass(e, 'active'); }

/**
 * Deactivate the element.
 * @param  {DOMElement} e   Element to deactivate.
 */
function deactivate(e) { removeClass(e, 'active'); }

/**
 * Adds an svg as the inner HTML of the target div.
 * @param  {DOMElement} target Target to place the svg.
 * @param  {String}            SVG file url.
 */
function addSVG(target, url) {
    ajaxGet(url, (svg) => { target.innerHTML = svg; });
}

/**
 * Retrieve the SCSS color variables.
 * @param  {String} themes The themes to retrieve the colors from.
 * @return {Object}        Css colors.
 */
function getCSSColors(...themes) {
    let colors = {};
    for (let i = 0; i < themes.length; i++) {
        let theme = themes[i];
        let colorDiv = makeDiv(theme + '-theme', null, 'css-theme');
        document.body.append(colorDiv);
        let bodyBeforeContent = window.getComputedStyle(colorDiv, ':before').content || '';
        colors[themes[i]] = JSON.parse(JSON.parse(bodyBeforeContent.replace(/,\}/, '}')));
        colorDiv.remove();
    }
    return colors;
}

/**
 * Remove element from the DOM.
 * @param {DOMElement} args The DOM Elements to remove.
 */
function remove(...args) {
    for (let i = 0; i < args.length; i++) {
        args[i].remove();
    }
}

/**
 * Remove all elements inside the DOM element.
 * @param {DOMElement} element The DOM Elements to clear.
 */
function clearElement(element) {
    while (element.firstChild) {
        element.firstChild.remove();
    }
}

/**
 * Wrapper around setTimeout for better readability
 * @param {duration} number   The duration to wait.
 * @param {function} callback The function to execute after waiting.
 */
function wait(duration, callback) {
    setTimeout(callback, duration);
};

function waitPromise(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
}

/**
 * Returns true or false whether the provided element overflows
 * @param {DOMElement} element - DOM Element to check
 * @returns {boolean} - Whetther the element overflows
 */
function isOverflown(element) {
    return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
}

function setStorage(name, value) {
    localStorage.setItem(name, value);
}

function getStorage(name) {
    return localStorage.getItem(name);
}

function easingIncrement(options, callback) {
    let element = options.element;
    let maximum = options.maximum;
    let duration = options.duration;
    let easing = options.easing;
    let value = 0;
    element.innerHTML = value;
    for (let i = 0; i <= maximum; ++i) {
        let r = remap(i, 0, maximum);
        let eased = 1 - easing(r);
        let delay = remap(eased, 0, 1, 0, duration);
        wait(delay, () => { element.innerHTML = value++; });
    }
    wait(duration, callback);
}

function createValidation(parent, text, options, callback) {
    callback = callback || function () { };

    let container = makeDiv(null, 'app-validation-container');
    let mask = makeDiv(null, 'app-validation-mask');
    let window = makeDiv(null, 'app-validation-window');
    let textdiv = makeDiv(null, 'app-validation-text', text);
    let buttons = makeDiv(null, 'app-validation-buttons');

    const finish = (e) => {
        const value = parseInt(e.target.getAttribute('value'));
        barray.forEach(o => { o.removeEventListener('click', finish); })
        removeClass(window, 'pop');
        wait(300, () => {
            container.remove();
            mask.remove();
            callback(value);
        });
    }

    let barray = [];
    options.forEach((o, i) => {
        let button = makeDiv(null, 'app-validation-button', o);
        button.setAttribute('value', i);
        button.addEventListener('click', finish);
        buttons.append(button);
        barray.push(button);
    });

    window.append(textdiv, buttons);
    container.append(window);
    parent.append(container, mask);
    container.offsetHeight;
    addClass(window, 'pop');
}

export {
    makeDiv, hasClass, addClass, removeClass, addClassList, removeClassList,
    activate, deactivate,
    clearElement, addSVG, getCSSColors, remove, wait, waitPromise, isOverflown,
    easingIncrement, createValidation, setStorage, getStorage
}