import Levels from "../pages/levels";
import Page from "../pages/page";
import { ajaxPost } from "../utils/ajax";
import { addClass, hasClass, makeDiv, removeClass, removeClassList, wait } from "../utils/dom";
import { easeInOutSine, generateRandomInteger } from "../utils/math";

class Purdue extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.elements = this.options.elements;
        this.stage = this.options.stage;
        this.answers = this.options.answers ?? [];
        this.index = this.options.index ?? 0;
        this.listen = false;

        this.answer = undefined;

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
            this.start = Date.now();
            this.createTest();
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
            addClass(back, 'pop');
            addClass(pursue, 'pop');
            removeClass(text, 'nobutton');
            this.listen = true;

            back.addEventListener('click', () => {
                this.playButtonSound();
                this.toLevels(false);
            }, { once: true });

            pursue.addEventListener('click', () => {
                this.playButtonSound();
                this.listen = false;
                let o = this.options;
                o.stage = 'tutorial';
                o.position = 'next';
                o.answers = this.answers;
                this.next = new Purdue(o);
                this.slideNext();
            }, { once: true });
        });
    }

    createTest() {
        this.listen = false;
        let back = makeDiv(null, 'page-button page-button-back', 'Retour');
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        let text = makeDiv(null, 'experience-text purdue pop noback nocontinue');
        this.content.append(back, text, pursue);
        this.content.offsetWidth;

        let testcontainer = makeDiv(null, 'purdue-test-container');
        if (this.stage === 'tutorial') {
            let title = makeDiv(null, 'purdue-title', 'Tutorial');
            let t1 = makeDiv(null, 'purdue-test-text', this.elements.tutorial.text1);
            testcontainer.append(title, t1);
        } else {
            let title = makeDiv(null, 'purdue-title', `Test ${this.index}/${this.elements.tests.length}`);
            testcontainer.append(title);
        }

        let examplescontainer = makeDiv(null, 'purdue-vector-container examples');
        let svg1 = this.app.options.svgs[`purdue${this.index}e0`];
        let example1 = makeDiv(null, 'purdue-vector example', svg1);
        let rotationto1 = makeDiv(null, 'purdue-label', 'pivote<br>et<br>devient');
        let svg2 = this.app.options.svgs[`purdue${this.index}e1`];
        let example2 = makeDiv(null, 'purdue-vector example answer', svg2);
        examplescontainer.append(example1, rotationto1, example2);
        testcontainer.append(examplescontainer);

        if (this.stage === 'tutorial') {
            let t2 = makeDiv(null, 'purdue-test-text', this.elements.tutorial.text2);
            testcontainer.append(t2);
        }

        let modelscontainer = makeDiv(null, 'purdue-vector-container models');
        let model = makeDiv(null, 'purdue-vector model', this.app.options.svgs[`purdue${this.index}m`]);

        if (this.stage === 'test') {
            let label = makeDiv(null, 'purdue-label', 'comme');
            let rotationto2 = makeDiv(null, 'purdue-label', 'pivote<br>et<br>devient');
            modelscontainer.append(label, model, rotationto2);
        } else {
            modelscontainer.append(model);
        }

        testcontainer.append(modelscontainer);

        if (this.stage === 'tutorial') {
            let t3 = makeDiv(null, 'purdue-test-text', this.elements.tutorial.text3);
            testcontainer.append(t3);
        }

        let answers1 = makeDiv(null, 'purdue-vector-container answers');
        let answers2 = makeDiv(null, 'purdue-vector-container answers');
        let answers = [];

        const answering = (e) => {
            if (this.listen) {
                this.playButtonSound();
                const t = e.target;
                const value = parseInt(t.getAttribute('value'));
                if (hasClass(t, 'active')) {
                    removeClass(t, 'active');
                    removeClass(pursue, 'pop');
                    addClass(text, 'nocontinue');
                    this.answer = undefined;
                } else {
                    removeClassList(answers, 'active');
                    addClass(t, 'active');
                    const end = Date.now();
                    this.answer = {
                        value: value,
                        correct: this.elements.tests[this.index - 1] === value ? true : false,
                        time: new Date(end).toISOString(),
                        elapsed: Math.round(end - this.questionstart)
                    };
                    if (this.stage === 'tutorial') {
                        if (value === this.elements.tutorial.solution) {
                            addClass(pursue, 'pop');
                            removeClass(text, 'nocontinue');
                        } else {
                            removeClass(pursue, 'pop');
                            addClass(text, 'nocontinue');
                        }
                    } else {
                        addClass(pursue, 'pop');
                        removeClass(text, 'nocontinue');
                    }
                }
            }
        };

        for (let i = 0; i < 2; i++) {
            let svg = this.app.options.svgs[`purdue${this.index}a${i}`];
            let answer = makeDiv(null, 'purdue-vector answer', svg);
            answer.setAttribute('value', i);
            answer.addEventListener('click', answering);
            answers.push(answer);
            answers1.append(answer);
        }

        for (let i = 2; i < 4; i++) {
            let svg = this.app.options.svgs[`purdue${this.index}a${i}`];
            let answer = makeDiv(null, 'purdue-vector answer', svg);
            answer.setAttribute('value', i);
            answer.addEventListener('click', answering);
            answers.push(answer);
            answers2.append(answer);
        }

        testcontainer.append(answers1, answers2);
        text.append(testcontainer);

        wait(this.app.options.interface.transition.page, () => {
            this.questionstart = Date.now();

            this.listen = true;
            if (this.stage !== 'test') {
                addClass(back, 'pop');
                removeClass(text, 'noback');
                const backListener = () => {
                    this.playButtonSound();
                    back.removeEventListener('click', backListener);
                    if (this.index === 0) {
                        this.listen = false;
                        let o = this.options;
                        o.stage = 'presentation';
                        o.position = 'previous';
                        o.answers = this.answers;
                        this.previous = new Purdue(o);
                        this.slidePrevious();
                    } else {
                        if (this.tutorial) {
                            --this.index;
                            this.navigateBottom(false);
                        }
                    }
                }
                back.addEventListener('click', backListener);
            }

            pursue.addEventListener('click', () => {
                this.playButtonSound();
                this.listen = false;
                if (this.stage === 'test') {
                    this.answers.push(this.answer);
                }
                if (this.index >= this.elements.tests.length) {
                    this.app.progress();
                    this.toLevels(true);
                } else {
                    let o = this.options;
                    o.stage = 'test';
                    o.position = 'next';
                    o.index = ++this.index;
                    o.answers = this.answers;
                    this.next = new Purdue(o);
                    this.slideNext();
                }
            }, { once: true });
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
            ajaxPost('purdue', results, pursue, pursue);
        }
        wait(500, pursue);
    }
}

export default Purdue;