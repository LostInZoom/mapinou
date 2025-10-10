import { easeInQuint, easeOutQuint, generateRandomInteger } from "../utils/math.js";
import Character from "../characters/character.js";
import { wait } from "../utils/dom.js";

class Helper extends Character {
    constructor(options) {
        super(options);

        this.size = 64;
        this.visible = false;

        this.types = [
            'leek', 'cabbage', 'chard', 'broccoli', 'radish',
            'turnip', 'zucchini', 'beet', 'squash', 'butternut'
        ]
        this.type = this.types[generateRandomInteger(0, 9)];
        this.opacity = this.layer.basemap.getZoom() < this.params.game.routing ? 0 : 1;

        this.feature.properties.type = this.type;
        this.feature.properties.scale = this.scale;
        this.feature.properties.opacity = this.opacity;

        this.layer.addCharacter(this);
    }

    setType(type) {
        this.type = type;
        this.feature.properties.type = type;
        this.layer.updateSource();
    }

    setVisibility(visibility) {
        this.visible = visibility;
    }

    reveal(callback) {
        this.animateOpacity({
            value: 1
        }, callback);
    }

    hide(callback) {
        this.animateOpacity({
            value: 0
        }, callback);
    }

    isVisible() {
        return this.visible;
    }

    consume() {
        this.deactivate();

        this.app.sounds.playFile({
            src: 'crounch',
            format: 'mp3',
            amount: 3,
        });

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

    animateOpacity(options, callback) {
        callback = callback || function () { };

        const value = options.value;
        const start = performance.now();
        this.startOpacityAnimation = start;

        const origin = this.opacity;
        const duration = options.duration || 300;
        const easing = options.easing || (x => x);

        const animation = (time) => {
            if (this.startOpacityAnimation === start) {
                const elapsed = time - start;
                const t = Math.min(Math.max(elapsed / duration, 0), 1);
                const eased = easing(t);
                const opacity = origin + (value - origin) * eased;
                this.setOpacity(opacity);
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
        requestAnimationFrame(animation);
    }
}

export default Helper;