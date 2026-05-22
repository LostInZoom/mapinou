import Consent from "./consent";
import Page from "./page";
import Title from "./title";

import { ajaxPost } from "../utils/ajax";
import { addClass, makeDiv, hasClass, addClass, removeClass, wait } from "../utils/dom";
import Custom from "./custom";
import { remap } from "../utils/math";

class Form extends Page {
    constructor(options, callback) {
        super(options, callback);

        addClass(this.container, 'page-form');
        this.options.app.allowRabbits();

        this.content = makeDiv(null, 'page-content pop');
        this.back = makeDiv(null, 'page-button page-button-back', 'Retour');
        this.continue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        this.answers = []
        // Flag for the current question to display
        this.current = 0;

        this.text = makeDiv(null, 'form-text');
        this.questions = makeDiv(null, 'form-questions');

        this.question = this.options.app.options.form[this.options.question];
        let multiple = this.question.multiple;

        this.label = makeDiv(null, 'form-question', this.question.question);

        this.text.append(this.label);

        if (this.question.subtext) {
            let subtext = makeDiv(null, 'form-subtext', this.question.subtext);
            this.text.append(subtext);
        }

        this.answerscontainer = makeDiv(null, 'form-answers');
        this.text.append(this.answerscontainer);

        this.content.append(this.back, this.text, this.continue);
        this.container.append(this.content);

        for (let i = 0; i < this.question.answers.length; i++) {
            let a = this.question.answers[i];

            if ('range' in a) {
                addClass(this.answerscontainer, 'range');
                let element = makeDiv(null, 'form-answer range');
                element.setAttribute('unique', a.unique);
                let answers = makeDiv(null, 'form-range-answers');

                // Create the answers
                let choice = makeDiv(null, 'form-range-choice');
                choice.style.width = `calc(100% / ${a.range.max - a.range.min + 1})`;

                let points = makeDiv(null, 'form-range-points');
                let numbers = makeDiv(null, 'form-range-numbers');

                // Create a slider depending on the range
                for (let j = a.range.min; j <= a.range.max; j++) {
                    let p = makeDiv(null, 'form-range-point');
                    let n = makeDiv(null, 'form-range-number', j);
                    n.setAttribute('value', j);
                    points.append(p);
                    numbers.append(n);

                    // Click listener for the answer
                    p.addEventListener('click', () => {
                        this.playButtonSound();

                        if (hasClass(n, 'selected')) {
                            removeClass(n, 'selected');
                            removeClass(choice, 'pop');
                        } else {
                            if (!multiple || a.unique) { this.unselectAnswers(false); }
                            else { this.unselectAnswers(true); }

                            // Deactivate all answers
                            numbers.childNodes.forEach(child => { removeClass(child, 'selected'); });
                            // Activate the selected answer
                            addClass(numbers.querySelector(`[value="${j}"]`), 'selected');
                            addClass(choice, 'pop');
                            // Calculate the percentage of the left position of the answer
                            let perc = remap(j, a.range.min, a.range.max, 0, 100);
                            const width = answers.getBoundingClientRect().width / (a.range.max - a.range.min + 1);
                            // Move the slider to reach the selected answer
                            choice.style.left = `calc(${perc}% - ${perc * width / 100}px)`;
                        }

                        if (this.isAnswered()) { addClass(this.continue, 'pop'); }
                        else { removeClass(this.continue, 'pop'); }
                    });
                }

                answers.append(points, choice, numbers);
                element.append(answers);
                this.answerscontainer.append(element);
                this.answers.push(element);

                if (this.question.answer) {
                    let q = this.question.answer.find(obj => obj.position === i)
                    if (q) {
                        addClass(numbers.querySelector(`[value="${q.index}"]`), 'selected');
                        addClass(choice, 'pop');
                        let perc = remap(q.index, a.range.min, a.range.max, 0, 100);
                        const width = answers.getBoundingClientRect().width / (a.range.max - a.range.min + 1);
                        choice.style.left = `calc(${perc}% - ${perc * width / 100}px)`;
                    }
                }
            } else {
                let answer = makeDiv(null, 'form-answer', a.text);

                if (this.question.answer) {
                    if (this.question.answer.some(obj => obj.position === i)) {
                        addClass(answer, 'selected');
                    }
                }

                answer.setAttribute('unique', a.unique);
                this.answers.push(answer);
                this.answerscontainer.append(answer);

                answer.addEventListener('click', () => {
                    this.playButtonSound();
                    if (hasClass(answer, 'selected')) {
                        removeClass(answer, 'selected');
                    } else {
                        if (!multiple || a.unique) { this.unselectAnswers(false); }
                        else { this.unselectAnswers(true); }
                        addClass(answer, 'selected');
                    }

                    if (this.isAnswered()) { addClass(this.continue, 'pop'); }
                    else { removeClass(this.continue, 'pop'); }
                });
            }
        };

        wait(this.app.options.interface.transition.page, () => {
            addClass(this.back, 'pop');
            if (this.isAnswered()) { addClass(this.continue, 'pop'); }
            this.callback();
        });

        this.back.addEventListener('click', () => {
            if (this.listen) {
                this.playButtonSound();
                this.listen = false;
                this.saveAnswer();
                if (this.options.question === 0) {
                    if (this.app.options.session.consent) {
                        this.previous = new Title({ app: this.app, position: 'previous' });
                    } else {
                        this.previous = new Consent({ app: this.app, position: 'previous', });
                    }
                } else {
                    this.previous = new Form({ app: this.app, position: 'previous', question: this.options.question - 1, });
                }
                this.slidePrevious();
            }
        });

        this.continue.addEventListener('click', () => {
            if (this.listen) {
                this.playButtonSound();
                this.listen = false;
                this.saveAnswer();
                if (this.options.question === this.options.app.options.form.length - 1) {
                    let data = [];
                    for (let i = 0; i < this.options.app.options.form.length; i++) {
                        let q = this.options.app.options.form[i];
                        let answers = []
                        q.answer.forEach((a) => { 
                            let answer = q.answers[a.position];
                            if ('range' in answer) {
                                answers.push(a.index);
                            } else {
                                answers.push(answer.text);
                            }
                        });
                        data.push(answers);
                    }

                    ajaxPost('form/', { session: this.app.options.session.index, form: data }, (status) => {
                        if (status.done) { this.app.options.session.form = true; }
                        this.next = new Custom({ app: this.app, position: 'next' });
                        this.slideNext();
                    });
                } else {
                    this.next = new Form({ app: this.app, position: 'next', question: this.options.question + 1, });
                    this.slideNext();
                }
            }
        });
    }

    unselectAnswers(unique) {
        this.answers.forEach((a) => {
            if (unique) {
                if (a.getAttribute('unique') === 'true') {
                    removeClass(a, 'selected')
                }
            } else {
                if (hasClass(a, 'range')) {
                    let children = a.querySelector('.form-range-numbers').children;
                    removeClass(a.querySelector('.form-range-choice'), 'pop');
                    for (let j = 0; j < children.length; j++) {
                        removeClass(children[j], 'selected');
                    }
                } else {
                    removeClass(a, 'selected');
                }
            }
        });
    }

    isAnswered() {
        let result = false;
        for (let i = 0; i < this.answers.length; i++) {
            let a = this.answers[i];
            if (hasClass(a, 'selected')) { result = true; break; }
            if (hasClass(a, 'range')) {
                let children = a.querySelector('.form-range-numbers').children;
                for (let j = 0; j < children.length; j++) {
                    if (hasClass(children[j], 'selected')) { result = true; break; }
                }
            }
        }
        return result;
    }

    saveAnswer() {
        let result = [];
        for (let i = 0; i < this.answers.length; i++) {
            let a = this.answers[i];
            if (hasClass(a, 'selected')) { 
                result.push({
                    type: 'button',
                    position: i
                });
            }
            if (hasClass(a, 'range')) {
                let children = a.querySelector('.form-range-numbers').children;
                for (let j = 0; j < children.length; j++) {
                    if (hasClass(children[j], 'selected')) { result.push({
                        type: 'range',
                        position: i,
                        index: parseInt(children[j].getAttribute('value'))
                    });}
                }
            }
        }
        this.question.answer = result;
    }
}

export default Form;