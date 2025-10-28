import Character from "./character";

class Flower extends Character {
    constructor(options) {
        super(options);

        this.level = options.level;
        this.orientable = false;

        this.framerate = 100;
        this.framenumber = 5;
        this.state = 'grow';
        this.scale = 1;

        this.size = 32;
        this.offset = [0, -10];

        this.feature.properties.state = this.state;
        this.feature.properties.frame = this.frame;
        this.feature.properties.scale = this.scale;
        this.feature.properties.offset = this.offset;
        this.feature.properties.opacity = this.opacity;

        this.layer.addCharacter(this);

        this.layer.basemap.app.sounds.playFile({
            src: 'flower', amount: 3, volume: 0.4
        });

        this.animateFrame(() => {
            this.setFrame(0);
            this.setState('live');
            this.framenumber = 1;
        });
    }

    decay() {
        this.framenumber = 4;
        this.setState('decay');
        this.setFrame(0);
        this.animateFrame(() => {
            this.destroy();
        });
    }
}

export default Flower;