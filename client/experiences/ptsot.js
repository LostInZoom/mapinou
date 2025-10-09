import Levels from "../pages/levels";
import Page from "../pages/page";
import { ajaxPost } from "../utils/ajax";
import { addClass, addClassList, hasClass, makeDiv, removeClass, removeClassList, wait } from "../utils/dom";
import { easeInOutSine, generateRandomInteger } from "../utils/math";

class SpatialOrientation extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.elements = this.options.elements;
        this.stage = this.options.stage;
        this.answers = this.options.answers ?? [];
        this.timelimit = this.elements.timelimit;
        this.namespace = 'http://www.w3.org/2000/svg';
        this.index = 0;
        this.tutorial = true;
        this.elapsed = 0;

        this.answer = {};
        this.texts = [];

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
            this.start = Date.now();

            if (this.stage === 'tutorial') {
                this.elements.top.forEach(e => {
                    if ('type' in e) {
                        if (e.type === 'characters') {
                            this.generateCharacters(this.toptext, e.subtype);
                        }
                    }
                });
                addClass(this.content, 'ptsot');
                this.createBottomContent();
            }
        }
    }

    createPresentation() {
        let back = makeDiv(null, 'page-button page-button-back', 'Retour');
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        let text = makeDiv(null, 'experience-text');
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
            addClass(back, 'pop');
            addClass(pursue, 'pop');
            this.listen = true;

            back.addEventListener('click', () => {
                this.toLevels(false);
            }, { once: true });

            pursue.addEventListener('click', () => {
                this.listen = false;
                let o = this.options;
                o.stage = 'tutorial';
                o.position = 'next';
                o.answers = this.answers;
                this.next = new SpatialOrientation(o);
                this.slideNext();
            }, { once: true });
        });
    }

    createBottomContent(forwards = true) {
        let elements = this.elements[this.tutorial ? 'tutorial' : 'tests'];
        let content = elements[this.index].content;
        let first = this.index === 0 && forwards && this.tutorial;
        this.texts = [];

        const backListener = () => {
            this.back.removeEventListener('click', backListener);
            if (this.index === 0) {
                this.listen = false;
                let o = this.options;
                o.stage = 'presentation';
                o.position = 'previous';
                o.answers = this.answers;
                this.previous = new SpatialOrientation(o);
                this.slidePrevious();
            } else {
                if (this.tutorial) {
                    --this.index;
                    this.navigateBottom(false);
                }
            }
        }

        this.bottomcontent = makeDiv(null, 'experience-content bottom');
        if (first) { addClass(this.bottomcontent, 'pop'); }
        this.continue = makeDiv(null, 'page-button page-button-continue', 'Continuer');
        this.bottomtext = makeDiv(null, 'experience-text bottom nobutton pop');
        this.bottomcontent.append(this.bottomtext, this.continue);
        this.content.append(this.bottomcontent);

        content.forEach(e => {
            if (e.type === 'characters') {
                this.generateCharacters(this.bottomtext, e.subtype);
            }
            else if (e.type === 'tutorial') {
                this.generateCircle(this.bottomtext, e);
            }
            else if (e.type === 'test') {
                this.generateCircle(this.bottomtext, e);
            }
            else if (e.type === 'timer') {
                this.generateTimer(this.bottomtext, () => {
                    if (!this.tutorial) {
                        this.answer.elapsed = Math.round(this.elapsed);
                        this.answers.push(this.answer);
                        this.answer = {};
                    }
                    this.back.removeEventListener('click', backListener);
                    if (this.index === elements.length - 1) {
                        this.app.progress();
                        this.toLevels(true);
                    } else {
                        ++this.index;
                        this.navigateBottom();
                    }
                });
            }
            else {
                if (!this.tutorial) {
                    let title = makeDiv(null, 'ptsot-characters-text title bottom', `Test ${parseInt(this.index) + 1}/${this.elements.tests.length}`);
                    this.bottomtext.append(title);
                }
                let bottom = makeDiv(null, 'ptsot-characters-text bottom', e.text.replace(/<b>(.*?)<\/b>/gi, '<span>$1</span>'));
                this.bottomtext.append(bottom);
            }
        });
        if (!this.tutorial) {
            removeClass(this.back, 'pop');
            addClass(this.toptext, 'nobutton');
        }

        if (this.index > 0 || !forwards || !this.tutorial) {
            this.bottomcontent.offsetHeight;
            addClass(this.bottomcontent, 'pop');
        }

        const transition = first ? this.app.options.interface.transition.page : 300;
        wait(transition, () => {
            if (this.tutorial) {
                addClass(this.back, 'pop');
                addClass(this.continue, 'pop');
                removeClassList([this.toptext, this.bottomtext], 'nobutton');
            }
            this.listen = true;
            this.displayTexts();

            this.back.addEventListener('click', backListener);
            this.continue.addEventListener('click', () => {
                if (!this.tutorial) {
                    this.answer.difference = Math.abs(this.answer.trueAngle - this.answer.drawAngle);
                    this.answer.elapsed = Math.round(this.elapsed);
                    this.answers.push(this.answer);
                    this.answer = {};
                }

                this.back.removeEventListener('click', backListener);
                if (this.index === elements.length - 1) {
                    if (this.tutorial) {
                        this.index = 0;
                        this.tutorial = false;
                        this.navigateBottom();
                    } else {
                        this.app.progress();
                        this.toLevels(true);
                    }
                } else {
                    ++this.index;
                    this.navigateBottom();
                }
            }, { once: true });
        });
    }

    generateCharacters(container, type) {
        let charcontainer = makeDiv(null, 'ptsot-characters-container');
        for (let [c, infos] of Object.entries(this.elements.characters)) {
            if (type === 'images') {
                let character = makeDiv(null, 'ptsot-characters-character hidden ' + c);
                let image = document.createElement('img');
                image.src = this.params.sprites[`ptsot:${c}`];
                image.alt = infos.name;
                character.append(image);
                character.style.left = infos.coordinates[0] + '%';
                character.style.top = infos.coordinates[1] + '%';
                charcontainer.append(character);
            }
            else if (type === 'names') {
                let name = makeDiv(null, 'ptsot-characters-name ' + c, infos.name);
                name.style.left = infos.coordinates[0] + '%';
                name.style.top = infos.coordinates[1] + '%';
                charcontainer.append(name);
            }

            let point = makeDiv(null, 'ptsot-characters-point ' + c);
            point.style.left = infos.coordinates[0] + '%';
            point.style.top = infos.coordinates[1] + '%';
            charcontainer.append(point);
        }
        container.append(charcontainer);
    }

    generateCircle(container, options) {
        let svgcontainer = makeDiv(null, 'ptsot-svg-container');
        let svg = document.createElementNS(this.namespace, 'svg');
        svgcontainer.append(svg);
        container.append(svgcontainer);
        container.offsetWidth;

        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${svgcontainer.offsetWidth} ${svgcontainer.offsetHeight}`);

        // Set a padding of 20%
        let padding = Math.min(20 * svgcontainer.offsetHeight / 100, 20 * svgcontainer.offsetWidth / 100);
        let center = { x: svgcontainer.offsetWidth / 2, y: svgcontainer.offsetHeight / 2 }
        let radius = Math.min(svgcontainer.offsetHeight / 2 - padding, svgcontainer.offsetWidth / 2 - padding);

        let p1 = document.createElementNS(this.namespace, 'circle');
        p1.setAttribute('class', 'point1');
        p1.setAttribute('cx', center.x);
        p1.setAttribute('cy', center.y);

        let p2 = document.createElementNS(this.namespace, 'circle');
        p2.setAttribute('class', 'point2');
        p2.setAttribute('cx', center.x);
        p2.setAttribute('cy', padding);

        let circle = document.createElementNS(this.namespace, 'circle');
        circle.setAttribute('class', 'circle');
        circle.setAttribute('cx', center.x);
        circle.setAttribute('cy', center.y);
        circle.setAttribute('r', radius);

        let line = document.createElementNS(this.namespace, 'line');
        line.setAttribute('class', 'line1');
        line.setAttribute('x1', center.x);
        line.setAttribute('y1', center.y);
        line.setAttribute('x2', center.x);
        line.setAttribute('y2', padding);

        svg.append(circle);

        let angle = this.calculateNameAngles(options.character1, options.character2, options.character3);
        let tutoelements = [];
        if (this.tutorial) {
            let p3 = document.createElementNS(this.namespace, 'circle');
            p3.setAttribute('class', 'point-solution');
            const rad = angle * Math.PI / 180;
            const [p3x, p3y] = [center.x + radius * Math.sin(rad), center.y - radius * Math.cos(rad)]
            p3.setAttribute('cx', p3x);
            p3.setAttribute('cy', p3y);
            let line2 = document.createElementNS(this.namespace, 'line');
            line2.setAttribute('class', 'line-solution');
            line2.setAttribute('x1', center.x);
            line2.setAttribute('y1', center.y);
            line2.setAttribute('x2', p3x);
            line2.setAttribute('y2', p3y);
            if (options.type === 'test') {
                tutoelements = [line2, p3];
                addClassList(tutoelements, 'hidden');
            }
            svg.append(line2, p3);
        }

        if (options.type === 'test') {
            let lines = [];
            let end = [];
            let [x, y] = [0, 0];
            const destroyElements = () => {
                if (lines.length > 0) {
                    let oldline = lines.pop();
                    addClass(oldline, 'hidden');
                    wait(200, () => { oldline.remove(); })
                }
                if (end.length > 0) {
                    let oldend = end.pop();
                    addClass(oldend, 'hidden');
                    wait(200, () => { oldend.remove(); })
                }
                lines = [];
                end = [];
            }

            const createElements = () => {
                let l = document.createElementNS(this.namespace, 'line');
                l.setAttribute('class', 'line-answer');
                l.setAttribute('x1', center.x);
                l.setAttribute('y1', center.y);
                l.setAttribute('x2', x);
                l.setAttribute('y2', y);
                lines.push(l);
                let p = document.createElementNS(this.namespace, 'circle');
                p.setAttribute('class', 'point-answer');
                p.setAttribute('cx', x);
                p.setAttribute('cy', y);
                end.push(p);
                addClassList([p, l], 'hidden');
                svg.append(l, p);
                svgcontainer.offsetHeight;
                removeClassList([p, l], 'hidden');
            }

            const down = (e) => {
                e.preventDefault();
                destroyElements();
                svgcontainer.removeEventListener('touchstart', down);
                svgcontainer.removeEventListener('mousedown', down);
                [x, y] = this.getRelativeCoordinates(svgcontainer, e);
                [x, y] = this.projectPointOnCircle(center.x, center.y, radius, x, y);
                createElements(x, y);
                svg.appendChild(p1);
                svgcontainer.addEventListener('touchmove', move);
                svgcontainer.addEventListener('mousemove', move);
                svgcontainer.addEventListener('touchend', up);
                svgcontainer.addEventListener('mouseup', up);
            };

            const move = (e) => {
                e.preventDefault();
                [x, y] = this.getRelativeCoordinates(svgcontainer, e);
                [x, y] = this.projectPointOnCircle(center.x, center.y, radius, x, y);
                lines[0].setAttribute('x2', x);
                lines[0].setAttribute('y2', y);
                end[0].setAttribute('cx', x);
                end[0].setAttribute('cy', y);
            };

            const up = (e) => {
                e.preventDefault();
                svgcontainer.removeEventListener('touchmove', move);
                svgcontainer.removeEventListener('mousemove', move);
                svgcontainer.removeEventListener('touchend', up);
                svgcontainer.removeEventListener('mouseup', up);
                addClass(this.continue, 'pop');
                removeClass(this.bottomtext, 'nobutton');
                if (this.tutorial) {
                    removeClassList(tutoelements, 'hidden');
                    this.displayTextSolution();
                } else {
                    this.answer = {
                        trueAngle: angle,
                        drawAngle: 360 - this.calculateAngle(center, { x: center.x, y: padding }, { x: x, y: y }),
                        time: new Date(Date.now()).toISOString()
                    };
                }
                svgcontainer.addEventListener('touchstart', down);
                svgcontainer.addEventListener('mousedown', down);
            };
            svgcontainer.addEventListener('touchstart', down);
            svgcontainer.addEventListener('mousedown', down);
        }

        svg.append(line, p1, p2);

        this.createCharactersLabels(svg, options.type, {
            center: center,
            radius: radius + 10,
            character1: options.character1,
            character2: options.character2,
            character3: options.character3,
            angle: angle
        });
    }

    generateTimer(container, callback) {
        let timercontainer = makeDiv(null, 'ptsot-timer-container');
        let timerdiv = makeDiv(null, 'ptsot-timer');
        timercontainer.append(timerdiv);
        container.append(timercontainer);
        let index = this.index;
        let start = performance.now();
        this.elapsed = 0;
        const timer = () => {
            if (index === this.index) {
                let time = performance.now();
                this.elapsed = time - start;
                if (this.elapsed >= this.timelimit * 1000) {
                    callback();
                } else {
                    let perc = 100 - (this.elapsed * 100 / (this.timelimit * 1000));
                    if (perc <= 50) {
                        if (perc > 25) { addClass(timerdiv, 'half'); }
                        else { addClass(timerdiv, 'quarter'); }
                    }
                    timerdiv.style.width = `${perc}%`;
                    requestAnimationFrame(timer);
                }
            }
        };
        requestAnimationFrame(timer);
    }

    navigateBottom(forwards = true) {
        this.listen = false;
        removeClass(this.bottomcontent, 'pop');
        wait(300, () => {
            this.bottomcontent.remove();
            this.createBottomContent(forwards);
        });
    }

    toLevels(update) {
        this.listen = false;
        this.index = undefined;
        if (this.topcontent) { removeClass(this.topcontent, 'pop'); }
        if (this.bottomcontent) { removeClass(this.bottomcontent, 'pop'); }
        else { removeClass(this.content, 'pop'); }

        const clearing = update ? 2 : 1;
        let cleared = 0;

        const pursue = () => {
            if (++cleared >= clearing) {
                this.destroy();
                this.basemap.fit(this.params.interface.map.levels, {
                    easing: easeInOutSine
                }, () => {
                    this.app.page = new Levels({ app: this.app, position: 'current', update: update });
                });
            }
        }

        if (update) {
            this.end = Date.now();
            const results = {
                session: this.params.session.index,
                game: this.params.game,
                start: new Date(this.start).toISOString(),
                end: new Date(this.end).toISOString(),
                duration: this.end - this.start,
                answers: this.answers
            }
            ajaxPost('ptsot', results, pursue, pursue);
        }
        wait(500, pursue);
    }

    createCharactersLabels(svg, type, options) {
        let characters = this.elements.characters;
        let c = options.center;
        let r = options.radius;

        let name1 = document.createElementNS(this.namespace, 'text');
        name1.textContent = characters[options.character1].name;
        name1.setAttribute('class', 'hidden');
        name1.setAttribute('x', c.x);
        name1.setAttribute('y', c.y + 18);
        name1.setAttribute('text-anchor', 'middle');

        const path = document.createElementNS(this.namespace, 'path');
        path.setAttribute("id", 'circle-path');
        path.setAttribute("d", `M ${c.x},${c.y} m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`);
        let defs = document.createElementNS(this.namespace, 'defs');
        svg.appendChild(defs);
        defs.appendChild(path);

        const text2 = document.createElementNS(this.namespace, 'text');
        text2.setAttribute('class', 'hidden');
        const textPat2 = document.createElementNS(this.namespace, 'textPath');
        textPat2.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#circle-path');
        textPat2.setAttribute('startOffset', '25%');
        textPat2.setAttribute('text-anchor', 'middle');
        textPat2.textContent = characters[options.character2].name;
        text2.append(textPat2);

        svg.append(name1, text2);
        this.texts = [name1, text2];

        if (this.tutorial) {
            const text3 = document.createElementNS(this.namespace, 'text');
            text3.setAttribute('class', 'hidden');
            addClass(text3, 'text-solution');
            addClass(text3, type);
            const textPath3 = document.createElementNS(this.namespace, 'textPath');
            textPath3.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#circle-path');
            textPath3.setAttribute('startOffset', 25 + (100 * options.angle / 360) + '%');
            textPath3.setAttribute('text-anchor', 'middle');
            textPath3.textContent = characters[options.character3].name;
            text3.append(textPath3);
            svg.append(text3);
            this.texts.push(text3);
        }
    }

    displayTexts() {
        this.texts.forEach(text => {
            if (!hasClass(text, 'test')) {
                removeClass(text, 'hidden');
            }
        });
    }

    displayTextSolution() {
        this.texts.forEach(text => {
            if (hasClass(text, 'test')) {
                removeClass(text, 'hidden');
            }
        });
    }

    calculateNameAngles(name1, name2, name3) {
        let charactercontainer = this.toptext.querySelector('.ptsot-characters-container');
        const width = charactercontainer.offsetWidth;
        const height = charactercontainer.offsetHeight;
        let e1 = charactercontainer.querySelector('.ptsot-characters-point.' + name1);
        let e2 = charactercontainer.querySelector('.ptsot-characters-point.' + name2);
        let e3 = charactercontainer.querySelector('.ptsot-characters-point.' + name3);
        const p1 = { x: parseFloat(e1.style.left) * width / 100, y: (100 - parseFloat(e1.style.top)) * height / 100 };
        const p2 = { x: parseFloat(e2.style.left) * width / 100, y: (100 - parseFloat(e2.style.top)) * height / 100 };
        const p3 = { x: parseFloat(e3.style.left) * width / 100, y: (100 - parseFloat(e3.style.top)) * height / 100 };
        return this.calculateAngle(p1, p2, p3);
    }

    calculateAngle(p1, p2, p3) {
        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const v2x = p3.x - p1.x;
        const v2y = p3.y - p1.y;
        const a1 = Math.atan2(v1y, v1x);
        const a2 = Math.atan2(v2y, v2x);
        let angle = a1 - a2;
        if (angle < 0) angle += 2 * Math.PI;
        return angle * 180 / Math.PI;
    }

    projectPointOnCircle(cx, cy, r, x, y) {
        const vx = x - cx;
        const vy = y - cy;
        const len = Math.hypot(vx, vy);
        // avoid dividing by zero
        if (len === 0) return [cx + r, cy];
        const ux = vx / len;
        const uy = vy / len;
        const x1 = cx + r * ux;
        const y1 = cy + r * uy;
        return [x1, y1];
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

export default SpatialOrientation;