import Form from "./form";
import Page from "./page";
import Title from "./title";

import { ajaxPost } from "../utils/ajax";
import { addClass, isOverflown, makeDiv, removeClass, wait } from "../utils/dom";

class Consent extends Page {
    constructor(options, callback) {
        super(options, callback);
        addClass(this.container, 'page-consent');
        this.options.app.allowRabbits();

        this.content = makeDiv(null, 'page-content pop');
        this.back = makeDiv(null, 'page-button page-button-back', 'Retour');
        this.continue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        this.text = makeDiv(null, 'consent-text');
        this.title = makeDiv(null, 'consent-title', 'Formulaire de consentement');
        this.elements = makeDiv(null, 'consent-elements no-scrollbar');
        this.scrollindicator = makeDiv(null, 'consent-scroll-indicator', '▼');
        this.text.append(this.title, this.elements, this.scrollindicator);

        this.content.append(this.back, this.text, this.continue);
        this.container.append(this.content);

        this.app.options.consent.forEach((element) => {
            let e = makeDiv(null, 'consent-element');
            if (element.type === 'paragraph') {
                addClass(e, 'consent-paragraph');
                e.innerHTML = element.content;
            }
            else if (element.type === 'list') {
                addClass(e, 'consent-list');
                if ('title' in element) {
                    let t = makeDiv(null, 'consent-list-title', element.title);
                    e.append(t);
                }

                let entries = document.createElement('ul');
                element.content.forEach((l) => {
                    let entry = document.createElement('li');
                    addClass(entry, 'consent-list-entry');
                    entry.innerHTML = l;
                    entries.append(entry);
                });
                e.append(entries);
            }
            this.elements.append(e);
        });

        this.checked = false;
        this.checkbox = makeDiv(null, 'consent-checkbox');
        if (this.app.options.consentment) { addClass(this.checkbox, 'checked'); }

        this.checkboxbutton = makeDiv(null, 'consent-checkbox-button');
        this.checkboxlabel = makeDiv(null, 'consent-checkbox-label', `D'accord`);

        this.checkbox.append(this.checkboxbutton, this.checkboxlabel);
        this.elements.append(this.checkbox);

        this.checkbox.addEventListener('click', () => { this.checking(); });

        wait(this.app.options.interface.transition.page, () => {
            addClass(this.back, 'pop');
            if (this.app.options.consentment) {
                addClass(this.continue, 'pop');
                wait(200, () => {
                    this.elements.scrollBy({
                        top: this.elements.scrollHeight,
                        behavior: 'smooth'
                    });
                });
            }

            this.observer = new ResizeObserver(() => {
                if (isOverflown(this.elements)) {
                    addClass(this.scrollindicator, 'active');
                } else {
                    removeClass(this.scrollindicator, 'active');
                }
            }).observe(this.elements);

            this.scrollindicator.addEventListener('click', () => {
                this.elements.scrollBy({
                    top: this.elements.scrollHeight,
                    behavior: 'smooth'
                });
            });

            // PREVIOUS PAGE
            this.back.addEventListener('click', () => {
                if (this.listen) {
                    this.listen = false;
                    this.playSound('button');
                    this.previous = new Title({ app: this.app, position: 'previous' });
                    this.slidePrevious();
                }
            });

            // NEXT PAGE
            this.continue.addEventListener('click', () => {
                if (this.listen) {
                    this.listen = false;
                    this.playSound('button');
                    ajaxPost('consent/', { session: this.app.options.session.index }, (status) => {
                        if (status.done) { this.app.options.session.consent = true; }
                        this.next = new Form({ app: this.app, position: 'next', question: 0 });
                        this.slideNext();
                    });
                }
            });

            this.callback();
        });
    }

    checking() {
        if (this.checked) { this.uncheck(); }
        else { this.check(); }
    }

    check() {
        addClass(this.checkbox, 'checked');
        addClass(this.continue, 'pop');
        this.checked = true;
        this.app.options.consentment = true;
    }

    uncheck() {
        removeClass(this.checkbox, 'checked');
        removeClass(this.continue, 'pop');
        this.checked = false;
        this.app.options.consentment = false;
    }

    isChecked() {
        if (this.checked) { return true; }
        else { return false; }
    }
}

export default Consent;