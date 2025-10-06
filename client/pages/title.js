import Consent from "./consent";
import Form from "./form";
import Levels from "./levels";
import Page from "./page";

import { addClass, makeDiv, removeClass, removeClassList, wait } from "../utils/dom";
import { remap, easeOutCubic, easeInOutSine } from "../utils/math";
import { pxToRem } from "../utils/parse";

class Title extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.listen = false;

        if (this.options.init === undefined) { this.options.init = false; }
        let init = this.options.init;

        // Set the title name
        this.name = 'Mapinou';

        this.options.app.allowRabbits();
        addClass(this.container, 'page-title');

        // Create the title div and the container for the individual letters
        this.title = makeDiv(null, 'title-name slanted');
        this.letters = makeDiv(null, 'title-letters');
        this.title.append(this.letters);
        this.container.append(this.title);

        let delay = this.app.options.interface.transition.page;

        if (init) {
            wait(delay, () => { addClass(this.letters, 'pop'); })
            // Add a delay of 300 milliseconds to make sure the title background is revealed
            delay += 300;
        } else {
            this.letters.offsetWidth;
            addClass(this.letters, 'pop');
        }

        this.letterArray = [];

        // Loop through the name to get individual letters
        for (let i = 0; i < this.name.length; i++) {
            // Create the letter element translated by the width of the page * 1.1
            let value = this.name.charAt(i);

            let character = makeDiv(null, 'title-letter', value);
            if (value.trim().length === 0) { addClass(character, 'empty'); };

            this.letters.append(character);
            this.letterArray.push(character);
        }

        if (init) {
            // Get the width of the page in rem
            let width = pxToRem(this.title.offsetWidth);

            // Set the time taken by the letters animation
            let animationtime = width * 10;
            // Calculate individual letters animation time
            let lettertime = animationtime / this.name.length;

            let j = this.letterArray.length - 1;
            this.letterArray.forEach((l) => {
                l.style.transform = `translateX(-${width}rem)`;
                // Remap the delay, from [0, animationtime] to [0, 1]
                let remapped = remap(j * lettertime, 0, animationtime);
                // Calculate the remapped easing
                let easing = remap(easeOutCubic(remapped), 0, 1, 0, animationtime);
                // Wait the easing value for each letter before the translation
                wait(easing + delay, () => { l.style.transform = `translateX(0)`; });
                j--;
            })

            // Increment the delay by the letters animation time
            delay += 400 + animationtime;
            // Bounce the whole title letters and add the time of the animation to the delay
            wait(delay, () => { addClass(this.letters, 'horizontal-bounce'); })
        }

        // Create the start and credits buttons
        this.buttons = makeDiv(null, 'title-buttons');

        this.start = makeDiv(null, 'title-button title-button-start');
        this.startlabel = makeDiv(null, 'title-button-label', 'Jouer');
        this.start.append(this.startlabel);

        this.credits = makeDiv(null, 'title-button title-button-credits');
        this.creditslabel = makeDiv(null, 'title-button-label', 'Crédits');
        this.credits.append(this.creditslabel);

        this.buttons.append(this.start, this.credits);
        this.buildinfos = makeDiv(null, 'title-build');
        this.buildinfoslabel = makeDiv(null, 'title-build-label', `version alpha - ${new Date().getFullYear()}`);
        this.buildinfos.append(this.buildinfoslabel);

        this.container.append(this.buttons, this.buildinfos);

        this.start.offsetWidth;
        this.credits.offsetWidth;
        this.buildinfos.offsetWidth;

        delay += 300;
        // For each button slide and increment the delay
        [this.start, this.credits].forEach((button) => {
            if (init) {
                wait(delay, () => { addClass(button, 'pop'); });
            } else {
                addClass(button, 'pop');
            }
            delay += 300;
        });

        if (init) {
            // Delay the build infos by 400 milliseconds for dramatic effects
            delay += 200;
            // Slide the build button
            wait(delay, () => {
                removeClass(this.letters, 'horizontal-bounce');
                addClass(this.buildinfos, 'pop');
                this.listen = true;
                this.callback();
            });
        } else {
            addClass(this.buildinfos, 'pop');
            this.listen = true;
            this.callback();
        }

        this.titlelisten = true;
        this.title.addEventListener('click', () => {
            if (this.titlelisten) {
                this.titlelisten = false;
                removeClass(this.title, 'slanted');
                wait(800, () => {
                    addClass(this.title, 'slanted');
                    wait(500, () => { this.titlelisten = true; });
                });
            }
        });

        this.startlabel.addEventListener('click', () => {
            if (this.listen) {
                this.listen = false;
                if (this.options.app.options.session.consent) {
                    if (this.options.app.options.session.form) {
                        removeClassList([this.letters, this.start, this.credits, this.buildinfos], 'pop');
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
                    } else {
                        addClass(this.startlabel, 'clicked');
                        this.next = new Form({ app: this.app, position: 'next', question: 0 });
                        this.slideNext();
                    }
                } else {
                    addClass(this.startlabel, 'clicked');
                    this.next = new Consent({ app: this.app, position: 'next' });
                    this.slideNext();
                }
            }
        });
    }
}

export default Title;