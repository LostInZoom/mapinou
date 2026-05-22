import { addClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
import { generateRandomInteger, weightedRandom } from "../utils/math";

class Hint {
    /**
     * Constructor for the Hint class. This object is used to display hints for the player during the phase 1 of a level.
     *
     * @param {Object} options - Options passed to the constructor.
     */
    constructor(options) {
        this.options = options;
        this.level = this.options.level;
        this.basemap = this.level.basemap;
        this.params = this.level.params;
        this.hints = this.level.parameters.hints;

        // Flag to check if the character is alive
        this.alive = true;
        // Current properties of the rabbit character
        this.state = 'idle';
        this.color = this.params.game.color;
        this.orientation = 'east';
        this.frame = 0;
        this.injured = false;
        this.transition = 300;

        // Text of the character bubble
        this.currentText = '';

        // DOM elements
        this.container = makeDiv(null, 'level-hint-container');
        this.character = makeDiv(null, 'level-hint-character hidden');
        this.charimage = document.createElement('img');
        this.charimage.src = this.params.sprites[`rabbits:${this.color}_${this.state}_${this.orientation}_${this.frame}`];
        this.charimage.alt = 'character';
        this.character.append(this.charimage);

        // Type of hint
        this.type = 'thought';
        this.container.append(this.character);

        // Create the bubble and append it to the DOM
        this.createBubble(this.type, '');
        this.level.container.append(this.container);

        this.listen = false;

        // Setuo the animation and start it
        this.startBlinkAnimation = 0;
        this.startFrameAnimation = 0;
        this.animateFrame();

        this.container.offsetWidth;
    }

    /**
     * Start the animation to walk the character into the map.
     */
    async walkIn() {
        this.setState('move');
        removeClass(this.character, 'hidden');
        await waitPromise(600);
        this.setState('idle');
        this.listen = true;
        this.basemap.render();
    }

    /**
     * Display the character bubble
     */
    async displayBubble() {
        addClass(this.bubble, 'pop');
        await waitPromise(this.transition);
    }

    /**
     * Hide the character bubble
     */
    async hideBubble() {
        removeClass(this.bubble, 'pop');
        await waitPromise(this.transition);
    }

    /**
     * Focus the bubble with a little animation
     */
    async focusBubble() {
        addClass(this.bubble, 'focus');
        await waitPromise(100);
        removeClass(this.bubble, 'focus');
        await waitPromise(this.transition);
    }

    /**
     * Focus the rabbit with a little animation
     */
    async focusRabbit() {
        addClass(this.charimage, 'focus');
        await waitPromise(100);
        removeClass(this.charimage, 'focus');
        await waitPromise(this.transition);
    }

    /**
     * Sets the text of the character bubble.
     * @param {string} text - The text to display in the bubble
     */
    setText(text) {
        this.currentText = text;
        this.bubble.innerHTML = text;
    }

    /**
     * Reload the character image sprite.
     */
    reload() {
        this.charimage.src = this.params.sprites[`rabbits:${this.color}_${this.state}_${this.orientation}_${this.frame}`];
    }

    /**
     * Set the rabbit sprite color.
     * @param {string} color - The new color of the rabbit 
     */
    setColor(color) {
        this.color = color;
        this.reload();
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
     * @param {string} color - The new frame of the sprite. 
     */
    setFrame(frame) {
        this.frame = frame;
        this.reload();
    }

    /**
     * Creates a bubble element with the given text and appends it to the hint container.
     * @param {string} text - The text to display in the bubble
     */
    createBubble(text) {
        this.bubble = makeDiv(null, 'level-hint-bubble', text);
        this.container.append(this.bubble);
        this.container.offsetWidth;
    }

    /**
     * Sets the type of the hint.
     * @param {string} type - The type of the hint
     */
    setType(type) {
        ['thought', 'lost', 'wrong'].forEach(c => removeClass(this.bubble, c));
        addClass(this.bubble, type);
        this.type = type;
    }

    /**
     * Updates the hint with the given type and text.
     * @param {string} type - The type of the hint
     * @param {string} text - The text to display in the bubble
     * @param {function} callback - The callback function to call after the update
     */
    async update(type, text, callback) {
        callback = callback || function () { };

        // If type is different from the current type
        if (type !== this.type) {
            // Set the type and text
            this.setType(type);
            this.setText(text);
            // Make the rabbit happy or hurting depending on the type
            if (type === 'thought') { this.squeek(); }
            else if (type === 'lost') { this.complain(); }
            else if (type === 'wrong') { this.complain(); }
            // Focus the rabbit
            this.focusRabbit();
            // Focus the bubble then callback
            await this.focusBubble();
            callback();
        }
        // If the type is the same
        else {
            // If type is thought
            if (this.type === 'thought') {
                // Reset the type just in case
                this.setType(type);
                // If the text is different
                if (text !== this.currentText) {
                    // Change the text, make the rabbit squeek and focus
                    this.setText(text);
                    this.squeek();
                    this.focusRabbit();
                    await this.focusBubble();
                    callback();
                }
                // If the text is the same, reset the text just in case
                else {
                    this.setText(text);
                    callback();
                }
            }
        }
    }

    /**
     * Activates the update listener.
     */
    activateUpdate() {
        // The actual update listener
        const updateListener = () => {
            // Check if the class is listening
            if (this.listen) {
                // Flag to know if the target player is visible with a 20px margin
                let visible = this.basemap.isVisible(this.level.parameters.player, 20);
                let zoom = this.basemap.getZoom();
                let [u, t, v] = [false, undefined, ''];
                // Loop through each hint
                for (let [m, h] of Object.entries(this.hints)) {
                    // If the target player is visible
                    if (!visible) {
                        // If the player target is not visible on the map
                        if (this.type !== 'lost') {
                            // Get a random comment from Lapinou
                            let l = this.params.game.lost;
                            u = true;
                            t = 'lost';
                            v = l[generateRandomInteger(0, l.length - 1)];
                            // Do not continue
                            break;
                        }
                    }
                    // Here, the target player is visible
                    else {
                        // If the zoom level is greater than or equal to the current hint, change hint
                        if (zoom >= m) {
                            u = true;
                            t = 'thought';
                            v = h;
                        }
                    }
                }

                // If rabbit and bubble need to be updated
                if (u) {
                    this.listen = false;
                    // Run the update animation
                    this.update(t, v, () => { this.listen = true; });
                }
            }
        }

        // Add the update listener on map rendering
        this.basemap.addListener('render', updateListener);
    }

    /**
     * Make the rabbit squeek sound
     */
    squeek() {
        this.level.app.sounds.playFile({ src: 'lapinou-happy', amount: 4, volume: 0.8 });
    }

    /**
     * Make the rabbit complain sound
     */
    complain() {
        this.level.app.sounds.playFile({ src: 'lapinou-hurt', amount: 3, volume: 0.8 });
    }

    /**
     * Make the rabbit found sound
     */
    found() {
        this.level.app.sounds.playFile({ src: 'lapinou-end', volume: 0.8 });
    }

    /**
     * Injure the rabbit when encountering a predator.
     * @param {number} blink - The duration of the blink in milliseconds
     * @param {function} callback - The callback function to call after the injury
     */
    injure(blink, callback) {
        callback = callback || function () { };
        // Store the original color of Lapinou
        const origin = this.color;
        // Store the start time
        const start = performance.now();

        let pursue = true;
        // Set the color to red
        this.setColor('red');
        let visible = false;
        // Stores the last blink time
        let lastBlink = start;

        // The blinking animation
        const animate = (time) => {
            // If the animation should continue
            if (pursue) {
                // If we need to change color for the blinking
                if (time - lastBlink >= blink) {
                    // Reverse the blink state
                    visible = !visible;
                    // Flip the color
                    this.setColor(visible ? origin : 'red');
                    // Store the current time of the blink
                    lastBlink = time;
                }
                // Continue the animation
                requestAnimationFrame(animate);
            } else {
                // Here, we stop the animation and reset the color
                this.setColor(origin);
            }
        };
        // Start the animation
        requestAnimationFrame(animate);

        // Check if the zoom level is equal or greater than the max zoom hint
        const rightzoom = this.basemap.getZoom() >= Math.max(...Object.keys(this.hints).map(Number));
        let value = '';
        // If it is, get a random wrong hint
        if (rightzoom) {
            let w = this.params.game.wrong.rightzoom;
            value = w[generateRandomInteger(0, w.length - 1)];
        }
        // If it's not, tell the player to continue zooming
        else {
            value = this.params.game.wrong.wrongzoom;
        }

        // Unlisten
        this.listen = false;
        // Update the rabbit with the new text bubble
        this.update('wrong', value, () => {
            // Wait for the animation to end depending on the zoom, and reactivate
            wait(rightzoom ? 1200 : 2000, () => {
                pursue = false;
                this.listen = true;
                this.basemap.render();
                callback();
            });
        });
    }

    /**
     * Animate the rabbit sprite
     */
    animateFrame() {
        this.startFrameAnimation = performance.now();
        let start = this.startFrameAnimation;
        // Set weights for different states
        const weights = [10, 1];
        const statespool = ['idle', 'graze'];

        // The animation
        const animation = () => {
            // Wait for the framerate
            wait(200, () => {
                // If the start time hasn't changed
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
     * End the rabbit hint character.
     * @param {function} callback - The callback function to call after the end
     */
    end(callback) {
        callback = callback || function () { };
        // If the rabbit is alive
        if (this.alive) {
            this.listen = false;
            // Remove all map listeners
            this.basemap.removeListeners();
            // Hide the character bubble and reset frame, orientation and state
            removeClass(this.bubble, 'pop');
            this.setFrame(0);
            this.setOrientation('west');
            this.setState('move');
            // Hide the character sprite
            addClass(this.character, 'hidden');
            // Wait for the animation before destroying
            wait(600, () => {
                this.container.remove();
                this.alive = false;
                callback();
            });
        } else {
            // Callback if not alive
            callback();
        }
    }
}

export default Hint;