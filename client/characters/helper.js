import { easeOutQuint, generateRandomInteger } from "../utils/math.js";
import Character from "../characters/character.js";
import { wait } from "../utils/dom.js";

class Helper extends Character {
    /**
     * Helper class used to display and animate vegetables during a game
     * @param {Object} options 
     */
    constructor(options) {
        super(options);

        this.size = 64;
        this.visible = false;

        // Available vegetable types
        this.types = [
            'leek', 'cabbage', 'chard', 'broccoli', 'radish',
            'turnip', 'zucchini', 'beet', 'squash', 'butternut'
        ]

        // Randomize vegetable type on creation
        this.type = this.types[generateRandomInteger(0, 9)];
        // Set opacity to 0 if outside the visible range
        this.opacity = this.layer.basemap.getZoom() < this.params.game.routing.minzoom ? 0 : 1;

        // Set up feature properties
        this.feature.properties.type = this.type;
        this.feature.properties.scale = this.scale;
        this.feature.properties.opacity = this.opacity;

        this.layer.addCharacter(this);
    }

    /**
     * Set the type of vegetable
     * @param {string} type 
     */
    setType(type) {
        this.type = type;
        this.feature.properties.type = type;
        this.layer.updateSource();
    }

    /**
     * Toggle visibility of the sprite
     * @param {boolean} visibility 
     */
    setVisibility(visibility) {
        this.visible = visibility;
    }

    /**
     * Display the vegetable by animating its opacity
     * @param {Function} callback 
     */
    reveal(callback) {
        this.animateOpacity({
            value: 1
        }, callback);
    }

    /**
     * Hide the vegetable by animating its opacity
     * @param {Function} callback 
     */
    hide(callback) {
        this.animateOpacity({
            value: 0
        }, callback);
    }

    /**
     * Check whether the vegetable is currently visible
     * @returns {boolean}
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Consume the vegetable, play the sound then animate it and finally destroy it
     */
    consume() {
        // Deactivate it
        this.deactivate();

        // Play the sound
        this.app.sounds.playFile({
            src: 'crounch',
            format: 'mp3',
            amount: 3,
            volume: 0.5
        });

        // Animate the scale to x1.5
        this.animateScale({
            value: 1.5,
            duration: 100,
            easing: easeOutQuint
        }, () => {
            wait(200, () => {
                this.despawn(() => {
                    this.destroy();
                });
            })
        })
    }

    /**
     * Animate the opacity of the vegetable
     * @param {Object} options 
     * @param {Function} callback 
     */
    animateOpacity(options, callback) {
        callback = callback || function () { };

        // Get the target value
        const value = options.value;
        // Store the time
        const start = performance.now();
        this.startOpacityAnimation = start;

        // Get the starting value
        const origin = this.opacity;
        // Animation duration
        const duration = options.duration || 300;
        // Animation easing function
        const easing = options.easing || (x => x);

        const animation = (time) => {
            // If the start time has changed, it means the animation has started again
            // or has been stopped, thus we don't continue
            if (this.startOpacityAnimation === start) {
                // Calculate the new opacity value
                const elapsed = time - start;
                const t = Math.min(Math.max(elapsed / duration, 0), 1);
                const eased = easing(t);
                const opacity = origin + (value - origin) * eased;
                this.setOpacity(opacity);
                // Continue animation if target value has not been reached
                if (t < 1) {
                    requestAnimationFrame(animation);
                } else {
                    this.setOpacity(value);
                    callback();
                }
            } else {
                callback();
            }
        };

        // Launch the animation on the next frame
        requestAnimationFrame(animation);
    }
}

export default Helper;