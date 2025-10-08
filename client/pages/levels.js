import Page from "./page";
import Title from "./title";

import { addClass, makeDiv, addClass, removeClass, wait, hasClass } from "../utils/dom";
import { easeInOutSine } from '../utils/math.js';
import { ExperiencePanel, NavigationBar, TierPanel, TutorialPanel } from "./tiers.js";

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
            wait(600, () => {
                this.listen = true;
                if (this.update && !this.app.debug) {
                    if (this.isLast()) {
                        if (this.finish) {
                            t.progress(true);
                        } else {
                            this.slide('next');
                        }
                    } else {
                        if (this.type === 'tier') {
                            t.progress(false);
                        }
                    }
                }
            });
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
            let choosecontainer = makeDiv(null, 'levels-rabbit-container');
            let choosewindow = makeDiv(null, 'levels-rabbit-window');
            choosecontainer.append(choosewindow);
            let chooselabel = makeDiv(null, 'levels-rabbit-label', 'Choisissez votre lapin');
            let chooserabbits = makeDiv(null, 'levels-rabbit-rabbits');

            let rabbitlist = [];
            this.params.game.colors.forEach(c => {
                let chooserabbit = makeDiv(null, 'levels-rabbit-individual');
                if (c === this.params.game.color) { addClass(chooserabbit, 'active'); }
                let chooseimage = document.createElement('img');
                let src = this.params.sprites[`rabbits:${c}_idle_east_0`]
                chooseimage.src = src;
                chooseimage.alt = 'Lapinou';
                chooserabbit.append(chooseimage);
                chooserabbits.append(chooserabbit);
                rabbitlist.push(chooserabbit);

                chooserabbit.addEventListener('click', () => {
                    if (!hasClass(chooserabbit)) {
                        rabbitlist.forEach(r => { removeClass(r, 'active'); })
                        addClass(chooserabbit, 'active');
                        this.image.src = src;
                        this.params.game.color = c;
                        localStorage.setItem('color', c);
                    }
                });
            });
            let choosebutton = makeDiv(null, 'levels-rabbit-button', 'Valider');
            choosewindow.append(chooselabel, chooserabbits, choosebutton);
            this.app.container.append(choosecontainer);

            choosewindow.offsetHeight;
            addClass(choosewindow, 'pop');

            choosebutton.addEventListener('click', () => {
                removeClass(choosewindow, 'pop');
                wait(300, () => {
                    choosecontainer.remove();
                    this.choose.addEventListener('click', chooseRabbit);
                });
            }, true);
        }

        this.choose.addEventListener('click', chooseRabbit);

        // Create the back button to get back to the title screen
        this.back = makeDiv(null, 'header-button', this.params.svgs.arrowleft);
        this.app.header.insert(this.back);
        this.back.offsetHeight;
        addClass(this.back, 'pop');
        this.back.addEventListener('click', () => {
            if (this.listen) {
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

    slide(direction) {
        if (this.listen) {
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
            });
        }
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
}

export default Levels;