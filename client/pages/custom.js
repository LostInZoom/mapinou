import { addClass, makeDiv, removeClass, wait } from "../utils/dom";
import { easeInOutSine } from "../utils/math";
import { ajaxPost } from "../utils/ajax";

import Page from "./page";
import Levels from "./levels";
import Form from "./form";
import Consent from "./consent";
import Selection from "./selection";
import Title from "./title";

class Custom extends Page {
    constructor(options, callback) {
        super(options, callback);

        this.content = makeDiv(null, 'page-content pop');
        this.back = makeDiv(null, 'page-button page-button-back', 'Annuler');
        this.continue = makeDiv(null, 'page-button page-button-continue', 'Valider');

        this.text = makeDiv(null, 'custom-text');
        this.content.append(this.back, this.text, this.continue);
        this.container.append(this.content);

        this.selection = new Selection({ page: this, parent: this.text });

        wait(this.app.options.interface.transition.page, () => {
            addClass(this.back, 'pop');
            addClass(this.continue, 'pop');

            this.back.addEventListener('click', () => {
                if (this.listen) {
                    this.listen = false;
                    this.playButtonSound();

                    if (!this.app.options.session.form) {
                        this.previous = new Form({ app: this.app, position: 'previous', question: 0 });
                    } else {
                        if (!this.app.options.session.consent) {
                            this.previous = new Consent({ app: this.app, position: 'previous' });
                        } else {
                            this.previous = new Title({ app: this.app, position: 'previous' });
                        }
                    }
                    this.slidePrevious();
                }
            }, { once: true });

            this.continue.addEventListener('click', () => {
                if (this.listen) {
                    this.listen = false;
                    this.playButtonSound();

                    const [color, name] = this.selection.getValues();
                    this.params.game.color = color;
                    localStorage.setItem('color', color);

                    if (name !== this.params.session.name) {
                        ajaxPost('rename/', { index: this.params.session.index, name: name }, (data) => {
                            if (data.done) {
                                this.params.session.name = name;
                                localStorage.setItem('name', name);
                            }
                            this.levels();
                        });
                    } else {
                        this.levels();
                    }
                }
            }, { once: true });
        });
    }

    levels() {
        removeClass(this.content, 'pop');
        this.app.killRabbits();
        this.app.forbidRabbits();
        wait(300, () => {
            this.destroy();
            this.basemap.fit(this.params.interface.map.levels, {
                easing: easeInOutSine
            }, () => {
                this.app.page = new Levels({ app: this.app, position: 'current', init: true });
            });
        });
    }
}

export default Custom;