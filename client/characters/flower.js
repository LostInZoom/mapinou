import Character from "./character";

class Flower extends Character {
    /**
     * Flower class that represent the target of the rabbit
     * each time the player clicks on the map.
     * A flower grows and lives until the rabbit arrives, then it dies.
     * @param {Object} options 
     */
    constructor(options) {
        super(options);

        this.level = options.level;
        // Flower is not orientable
        this.orientable = false;
        // Defining its specific frame properties
        this.framerate = 100;
        this.framenumber = 5;
        this.scale = 1;
        this.size = 32;
        this.offset = [0, -10];

        // First state is growing
        this.state = 'grow';

        // Set its feature properties
        this.feature.properties.state = this.state;
        this.feature.properties.frame = this.frame;
        this.feature.properties.scale = this.scale;
        this.feature.properties.offset = this.offset;
        this.feature.properties.opacity = this.opacity;

        this.layer.addCharacter(this);

        // Play the sound of the flower growing on creation
        this.layer.basemap.app.sounds.playFile({
            src: 'flower', amount: 3, volume: 0.4
        });

        // Start the growing animation
        this.animateFrame(() => {
            // Reset the frame to 0, and set the flower to live state
            this.setFrame(0);
            this.setState('live');
            // Frame number of this animation is 1
            this.framenumber = 1;
        });
    }

    /**
     * Decay the flower and destroy it afterwards
     */
    decay() {
        // Frame number of this animation is 4
        this.framenumber = 4;
        this.setState('decay');
        this.setFrame(0);
        this.animateFrame(() => {
            // Destroy on callback
            this.destroy();
        });
    }
}

export default Flower;