import { Header } from "../pages/elements";
import { addClass, hasClass, makeDiv, removeClass, wait } from "../utils/dom";
import { calculateTextSize } from "../utils/parse";

class Score {
    /**
     * Class that is used to create and manage the scoring system
     * of the game. It handles the display of the score and point incrementation
     * @param {Object} options 
     */
    constructor(options) {
        this.parent = options.parent;
        this.level = options.level;
        this.params = this.level.options.app.options;

        // Score value, defulat to 0
        this.value = options.value || 0;
        // Available states of the score
        this.states = options.states || ['stopped', 'default', 'movement'];
        // Modifiers that in/decrement the score
        this.modifiers = options.modifiers || ['enemies', 'helpers', 'position']
        // Default state to stopped
        this.state = options.state || 'stopped'

        // Flag to see if the score is running
        this.running = false;

        // Storage for the interval function that increment the score
        this.interval;

        // DOM elements of the score
        this.container = makeDiv(null, 'score-container stop');
        this.text = makeDiv(null, 'score-text');
        this.textcontainer = makeDiv(null, 'score-text-container');
        this.textcontainer.append(this.text);
        this.container.append(this.textcontainer);

        // If the score is added to the Header of the app, insert it at a specified location
        if (this.parent instanceof Header) { this.parent.insertAtIndex(this.container, 2); }
        else { this.parent.append(this.container); }

        // Set to current state (stopped)
        this.setState(this.state);
        // Set the score to 0
        this.update(0);
    }

    /**
     * Get the current score
     * @returns {int} score
     */
    get() {
        return this.value;
    }

    /**
     * Adds a modifiers to the score
     * @param {string} name 
     */
    addModifier(name) {
        // Checks that the modifiers is in the list
        if (this.modifiers.includes(name)) {
            // Get the modifier value
            let value = this.params.game.score.modifier[name]
            // Set a + sign to the text if the score is > 0
            let text = (value >= 0) ? `+${value}` : `${value}`;
            let modifier = makeDiv(null, 'score-modifier ' + name, text);
            this.container.append(modifier);
            modifier.offsetHeight;

            // Display the modifier
            addClass(modifier, 'reveal');
            wait(1000, () => {
                // Hide the modifier after one second
                removeClass(modifier, 'reveal');
                // Wait for the modifier to be hidden
                wait(300, () => {
                    modifier.remove();
                    // Update the score by the modifier
                    this.update(this.params.game.score.modifier[name]);
                    // Display the animation the modifier being added
                    addClass(this.textcontainer, name);
                    wait(300, () => {
                        this.modifiers.forEach(m => { removeClass(this.textcontainer, m); });
                    });
                })
            })
        }
    }

    /**
     * Get the left position of the score on the page
     * @returns {Numeric}
     */
    getLeftPosition() {
        return this.container.getBoundingClientRect().left;
    }

    /**
     * Starts the score incrementation
     */
    start() {
        // If the state is stopped, set to default
        if (this.state === 'stopped') { this.setState('default'); }
        // Stop the score
        this.stop();

        removeClass(this.container, 'stop');
        this.running = true;
        // Get the increment and refresh rate values for the current state
        this.increment = this.params.game.score.increment[this.state];
        this.refresh = this.params.game.score.refresh[this.state];

        // Create the interval function
        this.interval = setInterval(() => {
            // Update the score by the increment and animate the score container
            this.update(this.increment);
            this.animate();
        }, this.refresh);
    }

    /**
     * Stop the score incrementation
     */
    stop() {
        // Clear the interval function if it exists
        if (this.interval !== undefined) { clearInterval(this.interval); }
        // Stop running
        this.running = false;
        addClass(this.container, 'stop');
    }

    /**
     * Reset the score to 0
     */
    reset() {
        this.value = 0;
    }

    /**
     * Update the score with a new value
     * @param {int} value 
     */
    update(value) {
        // Prevent negative score
        if (this.value + value > 0) { this.value += value; }
        else { this.value = 0 }
        // Change the displayed score
        this.text.innerHTML = this.value;
        // Calculate the width of the div to work with the value and properly animate
        let width = calculateTextSize(this.value, getComputedStyle(this.text)).width + 1.7;
        if (width < 2.5) { width = 2.5; }
        this.text.style.width = `${width}rem`;
    }

    /**
     * Launch the increment animation
     */
    animate() {
        // Alternate the animation between right and left
        if (hasClass(this.text, 'left')) {
            removeClass(this.text, 'left');
            addClass(this.text, 'right');
        } else {
            removeClass(this.text, 'right');
            addClass(this.text, 'left');
        }
    }

    /**
     * Set the state of the score
     * @param {string} state 
     */
    setState(state) {
        // Check if state is allowed
        if (this.states.includes(state)) {
            // Store if the score is running
            let running = this.running;
            removeClass(this.text, this.state);
            // Stop the score before changing state
            this.stop();
            this.state = state;
            addClass(this.text, this.state);
            // Start the score if it was running
            if (running) { this.start(); }
        }
    }

    /**
     * Reveal the score
     * @param {Function} callback 
     */
    pop(callback) {
        callback = callback || function () { };
        addClass(this.container, 'pop');
        wait(200, () => { callback(); });
    }

    /**
     * Hide the score
     * @param {Function} callback 
     */
    unpop(callback) {
        callback = callback || function () { };
        removeClass(this.container, 'pop');
        wait(200, () => { callback(); });
    }

    /**
     * Destroy the score
     * @param {Function} callback 
     */
    destroy(callback) {
        callback = callback || function () { };
        // Hide the score
        this.unpop(() => {
            // Stop it
            this.stop();
            // Remove the container
            this.container.remove();
            callback();
        });
    }
}

export default Score;