import Roamer from "./roamer.js";

class Target extends Roamer {
    /**
     * Target class, a special type of Roamer that is the target rabbit
     * to reach during a game
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        // Set the rabbit as being a target
        this.target = true;

        // Set different allowed sprites states with their relative weights
        this.weights = [1, 2, 5];
        this.statespool = ['move', 'graze', 'idle'];

        // Set the radius of the circle around the position for the roaming movement
        this.radius = this.params.game.tolerance.target;
        // Make the rabbit roam
        this.roam();
    }
}

export default Target;