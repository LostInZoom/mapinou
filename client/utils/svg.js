import { addClass, makeDiv, removeClass, waitPromise } from "./dom";
import { remToPx } from "./parse";

class LevelEdges {
    constructor(options) {
        this.options = options;
        this.parent = options.parent;
        this.namespace = 'http://www.w3.org/2000/svg';
        this.animation = options.animation;

        this.container = makeDiv(null, 'levels-svg');
        this.svg = document.createElementNS(this.namespace, 'svg');

        this.parent.append(this.container);
        this.container.append(this.svg);

        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');

        this.lines = [];
    }

    setAnimation(animation) {
        this.animation = animation;
    }

    addLine(x1, y1, x2, y2, start, end) {
        let line = document.createElementNS(this.namespace, 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('start', start);
        line.setAttribute('end', end);
        this.svg.append(line);
        let length = line.getTotalLength();
        line.setAttribute('stroke-dasharray', length);
        line.setAttribute('stroke-dashoffset', length);
        line.setAttribute('stroke-linecap', 'round');
        this.lines.push(line);
        if (this.animation) { addClass(line, 'reveal'); }
        else { addClass(line, 'appear'); }
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.setAttribute('height', `${this.height}`);
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    }

    moveLineStart(i, x, y) {
        if (this.lines[i]) {
            this.lines[i].setAttribute('x1', x);
            this.lines[i].setAttribute('y1', y);
        }
    }

    moveLineEnd(i, x, y) {
        if (this.lines[i]) {
            this.lines[i].setAttribute('x2', x);
            this.lines[i].setAttribute('y2', y);
        }
    }

    get() {
        return this.svg;
    }

    getLines() {
        return this.lines;
    }

    getLinesNumber() {
        return this.lines.length;
    }

    thinOutLines() {
        this.lines.forEach((line) => {
            addClass(line, 'thinout');
        });
    }
}

class TutorialMask {
    constructor(options) {
        this.parent = options.parent;

        this.container = makeDiv(null, 'tutorial-mask');
        this.parent.append(this.container);

        this.svgns = "http://www.w3.org/2000/svg";
        this.svg = document.createElementNS(this.svgns, 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', '0 0 ' + this.getWidth() + ' ' + this.getHeight());
        this.svg.setAttribute('preserveAspectRatio', 'none');
        this.defs = document.createElementNS(this.svgns, 'defs');
        this.mask = document.createElementNS(this.svgns, 'mask');
        this.mask.setAttribute('id', 'hole');
        this.mask.setAttribute('maskUnits', 'userSpaceOnUse');

        this.rectanglemask = document.createElementNS(this.svgns, 'rect');
        this.rectanglemask.setAttribute('x', 0);
        this.rectanglemask.setAttribute('y', 0);
        this.rectanglemask.setAttribute('width', this.getWidth());
        this.rectanglemask.setAttribute('height', this.getHeight());
        this.rectanglemask.setAttribute('fill', 'white');

        this.ellipse = document.createElementNS(this.svgns, 'ellipse');
        this.ellipse.setAttribute('cx', -9999);
        this.ellipse.setAttribute('cy', -9999);
        this.ellipse.setAttribute('rx', 0);
        this.ellipse.setAttribute('ry', 0);
        this.ellipse.setAttribute('fill', 'black');

        this.rect = document.createElementNS(this.svgns, 'rect');
        this.rect.setAttribute('x', 0);
        this.rect.setAttribute('y', 0);
        this.rect.setAttribute('width', '100%');
        this.rect.setAttribute('height', '100%');
        this.rect.setAttribute('class', 'rectangle');
        this.rect.setAttribute('mask', 'url(#hole)');

        this.mask.append(this.rectanglemask, this.ellipse);
        this.defs.append(this.mask);
        this.svg.append(this.defs, this.rect);
        this.container.append(this.svg);

        const resize = () => {
            this.svg.setAttribute('viewBox', '0 0 ' + this.getWidth() + ' ' + this.getHeight());
            this.rectanglemask.setAttribute('width', this.getWidth());
            this.rectanglemask.setAttribute('height', this.getHeight());
        }

        this.observer = new ResizeObserver(resize).observe(this.parent);
    }

    getWidth() {
        return this.container.offsetWidth;
    }

    getHeight() {
        return this.container.offsetHeight;
    }

    async hide() {
        addClass(this.container, 'hidden');
        await waitPromise(300);
    }

    async reveal() {
        removeClass(this.container, 'hidden');
        await waitPromise(300);
    }

    async set(options) {
        if (options.cx !== undefined) {
            this.ellipse.setAttribute('cx', options.cx);
        }
        if (options.cy !== undefined) {
            this.ellipse.setAttribute('cy', options.cy);
        }
        if (options.rx !== undefined) {
            this.ellipse.setAttribute('rx', options.rx);
        }
        if (options.ry !== undefined) {
            this.ellipse.setAttribute('ry', options.ry);
        }
        if (options.r !== undefined) {
            this.ellipse.setAttribute('rx', options.r);
            this.ellipse.setAttribute('ry', options.r);
        }
        await waitPromise(300);
    }

    async unset() {
        this.ellipse.setAttribute('rx', '0');
        this.ellipse.setAttribute('ry', '0');
        await waitPromise(300);
    }
}

export { LevelEdges, TutorialMask };