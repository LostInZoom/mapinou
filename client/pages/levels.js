import Page from "./page";
import Title from "./title";
import Selection from "./selection.js";
import Ending from "./ending.js";

import { addClass, makeDiv, addClass, removeClass, wait } from "../utils/dom";
import { easeInOutSine } from '../utils/math.js';
import { ExperiencePanel, NavigationBar, TierPanel, TutorialPanel } from "./tiers.js";
import { ajaxPost } from "../utils/ajax.js";

class Levels extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.listen = false;
        this.init = options.init ?? true;
        this.update = options.update ?? false;

        this.app.forbidRabbits();
        addClass(this.container, 'page-levels');
        this.levels = this.app.options.levels;
        this.progression = this.app.getProgression(this.update);

        this.position = this.progression.tier;
        this.level = this.progression.level;
        this.finish = this.progression.finish;

        this.tier = this.getTierContent();
        this.type = this.tier.type;

        this.navigation = new NavigationBar({ page: this });
        this.current = this.createTier({
            type: this.type,
            position: 'current',
            animate: this.init,
            update: this.update,
            finish: this.finish
        }, (t) => {
            if (this.update && !this.app.debug) {
                wait(600, () => {
                    if (this.isLast()) {
                        if (this.finish) {
                            t.progress(true, () => {
                                // END GAME HERE
                                this.hide(() => {
                                    this.destroy();
                                    this.app.page = new Ending({ app: this.app, position: 'current' });
                                });
                            });
                        } else {
                            this.slide('next', () => {
                                this.unlockRabbit();
                            });
                        }
                    } else {
                        if (this.type === 'tier') {
                            t.progress(false, () => {
                                this.unlockRabbit();
                            });
                        }
                    }
                });
            } else {
                this.listen = true;
            }
        });

        this.choose = makeDiv(null, 'header-button rabbit-button left');
        this.image = document.createElement('img');
        this.image.src = this.params.sprites[`rabbits:${this.params.game.color}_idle_east_0`];
        this.image.alt = 'Lapinou';
        this.choose.append(this.image);

        this.app.header.insert(this.choose);
        this.choose.offsetHeight;
        addClass(this.choose, 'pop');

        const chooseRabbit = () => {
            this.choose.removeEventListener('click', chooseRabbit);
            this.listen = false;
            this.listenRabbit = true;

            addClass(this.choose, 'clicked');
            this.choose.addEventListener('animationend', () => { removeClass(this.choose, 'clicked'); });
            this.playButtonSound();

            let content = makeDiv(null, 'page-content rabbits');
            let back = makeDiv(null, 'page-button page-button-back', 'Annuler');
            let pursue = makeDiv(null, 'page-button page-button-continue', 'Valider');
            let text = makeDiv(null, 'custom-text');
            content.append(back, text, pursue);

            this.container.append(content);
            let selection = new Selection({ page: this, parent: text });

            content.offsetWidth;
            addClass(content, 'pop');

            wait(300, () => {
                addClass(back, 'pop');
                addClass(pursue, 'pop');

                const closeWindow = () => {
                    removeClass(content, 'pop');
                    wait(300, () => {
                        content.remove();
                        this.listen = true;
                        this.choose.addEventListener('click', chooseRabbit);
                    });
                };

                back.addEventListener('click', () => {
                    if (this.listenRabbit) {
                        this.listenRabbit = false;
                        this.playButtonSound();
                        closeWindow();
                    }
                }, { once: true });

                pursue.addEventListener('click', () => {
                    if (this.listenRabbit) {
                        this.listenRabbit = false;
                        this.playButtonSound();
                        const [color, name] = selection.getValues();
                        this.params.game.color = color;
                        localStorage.setItem('color', color);
                        this.image.src = this.params.sprites[`rabbits:${color}_idle_east_0`];

                        if (name !== this.params.session.name) {
                            ajaxPost('rename/', { index: this.params.session.index, name: name }, (data) => {
                                if (data.done) {
                                    this.params.session.name = name;
                                    localStorage.setItem('name', name);
                                }
                                closeWindow();
                            });
                        } else { closeWindow(); }
                    }
                }, { once: true });
            });
        }

        this.choose.addEventListener('click', chooseRabbit);

        // Create the back button to get back to the title screen
        this.back = makeDiv(null, 'header-button', this.params.svgs.arrowleft);
        this.app.header.insert(this.back);
        this.back.offsetHeight;
        addClass(this.back, 'pop');
        this.back.addEventListener('click', () => {
            if (this.listen) {
                this.playButtonSound();
                this.listen = false;
                this.hide(() => {
                    this.destroy();
                    this.options.app.basemap.fly({
                        center: this.app.center,
                        zoom: this.params.interface.map.start.zoom,
                        easing: easeInOutSine
                    }, () => {
                        this.app.page = new Title({ app: this.app, position: 'current' });
                    });
                });
            }
        }, true);
    }

    hide(callback) {
        callback = callback || function () { };
        removeClass(this.back, 'pop');
        removeClass(this.choose, 'pop');
        this.navigation.hide();
        this.current.hide();
        wait(500, () => {
            this.back.remove();
            this.choose.remove();
            callback();
        });
    }

    listening() {
        return this.listen;
    }

    getProgression() {
        return this.progression;
    }

    getNumber() {
        return this.levels.length;
    }

    getPosition() {
        return this.position;
    }

    getTierContent() {
        return this.levels[this.position];
    }

    isLast() {
        if (this.type !== 'tier') { return true; }
        else {
            if (this.getTierContent().content.length - 1 === this.progression.level) {
                return true;
            } else {
                return false;
            }
        }
    }

    slide(direction, callback) {
        callback = callback || function () { };

        // Flag to know direction
        const isPrevious = direction === 'previous';

        // Return if we're at the first or last position (shouldn't be reached as buttons shouldn't be available)
        if (isPrevious && this.position === 0) { return; }
        else if (!isPrevious && this.position >= this.levels.length - 1) { return; }

        this.listen = false;

        if (this.current.getType() === 'tier') { this.current.unobserveSize(); }
        this.position = isPrevious ? this.position - 1 : this.position + 1;
        const obj = this.createTier({
            type: this.getTierContent().type,
            position: direction,
            animate: false,
            update: false,
            finish: this.finish
        });
        obj.slideIn();

        this.navigation.slide(direction);
        this.current.slideOut(isPrevious ? 'next' : 'previous', () => {
            this.current.destroy();
            this.current = obj;
            this.listen = true;
            callback();
        });
    }

    createTier(options, callback) {
        callback = callback || function () { };
        this.progression = this.app.getProgression(options.update);
        if (options.type === 'tier') {
            let tier = new TierPanel({
                page: this,
                tier: this.position,
                level: this.level,
                animate: options.animate,
                position: options.position,
                update: options.update,
                finish: options.finish
            }, (t) => { callback(t); });
            return tier;
        }
        else if (options.type === 'experience') {
            let experience = new ExperiencePanel({
                page: this,
                number: this.position,
                animate: options.animate,
                position: options.position,
                update: options.update
            }, (e) => { callback(e); });
            return experience;
        }
        else if (options.type === 'tutorial') {
            let experience = new TutorialPanel({
                page: this,
                number: this.position,
                content: this.level,
                animate: options.animate,
                position: options.position,
                update: options.update
            }, (e) => { callback(e); });
            return experience;
        }
    }

    unlockRabbit() {
        let prog = this.app.getProgression(false);

        this.listen = false;
        let found = false;

        this.params.game.colors.specials.forEach(s => {
            const [color, threshold] = s;
            if (prog.tier === threshold && prog.level === 0) {
                found = true;
                let container = makeDiv(null, 'unlock-container');
                let window = makeDiv(null, 'unlock-window');
                let text = makeDiv(null, 'unlock-text', "Vous avez débloqué un nouveau pelage pour Lapinou !");

                let rabbit = makeDiv(null, 'unlock-rabbit');
                let lock = makeDiv(null, 'unlock-rabbit-lock', this.params.svgs.lock);
                rabbit.append(lock);
                let image = document.createElement('img');
                let src = this.params.sprites[`rabbits:${color}_idle_east_0`];
                image.src = src;
                image.alt = 'Lapinou';
                rabbit.append(image);

                let button = makeDiv(null, 'unlock-button', 'Super !');

                window.append(text, rabbit, button);
                container.append(window);
                this.container.append(container);
                container.offsetWidth;

                addClass(window, 'pop');
                wait(600, () => {
                    addClass(lock, 'unlock');
                    button.addEventListener('click', () => {
                        this.playButtonSound();
                        removeClass(window, 'pop');
                        wait(300, () => {
                            container.remove();
                            this.listen = true;
                        });
                    }, { once: true });
                });
            }
        });

        if (!found) { this.listen = true; }
    }
}

export default Levels;