import Basemap from '../cartography/map.js';
import Roamer from '../characters/roamer.js';
import Rabbits from '../layers/rabbits.js';

import Page from '../pages/page.js';
import Title from '../pages/title.js';

import { makeDiv, addClass, removeClass, wait, isAppInstalled } from '../utils/dom.js';
import { generateRandomInteger } from '../utils/math.js';
import { Header } from '../pages/elements.js';
import { Music, SoundEffects } from '../utils/soundbuttons.js';

class Application {
    /**
     * Constructor for the main Application class.
     * @param {object} options - Options for the application
     */
    constructor(options) {
        this.options = options;
        this.progression = options.progression;

        // Set debug mode
        this.debug = false;

        // Create the DOM Element
        this.container = makeDiv('application', null);
        document.body.append(this.container);

        // Create a mask with a loader
        this.mask = makeDiv(null, 'mask');
        this.loader = makeDiv(null, 'loader');
        this.mask.append(this.loader);
        this.container.append(this.mask);
        this.container.offsetHeight;

        // Display the loader
        this.loading();

        // Max allowed rabbits on the title screen
        this.maxrabbit = 10;

        // Boolean to flag if the page is sliding
        this.sliding = false;

        // Create the header
        this.header = new Header(this);
        this.header.setJustification('right');

        // Start the menu music
        this.music = new Music({
            app: this,
            parent: this.header,
            svg: this.options.svgs.music,
            src: 'menu',
            format: 'mp3',
            loop: true
        });

        // List of button sounds in order
        this.uipool = [
            'button1A', 'button2F', 'button3G', 'button4Bb',
            'button5Bb', 'button6F', 'button7D', 'button8C'
        ];
        // Storage for currently playing sound objects
        this.soundpool = [];

        // Initialize the object to play special effects sounds
        this.sounds = new SoundEffects({
            app: this,
            parent: this.header,
            svg: this.options.svgs.sound
        });

        // Choose a random map center
        let centers = this.options.interface.map.start.centers;
        let i = generateRandomInteger(0, centers.length - 1);
        this.center = centers[i];

        // Create the basemap
        this.basemap = new Basemap({
            app: this,
            parent: this.container,
            class: 'basemap',
            center: this.center,
            zoom: this.options.interface.map.start.zoom,
            // Map is not interctive on the title screen
            interactive: false
        }, () => {
            // Once the basemap is loaded, load the characters sprites
            this.basemap.loadSprites().then(() => {
                // Hide the loader
                this.loaded();
                // Allow rabbit creation
                this.allowed = true;

                // Display the sound and music buttons
                const audio = this.options.audio;
                this.music.display(() => {
                    // Play the music if previously playing and it is a PWA
                    if (audio.music && isAppInstalled()) {
                        this.music.play();
                    }
                });
                this.sounds.display(() => {
                    // Allow sound effects if previously selected
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

                // Create the rabbits layer
                this.rabbits = new Rabbits({
                    id: 'menu-rabbits',
                    basemap: this.basemap,
                    protected: true
                });

                /**
                 * Mute all sounds (music and sound effects).
                 */
                const mute = () => {
                    this.music.mute();
                    this.sounds.mute();
                }

                /**
                 * Unmute all sounds (music and sound effects).
                 */
                const unmute = () => {
                    this.music.unmute();
                    this.sounds.unmute();
                }

                // Mute sounds if the page is not visible and unmute if it is
                window.addEventListener("focus", unmute);
                window.addEventListener("blur", mute);

                // Create a click listener on the basemap to spawn rabbits
                this.basemap.map.on('click', (e) => {
                    // Make sure rabbit creation is allowed
                    if (this.allowed) {
                        // Prevent rabbit creation
                        this.allowed = false;

                        // If too many rabbits, remove the oldest
                        if (this.rabbits.getNumber() >= this.maxrabbit) {
                            let first = this.rabbits.getCharacter(0);
                            // Despawn the oldest rabbit then destroy it
                            first.despawn(() => { first.destroy(); });
                        }

                        // Display a special rabbit once out of 50 time
                        let color = 'random';
                        if (Math.random() < 1 / 50) {
                            // Select a special fur color and special sound
                            let s = this.options.game.colors.specials;
                            color = s[generateRandomInteger(0, s.length - 1)][0];
                            this.sounds.playFile({ src: 'lapinou-end', volume: 0.6 });
                        } else {
                            // Regular rabbit sound
                            this.sounds.playFile({ src: 'lapinou-happy', amount: 4, volume: 0.6 });
                        }

                        // Create the rabbit at the right position with the wanted fur color
                        let roamer = new Roamer({
                            layer: this.rabbits,
                            coordinates: e.lngLat.toArray(),
                            color: color,
                        });

                        // Spawn the rabbit
                        roamer.spawn(() => {
                            // Reallow rabbit creation
                            this.allowed = true;
                            // Make the current rabbit roam around
                            roamer.roam();
                        });
                    }
                });
            });
        });
    }

    /**
     * Check if the application is currently sliding between pages.
     * @return {boolean} true if the application is sliding, false otherwise
     */
    isSliding() {
        return this.sliding;
    }

    /**
     * Slide the current page out and replace it with the given page.
     *
     * @param {object} options - Options for the slide
     * @param {string} options.position - The direction of the slide ('previous' or 'next')
     * @param {Page} options.page - The page to slide in
     * @param {function} [callback] - A callback function to be called when the slide is finished
     */
    slide(options, callback) {
        callback = callback || function () { };

        // Make sure the page isn't sliding
        if (!this.isSliding()) {
            // Current page is sliding
            this.sliding = true;

            // Slide the map depending on the direction
            if (options.position === 'previous') { this.basemap.slide('right'); }
            else { this.basemap.slide('left'); }

            // Change pages position
            this.page.setPosition(options.position);
            options.page.setPosition('current');

            // Wait for the sliding animation
            wait(this.options.interface.transition.page, () => {
                // Destroy the current page
                this.page.destroy();
                // Replace the current page with the new one
                this.page = options.page;
                this.sliding = false;
                callback();
            })
        }
    }

    /**
     * Allow the creation of new rabbits on the map.
     */
    allowRabbits() {
        this.allowed = true;
    }

    /**
     * Prevent the creation of new rabbits on the map.
     */
    forbidRabbits() {
        this.allowed = false;
    }

    /**
     * Check if there are rabbits on the map.
     * @return {boolean} true if there are rabbits, false otherwise
     */
    hasRabbits() {
        if (this.rabbits.getNumber() > 0) { return true; }
        else { return false; }
    }

    /**
     * Destroy all rabbits on the map.
     * This function will despawn all rabbits and wait for them to be removed from the map.
     * After all rabbits have been despanwed, this function will destroy the rabbits layer.
     */
    killRabbits() {
        this.rabbits.despawnCharacters(() => {
            this.rabbits.destroy();
        });
    }

    /**
     * Display the loader in front of the pages
     */
    loading() {
        removeClass(this.mask, 'loaded');
    }

    /**
     * Hide the loader in front of the pages
     */
    loaded() {
        addClass(this.mask, 'loaded');
    }

    /**
     * Add a sound to the application's sound pool.
     * @param {Sound} sound - The sound to add to the sound pool
     * @return {number} The index of the sound in the sound pool
     */
    addSound(sound) {
        this.soundpool.push(sound);
        return this.soundpool.length - 1;
    }

    /**
     * Check if the application has any sounds in its sound pool.
     * @return {boolean} True if the application has any sounds, false otherwise.
     */
    hasSounds() {
        return this.soundpool.length > 0;
    }

    /**
     * Pause all sounds in the sound pool.
     */
    pauseSounds() {
        this.soundpool.forEach(s => { s.pause(); });
    }

    /**
     * Play all sounds in the sound pool.
     */
    playSounds() {
        this.soundpool.forEach(s => { s.play(); });
    }

    /**
     * Destroys all sounds in the sound pool, and empty the sound pool
     */
    destroySounds() {
        this.soundpool.forEach(s => { s.destroy(); });
        this.soundpool = [];
    }

    /**
     * Return the player's progression in the game.
     * @param {object} [previous] - If we ask for the previous level instead of the current.
     * @return {object} An object containing the progression.
     */
    getProgression(previous) {
        // Return the start if debug mode
        if (this.debug) { return { tier: 0, level: 0, finish: this.progression.finish }; }

        // If we ask for the previous level and the game isn't finished
        if (previous && !this.progression.finish) {
            // If it's the first level of the tier
            if (this.progression.level === 0) {
                // Return the last level of the previous tier
                const l = this.options.levels[this.progression.tier - 1].type === 'tier' ? this.options.levels[this.progression.tier - 1].content.length - 1 : 0;
                return { tier: this.progression.tier - 1, level: l, finish: this.progression.finish }
            } else {
                // Return the previous level
                return { tier: this.progression.tier, level: this.progression.level - 1, finish: this.progression.finish }
            }
        } else {
            // Return the current progression
            return this.progression;
        }
    }

    /**
     * Return the total number of levels in the game regardless of tiers and the player's position.
     * @return {object} An object containing the total number of levels and the position of the player.
     */
    getNumberProgression() {
        const p = this.progression;
        let total = 0;
        let position = 0;

        // Loop through tiers
        const tiers = this.options.levels;
        for (let t = 0; t < tiers.length; t++) {
            const tier = tiers[t];

            // If it's actually a tier (not an experience)
            if (tier.type === 'tier') {
                // Loop through levels
                for (let l = 0; l < tier.content.length; l++) {
                    // If player is here, set the position and increment total
                    if (p.tier === t && p.level === l) { position = total; }
                    ++total;
                }
            } else {
                // If player is here, set the position and increment total
                if (p.tier === t) { position = total; }
                ++total;
            }
        }

        // If the player has finished the game, position = total
        if (p.finish) { position = total; }
        return { total: total, position: position };
    }

    /**
     * Increment the player's progress in the game.
     * If the player has finished the level, it will move on to the next level.
     * If the player has finished the tier, it will move on to the next tier.
     * If the player has finished the game, it will set the finish flag.
     */
    progress() {
        // If we're not in debug mode do something
        if (!this.debug) {
            let t = this.progression.tier;
            let l = this.progression.level;
            const tier = this.options.levels[t];
            let finish = t >= this.options.levels.length - 1 && l >= tier.content.length - 1;

            // If current tier is actually a tier
            if (tier.type === 'tier') {
                // Make sure the game wasn't finished
                if (!finish) {
                    // Change tier if we're at the last level
                    if (l >= tier.content.length - 1) {
                        this.progression.tier = t + 1;
                        this.progression.level = 0;
                    }
                    // Or change level
                    else {
                        this.progression.level = l + 1;
                    }
                }
            }
            // Here, it's an experience or tutorial
            else {
                // Increment tier
                this.progression.tier = t + 1;
                this.progression.level = 0;
            }

            // Update progression in local storage
            localStorage.setItem('tier', this.progression.tier);
            localStorage.setItem('level', this.progression.level);

            // Update finish state
            this.progression.finish = finish;
            localStorage.setItem('finish', finish);
        }
    }
}

export default Application;