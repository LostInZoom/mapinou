import Page from '../pages/page.js';
import { makeDiv, addClass, removeClass, wait } from '../utils/dom.js';
import Basemap from '../cartography/map.js';
import { generateRandomInteger } from '../utils/math.js';
import { Header } from '../pages/elements.js';

import Title from '../pages/title.js';
import Roamer from '../characters/roamer.js';
import { Music, SoundEffects } from '../utils/soundbuttons.js';
import Rabbits from '../layers/rabbits.js';

class Application {
    constructor(options) {
        this.options = options;
        this.progression = options.progression;

        this.debug = true;
        // this.progression = { tier: 8, level: 3, finish: false };

        // Create the DOM Element
        this.container = makeDiv('application', null);
        document.body.append(this.container);

        this.mask = makeDiv(null, 'mask');
        this.loader = makeDiv(null, 'loader');
        this.mask.append(this.loader);
        this.container.append(this.mask);

        // Display the loader
        this.loading();

        this.maxrabbit = 5;

        // Boolean to flag if the page is sliding
        this.sliding = false;

        this.header = new Header(this);
        this.header.setJustification('right');

        this.music = new Music({
            parent: this.header,
            svg: this.options.svgs.music,
            src: 'menu',
            format: 'mp3',
        });

        this.sounds = new SoundEffects({
            parent: this.header,
            svg: this.options.svgs.sound,
        });

        let centers = this.options.interface.map.start.centers;
        let i = generateRandomInteger(0, centers.length - 1);
        this.center = centers[i];

        this.basemap = new Basemap({
            app: this,
            parent: this.container,
            class: 'basemap',
            center: this.center,
            zoom: this.options.interface.map.start.zoom,
            interactive: false
        }, () => {
            this.basemap.loadSprites().then(() => {
                this.loaded();
                this.allowed = true;

                // Create the current page
                this.page = new Title({
                    app: this,
                    basemap: this.basemap,
                    position: 'current',
                    // init: true
                }, () => {
                    this.music.display(true);
                    this.sounds.display(false);
                });

                this.rabbits = new Rabbits({
                    id: 'menu-rabbits',
                    basemap: this.basemap,
                    protected: true
                });

                this.basemap.map.on('click', (e) => {
                    if (this.allowed) {
                        this.allowed = false;

                        if (this.rabbits.getNumber() >= this.maxrabbit) {
                            let first = this.rabbits.getCharacter(0);
                            first.despawn(() => { first.destroy(); });
                        }

                        let roamer = new Roamer({
                            layer: this.rabbits,
                            coordinates: e.lngLat.toArray(),
                            color: 'random',
                        });

                        roamer.spawn(() => {
                            this.allowed = true;
                            roamer.roam();
                        });
                    }
                });
            });
        });
    }

    /**
     * 
     * @param {str} position - New position of the current page
     * @param {Page} page - The new page to display
     * @param {*} callback 
     */
    slide(options, callback) {
        callback = callback || function () { };

        // Make sure the page isn't sliding
        if (!this.sliding) {
            this.sliding = true;

            if (options.position === 'previous') { this.basemap.slide('right'); }
            else { this.basemap.slide('left'); }

            this.page.setPosition(options.position);
            options.page.setPosition('current');

            wait(this.options.interface.transition.page, () => {
                this.page.destroy();
                this.page = options.page;
                this.sliding = false;
                callback();
            })
        }
    }

    allowRabbits() {
        this.allowed = true;
    }

    forbidRabbits() {
        this.allowed = false;
    }

    hasRabbits() {
        if (this.rabbits.getNumber() > 0) { return true; }
        else { return false; }
    }

    killRabbits() {
        this.rabbits.despawnCharacters(() => {
            this.rabbits.destroy();
        });
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }

    getProgression(previous) {
        if (this.debug) { return { tier: 8, level: 3, finish: this.progression.finish }; }
        if (previous && !this.progression.finish) {
            if (this.progression.level === 0) {
                return { tier: this.progression.tier - 1, level: 0, finish: this.progression.finish }
            } else {
                return { tier: this.progression.tier, level: this.progression.level - 1, finish: this.progression.finish }
            }
        } else {
            return this.progression;
        }
    }

    progress() {
        if (!this.debug) {
            let t = this.progression.tier;
            let l = this.progression.level;
            const tier = this.options.levels[t];
            let finish = t >= this.options.levels.length - 1 && l >= tier.content.length - 1;

            if (tier.type === 'tier') {
                if (!finish) {
                    if (l >= tier.content.length - 1) {
                        this.progression.tier = t + 1;
                        this.progression.level = 0;
                    } else {
                        this.progression.level = l + 1;
                    }
                }
            } else {
                this.progression.tier = t + 1;
                this.progression.level = 0;
            }
            localStorage.setItem('tier', this.progression.tier);
            localStorage.setItem('level', this.progression.level);

            this.progression.finish = finish;
            localStorage.setItem('finish', finish);
        }
    }
}

export default Application;