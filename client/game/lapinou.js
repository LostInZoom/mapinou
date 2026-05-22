import { addClass, makeDiv, removeClass, wait } from "../utils/dom";
import { weightedRandom } from "../utils/math";

class Lapinou {
    /**
     * Constructor for the Lapinou class. It is used as a transition before the ending of the game.
     * @param {Object} options - Object with specific properties.
     */
    constructor(options) {
        this.options = options;
        this.page = this.options.page;
        this.params = this.page.params;
        this.parent = this.options.parent;
        this.color = this.options.color;

        // Flag to check if Lapinou is alive
        this.alive = true;
        // Stores sprite properties
        this.color = this.color;
        this.state = 'idle';
        this.orientation = 'east';
        this.frame = 0;
        this.framenumber = 4;
        this.framerate = 200;

        // DOM elements
        this.container = makeDiv(null, 'bunny-container');
        this.character = makeDiv(null, 'bunny-character');
        this.charimage = document.createElement('img');
        this.reload();
        this.charimage.alt = 'lapinou';
        this.character.append(this.charimage);
        this.container.append(this.character);

        this.parent.append(this.container);
        // Start the sprite animation
        this.animateFrame();
        this.container.offsetWidth;
    }

    /**
     * Make Lapinou walk in
     */
    async walkIn() {
        // Make Lapinou face towards you, and start moving
        this.setOrientation('south');
        this.setState('move');
        // The move animation (simple css transition)
        addClass(this.container, 'walk-in');
        // Wait for the css animation to finish
        await new Promise(resolve => {
            this.container.addEventListener('transitionend', () => {
                // Set Lapinou to idle state
                this.setState('idle');
                resolve();
            }, { once: true });
        });
    }

    /**
     * Make Lapinou walk out
     */
    async walkOut() {
        // Make Lapinou face towards you, and start moving
        this.setOrientation('south');
        this.setState('move');
        // The move animation (simple css transition)
        addClass(this.container, 'walk-out');
        // Wait for the css animation to finish
        await new Promise(resolve => {
            this.container.addEventListener('transitionend', () => {
                resolve();
            }, { once: true });
        });
    }

    /**
     * Reload the sprite
     */
    reload() {
        this.charimage.src = this.params.sprites[`rabbits:${this.color}_${this.state}_${this.orientation}_${this.frame}`];
    }

    /**
     * Set the rabbit sprite state.
     * @param {string} state - The new state of the rabbit 
     */
    setState(state) {
        this.state = state;
        this.reload();
    }

    /**
     * Set the rabbit sprite orientation.
     * @param {string} orientation - The new orientation of the rabbit 
     */
    setOrientation(orientation) {
        this.orientation = orientation;
        this.reload();
    }

    /**
     * Set the rabbit sprite frame number.
     * @param {string} frame - The new frame of the sprite. 
     */
    setFrame(frame) {
        this.frame = frame;
        this.reload();
    }

    /**
     * Animate the rabbit sprite
     */
    animateFrame() {
        this.startFrameAnimation = performance.now();
        let start = this.startFrameAnimation;
        // Define the pool of states with custom weights
        const weights = [10, 1];
        const statespool = ['idle', 'graze'];
        // The animation
        const animation = () => {
            // Wait for the framerate
            wait(200, () => {
                // Check that the animaion hasn't been stopped
                if (start === this.startFrameAnimation) {
                    // Recalculate the frame
                    this.frame = (this.frame + 1) % 4;
                    // If frame is 0, choose a weighted random state
                    if (this.frame === 0 && statespool.includes(this.state)) { this.state = weightedRandom(statespool, weights.slice()); }
                    // Reload and continue the animation
                    this.reload();
                    requestAnimationFrame(animation);
                }
            });
        };
        // Start the animation
        requestAnimationFrame(animation);
    }

    /**
     * Destroy the sprite
     */
    destroy() {
        this.startFrameAnimation = 0;
        this.container.remove();
    }
}

export default Lapinou;