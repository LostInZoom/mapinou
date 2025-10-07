import { makeDiv } from "./dom.js"

/**
 * Retrieve the CSS color variables.
 * @param  {String} themes The themes to retrieve the colors from.
 * @return {Object}        Css colors.
 */
function getColorsByClassNames(...className) {
    let colors = {};
    for (let i = 0; i < className.length; i++) {
        let c = className[i];
        let div = makeDiv(null, c);
        document.body.append(div);
        let style = window.getComputedStyle(div);
        colors[c] = style.backgroundColor
        div.remove();
    }
    return colors;
}

function capitalizeFirstLetter(t) {
    return String(t).charAt(0).toUpperCase() + String(t).slice(1);
}

function remToPx(rem) {
    return rem * parseInt(window.getComputedStyle(document.body.parentNode).getPropertyValue('font-size'));
}

function pxToRem(px) {
    return px / parseInt(window.getComputedStyle(document.body.parentNode).getPropertyValue('font-size'))
}

function calculateTextSize(text, style) {
    let dummy = document.createElement('div');
    dummy.style.fontFamily = style.fontFamily;
    dummy.style.fontSize = style.fontSize;
    dummy.style.fontWeight = style.fontWeight;
    dummy.style.fontStyle = style.fontStyle;
    dummy.style.height = 'auto';
    dummy.style.width = 'auto';
    dummy.style.position = 'absolute';
    dummy.style.whiteSpace = 'nowrap';
    dummy.innerHTML = text;
    document.body.appendChild(dummy);
    let width = dummy.clientWidth;
    let height = dummy.clientHeight;
    dummy.remove();
    return {
        width: pxToRem(width),
        height: pxToRem(height)
    }
}


export { getColorsByClassNames, remToPx, pxToRem, calculateTextSize, capitalizeFirstLetter };