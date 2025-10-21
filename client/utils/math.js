/**
 * Generate a random integer in a given range.
 * @param  {int} min - Min int.
 * @param  {int} max - Max int.
 * @return {int} - Random int.
 */
function generateRandomInteger(min, max) {
    if (min == max) { return min; }
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(items, weights) {
    var i;
    for (i = 1; i < weights.length; i++) {
        weights[i] += weights[i - 1];
    }
    var random = Math.random() * weights[weights.length - 1];
    for (i = 0; i < weights.length; i++) {
        if (weights[i] > random)
            break;
    }
    return items[i];
}

function easeOutSine(x) {
    return Math.sin((x * Math.PI) / 2);
}

function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

function easeOutQuint(x) {
    return 1 - Math.pow(1 - x, 5);
}

function easeOutCirc(x) {
    return Math.sqrt(1 - Math.pow(x - 1, 2));
}

function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

function easeInSine(x) {
    return 1 - Math.cos((x * Math.PI) / 2);
}

function easeInCubic(x) {
    return x * x * x;
}

function easeInQuint(x) {
    return x * x * x * x * x;
}

function easeInOutSine(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeInOutQuint(x) {
    return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

function remap(value, xmin, xmax, dmin = 0, dmax = 1) {
    return dmin + ((value - xmin) / (xmax - xmin)) * (dmax - dmin);
}

function removeOutliersIQR(values) {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length < 2) return sorted;
    const q1 = sorted[Math.floor((sorted.length / 4))];
    const q3 = sorted[Math.ceil((sorted.length * 3) / 4)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const filtered = sorted.filter(v => v >= lower && v <= upper);
    return filtered.length >= 2 ? filtered : sorted;
}

export {
    generateRandomInteger, weightedRandom,
    easeInSine, easeInCubic, easeInQuint,
    easeOutSine, easeOutCubic, easeOutQuint, easeOutCirc, easeOutExpo,
    easeInOutSine, easeInOutCubic, easeInOutQuint,
    remap, removeOutliersIQR
};