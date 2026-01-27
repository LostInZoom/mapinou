import { makeDiv, wait } from "../utils/dom";

class Campfire {
    /**
     * Creates a new Campfire object.
     * @param {Object} options - options object.
     * @param {Page} options.page - the page object.
     * @param {HTMLElement} options.parent - the parent element.
     */
    constructor(options) {
        this.options = options;
        this.page = this.options.page;
        this.parent = this.options.parent;

        // Sprite parameters for the campfire
        this.frame = 0;
        this.framenumber = 5;
        this.framerate = 100;

        // Create the character
        this.character = makeDiv(null, 'credits-campfire');
        this.charimage = document.createElement('img');
        this.reload();
        this.charimage.alt = 'campfire';
        this.character.append(this.charimage);

        this.parent.append(this.character);

        // Animate the character sprite
        this.animateFrame();
        this.character.offsetWidth;
    }

    /**
     * Reloads the character sprite
     */
    reload() {
        this.charimage.src = this.page.params.sprites[`fire:${this.frame}`];
    }

    /**
     * Sets the current frame for the campfire sprite and reloads the image.
     * @param {int} frame - the frame number to set.
     */
    setFrame(frame) {
        this.frame = frame;
        this.reload();
    }

    /**
     * Stops the animation of the campfire sprite.
     */
    destroy() {
        this.startFrameAnimation = 0;
    }

    /**
     * Starts the infinite animation of the campfire sprite.
     */
    animateFrame() {
        // Stores the time
        this.startFrameAnimation = performance.now();
        let start = this.startFrameAnimation;

        // The animation loop
        const animation = () => {
            // Wait for the framerate
            wait(this.framerate, () => {
                // If the start time hasn't changed
                if (start === this.startFrameAnimation) {
                    // Recalculate the frame
                    this.frame = (this.frame + 1) % this.framenumber;
                    this.reload();
                    // Continue the animation
                    requestAnimationFrame(animation);
                }
            });
        };

        // Start the animation
        requestAnimationFrame(animation);
    }
}

export default Campfire;