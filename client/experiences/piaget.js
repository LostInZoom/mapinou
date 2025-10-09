import Levels from "../pages/levels";
import Page from "../pages/page";
import { ajaxPost } from "../utils/ajax";
import { addClass, addClassList, clearElement, makeDiv, removeClass, removeClassList, wait } from "../utils/dom";
import { easeInOutSine, generateRandomInteger } from "../utils/math";

class Piaget extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.elements = this.options.elements;
        this.stage = this.options.stage;
        this.answers = {};
        this.answers = [];
        this.testnumber = 5;

        this.content = makeDiv(null, 'page-content pop');
        this.container.append(this.content);

        if (this.stage === 'presentation') {
            let centers = this.app.options.interface.map.start.centers;
            let i = generateRandomInteger(0, centers.length - 1);
            this.basemap.fly({
                easing: easeInOutSine,
                center: centers[i],
                zoom: this.app.options.interface.map.start.zoom
            }, () => {
                this.createPresentation();
            });
        }
        else {
            this.topcontent = makeDiv(null, 'experience-content top pop');
            this.back = makeDiv(null, 'page-button page-button-back', 'Retour');
            this.toptext = makeDiv(null, 'experience-text top nobutton pop');
            this.topcontent.append(this.back, this.toptext);
            this.content.append(this.topcontent);

            let toplabel = makeDiv(null, 'piaget-tutorial', this.elements.top);
            this.topbottle = makeDiv(null, 'piaget-bottle reference', this.app.options.svgs.piaget);
            this.toptext.append(toplabel, this.topbottle);

            this.bottomcontent = makeDiv(null, 'experience-content bottom pop');
            this.content.append(this.bottomcontent);

            this.start = Date.now();
            this.createBottomPanel(1);

            wait(this.app.options.interface.transition.page, () => {
                addClass(this.bottomtext, 'pop');
            });
        }
    }

    createPresentation() {
        let back = makeDiv(null, 'page-button page-button-back', 'Retour');
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        let text = makeDiv(null, 'experience-text nobutton');
        this.content.append(back, text, pursue);
        this.content.offsetWidth;

        let presentation = makeDiv(null, 'experience-presentation');
        let title = makeDiv(null, 'experience-presentation-paragraph experience-presentation-title', this.elements.title);
        presentation.append(title);
        this.elements.presentation.forEach(t => {
            presentation.append(makeDiv(null, 'experience-presentation-paragraph', t));
        });
        text.append(presentation);

        addClass(text, 'pop');
        wait(300, () => {
            removeClass(text, 'nobutton');
            addClass(back, 'pop');
            addClass(pursue, 'pop');
            this.listen = true;

            back.addEventListener('click', () => {
                this.listen = false;
                if (this.topcontent) { removeClass(this.topcontent, 'pop'); }
                if (this.bottomcontent) { removeClass(this.bottomcontent, 'pop'); }
                else { removeClass(this.content, 'pop'); }
                wait(500, () => {
                    this.destroy();
                    this.basemap.fit(this.params.interface.map.levels, {
                        easing: easeInOutSine
                    }, () => {
                        this.app.page = new Levels({ app: this.app, position: 'current', update: false });
                    });
                });
            }, { once: true });

            pursue.addEventListener('click', () => {
                this.listen = false;
                let o = this.options;
                o.stage = 'tutorial';
                o.position = 'next';
                this.next = new Piaget(o);
                this.slideNext();
            }, { once: true });
        });
    }

    createBottomPanel(index) {
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');
        this.bottomtext = makeDiv(null, 'experience-text bottom nobutton');
        if (index > 1) { addClass(this.bottomtext, 'pop'); }

        this.bottomcontent.append(this.bottomtext, pursue);
        let bottomlabel = makeDiv(null, 'piaget-tutorial', this.elements.bottom);
        let bottombottle = makeDiv(null, 'piaget-bottle draw', this.app.options.svgs['piaget' + index]);
        let title = makeDiv(null, 'piaget-title', `${index}/${this.testnumber}`);
        this.bottomtext.append(title, bottomlabel, bottombottle);

        let namespace = 'http://www.w3.org/2000/svg';
        let svgcontainer = makeDiv(null, 'piaget-svg-container');
        let svg = document.createElementNS(namespace, 'svg');
        svgcontainer.append(svg);
        bottombottle.append(svgcontainer);

        const questionstart = Date.now();

        if (index > 1) {
            addClass(this.bottomcontent, 'pop');
        }

        const vb = bottombottle.querySelector('svg').viewBox.baseVal;
        svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
        svg.setAttribute('width', '800');
        svg.setAttribute('height', '800');

        let lines = [];
        let start = [];
        let end = [];

        const destroyElements = () => {
            if (lines.length > 0) {
                let oldline = lines.pop();
                addClass(oldline, 'hide');
                wait(200, () => { oldline.remove(); })
            }
            if (start.length > 0) {
                let oldstart = start.pop();
                addClass(oldstart, 'hide');
                wait(200, () => { oldstart.remove(); })
            }
            if (end.length > 0) {
                let oldend = end.pop();
                addClass(oldend, 'hide');
                wait(200, () => { oldend.remove(); })
            }
            lines = [];
            start = [];
            end = [];
        }

        const createElements = (x, y) => {
            let l = document.createElementNS(namespace, 'line');
            l.setAttribute('x1', x);
            l.setAttribute('y1', y);
            l.setAttribute('x2', x);
            l.setAttribute('y2', y);
            lines.push(l);
            let p1 = document.createElementNS(namespace, 'circle');
            p1.setAttribute('cx', x);
            p1.setAttribute('cy', y);
            start.push(p1);
            let p2 = document.createElementNS(namespace, 'circle');
            p2.setAttribute('cx', x);
            p2.setAttribute('cy', y);
            end.push(p2);
            addClassList([p1, p2, l], 'hide');
            svg.append(l, p1, p2);
            svgcontainer.offsetHeight;
            removeClassList([p1, p2, l], 'hide');
        }

        const down = (e) => {
            e.preventDefault();
            destroyElements();
            bottombottle.removeEventListener('touchstart', down);
            bottombottle.removeEventListener('mousedown', down);
            const [x, y] = this.getRelativeCoordinates(bottombottle, e);
            createElements(x, y);
            bottombottle.addEventListener('touchmove', move);
            bottombottle.addEventListener('mousemove', move);
            bottombottle.addEventListener('touchend', up);
            bottombottle.addEventListener('mouseup', up);
        }

        const move = (e) => {
            e.preventDefault();
            const [x, y] = this.getRelativeCoordinates(bottombottle, e);
            lines[0].setAttribute('x2', x);
            lines[0].setAttribute('y2', y);
            end[0].setAttribute('cx', x);
            end[0].setAttribute('cy', y);
        }

        const up = (e) => {
            e.preventDefault();
            bottombottle.removeEventListener('touchmove', move);
            bottombottle.removeEventListener('mousemove', move);
            bottombottle.removeEventListener('touchend', up);
            bottombottle.removeEventListener('mouseup', up);
            // Remove the lines and points if the length is lower than 10% of the svg width
            const length = Math.hypot(lines[0].x2.baseVal.value - lines[0].x1.baseVal.value, lines[0].y2.baseVal.value - lines[0].y1.baseVal.value);
            if (length < 10 * vb.width / 100) {
                destroyElements();
                removeClass(pursue, 'pop');
                addClass(this.bottomtext, 'nobutton');
            } else {
                addClass(pursue, 'pop');
                removeClass(this.bottomtext, 'nobutton');
                const [x1, y1] = [parseFloat(lines[0].getAttribute('x1')), parseFloat(lines[0].getAttribute('y1'))];
                const [x2, y2] = [parseFloat(lines[0].getAttribute('x2')), parseFloat(lines[0].getAttribute('y2'))];
                let angle = Math.abs(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
                if (angle > 180) angle = 360 - angle;
                if (angle > 90) angle = 180 - angle;
                this.answer = {
                    x1: x1, y1: y1, x2, x2, y2: y2,
                    difference: angle,
                    heightPercentage: 100 - (((y1 * 100 / vb.height) + (y2 * 100 / vb.height)) / 2),
                    elapsed: Math.round(Date.now() - questionstart),
                    time: new Date(Date.now()).toISOString()
                };
            }
            bottombottle.addEventListener('touchstart', down);
            bottombottle.addEventListener('mousedown', down);
        }

        this.answer = {};
        bottombottle.addEventListener('touchstart', down);
        bottombottle.addEventListener('mousedown', down);

        pursue.addEventListener('click', () => {
            this.answers.push(this.answer);
            if (index >= this.testnumber) {
                this.app.progress();
                this.listen = false;
                if (this.topcontent) { removeClass(this.topcontent, 'pop'); }
                if (this.bottomcontent) { removeClass(this.bottomcontent, 'pop'); }
                else { removeClass(this.content, 'pop'); }

                const clearing = 2;
                let cleared = 0;

                const pursue = () => {
                    if (++cleared >= clearing) {
                        this.destroy();
                        this.basemap.fit(this.params.interface.map.levels, {
                            easing: easeInOutSine
                        }, () => {
                            this.app.page = new Levels({ app: this.app, position: 'current', update: true });
                        });
                    }
                }

                this.end = Date.now();
                const results = {
                    session: this.params.session.index,
                    game: this.params.game,
                    start: new Date(this.start).toISOString(),
                    end: new Date(this.end).toISOString(),
                    duration: this.end - this.start,
                    answers: this.answers
                }
                ajaxPost('piaget', results, pursue, pursue);
                wait(500, pursue);
            } else {
                removeClass(this.bottomcontent, 'pop');
                wait(500, () => {
                    clearElement(this.bottomcontent);
                    this.createBottomPanel(++index);
                });
            }
        }, true);
    }

    getRelativeCoordinates(container, event) {
        const touch = event.touches ? event.touches[0] : event;
        const rect = container.getBoundingClientRect();
        const xRel = touch.clientX - rect.left;
        const yRel = touch.clientY - rect.top;
        const vb = container.querySelector('svg').viewBox.baseVal;
        const x = xRel / rect.width * vb.width + vb.x;
        const y = yRel / rect.height * vb.height + vb.y;
        return [x, y];
    }
}

export default Piaget;