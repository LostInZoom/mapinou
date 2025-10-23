import Consent from "./consent";
import Levels from "./levels";
import Page from "./page";
import Title from "./title";

import { ajaxPost } from "../utils/ajax";
import { addClass, makeDiv, hasClass, addClass, removeClass, wait } from "../utils/dom";
import { easeInOutSine } from "../utils/math";

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
        this.answerscontainer = makeDiv(null, 'form-answers');

        this.text.append(this.label, this.answerscontainer);

        this.content.append(this.back, this.text, this.continue);
        this.container.append(this.content);

        for (let i = 0; i < this.question.answers.length; i++) {
            let a = this.question.answers[i];
            let answer = makeDiv(null, 'form-answer', a.text);

            if (this.question.answer) {
                if (this.question.answer.includes(i)) {
                    addClass(answer, 'selected');
                }
            }

            answer.setAttribute('unique', a.unique);
            this.answers.push(answer);
            this.answerscontainer.append(answer);

            answer.addEventListener('click', () => {
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
                        q.answer.forEach((a) => { answers.push(q.answers[a].text); });
                        data.push(answers);
                    }

                    ajaxPost('form/', { session: this.app.options.session.index, form: data }, (status) => {
                        if (status.done) { this.app.options.session.form = true; }
                        this.levels();
                    });
                } else {
                    this.next = new Form({ app: this.app, position: 'next', question: this.options.question + 1, });
                    this.slideNext();
                }
            }
        });
    }

    levels() {
        removeClass(this.content, 'pop');
        this.options.app.killRabbits();
        this.options.app.forbidRabbits();
        wait(300, () => {
            this.destroy();
            this.basemap.fit(this.params.interface.map.levels, {
                easing: easeInOutSine
            }, () => {
                this.app.page = new Levels({ app: this.app, position: 'current', init: true });
            });
        });
    }

    unselectAnswers(unique) {
        this.answers.forEach((a) => {
            if (unique) {
                if (a.getAttribute('unique') === 'true') {
                    removeClass(a, 'selected')
                }
            } else {
                removeClass(a, 'selected')
            }
        });
    }

    isAnswered() {
        let result = false;
        for (let i = 0; i < this.answers.length; i++) {
            let a = this.answers[i];
            if (hasClass(a, 'selected')) { result = true; break; }
        }
        return result;
    }

    saveAnswer() {
        let result = [];
        for (let i = 0; i < this.answers.length; i++) {
            let a = this.answers[i];
            if (hasClass(a, 'selected')) { result.push(i); }
        }
        this.question.answer = result;
    }
}

export default Form;