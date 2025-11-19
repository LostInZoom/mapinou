import Basemap from '../cartography/map.js';
import Roamer from '../characters/roamer.js';
import Rabbits from '../layers/rabbits.js';

import Page from '../pages/page.js';
import Title from '../pages/title.js';

import { makeDiv, addClass, removeClass, wait } from '../utils/dom.js';
import { generateRandomInteger } from '../utils/math.js';
import { Header } from '../pages/elements.js';
import { Music, SoundEffects } from '../utils/soundbuttons.js';

class Application {
    constructor(options) {
        this.options = options;
        this.progression = options.progression;

        this.debug = false;
        // this.progression = { tier: 8, level: 3, finish: false };

        // Create the DOM Element
        this.container = makeDiv('application', null);
        document.body.append(this.container);

        this.mask = makeDiv(null, 'mask');
        this.loader = makeDiv(null, 'loader');
        this.mask.append(this.loader);
        this.container.append(this.mask);
        this.container.offsetHeight;

        // Display the loader
        this.loading();

        this.maxrabbit = 10;

        // Boolean to flag if the page is sliding
        this.sliding = false;

        this.header = new Header(this);
        this.header.setJustification('right');

        this.music = new Music({
            app: this,
            parent: this.header,
            svg: this.options.svgs.music,
            src: 'menu',
            format: 'mp3',
            loop: true
        });

        this.uipool = [
            'button1A', 'button2F', 'button3G', 'button4Bb',
            'button5Bb', 'button6F', 'button7D', 'button8C'
        ];
        this.soundpool = [];
        this.sounds = new SoundEffects({
            app: this,
            parent: this.header,
            svg: this.options.svgs.sound
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

                const audio = this.options.audio;
                this.music.display(() => {
                    if (audio.music && window.matchMedia('(display-mode: fullscreen)').matches) {
                        this.music.play();
                    }
                });
                this.sounds.display(() => {
                    if (audio.sounds) {
                        this.sounds.activate();
                        this.sounds.enableBirdSounds();
                    }
                });

                // Create the current page
                this.page = new Title({
                    app: this,
                    basemap: this.basemap,
                    position: 'current',
                    init: !this.debug
                });

                this.rabbits = new Rabbits({
                    id: 'menu-rabbits',
                    basemap: this.basemap,
                    protected: true
                });

                const mute = () => {
                    this.music.mute();
                    this.sounds.mute();
                }

                const unmute = () => {
                    this.music.unmute();
                    this.sounds.unmute();
                }

                window.addEventListener("focus", unmute);
                window.addEventListener("blur", mute);

                this.basemap.map.on('click', (e) => {
                    if (this.allowed) {
                        this.allowed = false;

                        if (this.rabbits.getNumber() >= this.maxrabbit) {
                            let first = this.rabbits.getCharacter(0);
                            first.despawn(() => { first.destroy(); });
                        }

                        // Display a special rabbit once out of 50 time
                        let color = 'random';
                        if (Math.random() < 1 / 50) {
                            let s = this.options.game.colors.specials;
                            color = s[generateRandomInteger(0, s.length - 1)][0];
                            this.sounds.playFile({ src: 'lapinou-end', volume: 0.6 });
                        } else {
                            this.sounds.playFile({ src: 'lapinou-happy', amount: 4, volume: 0.6 });
                        }

                        let roamer = new Roamer({
                            layer: this.rabbits,
                            coordinates: e.lngLat.toArray(),
                            color: color,
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

    isSliding() {
        return this.sliding;
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
        if (!this.isSliding()) {
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

    addSound(sound) {
        this.soundpool.push(sound);
        return this.soundpool.length - 1;
    }

    hasSounds() {
        return this.soundpool.length > 0;
    }

    pauseSounds() {
        this.soundpool.forEach(s => { s.pause(); });
    }

    playSounds() {
        this.soundpool.forEach(s => { s.play(); });
    }

    destroySounds() {
        this.soundpool.forEach(s => { s.destroy(); });
        this.soundpool = [];
    }

    getProgression(previous) {
        if (this.debug) { return { tier: 0, level: 0, finish: this.progression.finish }; }
        if (previous && !this.progression.finish) {
            if (this.progression.level === 0) {
                const l = this.options.levels[this.progression.tier - 1].type === 'tier' ? this.options.levels[this.progression.tier - 1].content.length - 1 : 0;
                return { tier: this.progression.tier - 1, level: l, finish: this.progression.finish }
            } else {
                return { tier: this.progression.tier, level: this.progression.level - 1, finish: this.progression.finish }
            }
        } else {
            return this.progression;
        }
    }

    getNumberProgression() {
        const p = this.progression;
        let total = 0;
        let position = 0;
        const tiers = this.options.levels;
        for (let t = 0; t < tiers.length; t++) {
            const tier = tiers[t];
            if (tier.type === 'tier') {
                for (let l = 0; l < tier.content.length; l++) {
                    if (p.tier === t && p.level === l) { position = total; }
                    ++total;
                }
            } else {
                if (p.tier === t) { position = total; }
                ++total;
            }
        }

        if (p.finish) { position = total; }
        return { total: total, position: position };
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