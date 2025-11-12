import { addClass, makeDiv, removeClass, wait } from "../utils/dom";
import { weightedRandom } from "../utils/math";

class Lapinou {
    constructor(options) {
        this.options = options;
        this.page = this.options.page;
        this.params = this.page.params;
        this.parent = this.options.parent;
        this.color = this.options.color;

        this.alive = true;
        this.color = this.color;
        this.state = 'idle';
        this.orientation = 'east';
        this.frame = 0;
        this.framenumber = 4;
        this.framerate = 200;

        this.container = makeDiv(null, 'bunny-container');
        this.character = makeDiv(null, 'bunny-character');
        this.charimage = document.createElement('img');
        this.reload();
        this.charimage.alt = 'lapinou';
        this.character.append(this.charimage);
        this.container.append(this.character);

        this.parent.append(this.container);
        this.animateFrame();
        this.container.offsetWidth;
    }

    async walkIn() {
        this.setOrientation('south');
        this.setState('move');
        addClass(this.container, 'walk-in');
        await new Promise(resolve => {
            this.container.addEventListener('transitionend', () => {
                this.setState('idle');
                resolve();
            }, { once: true });
        });
    }

    async walkOut() {
        this.setOrientation('south');
        this.setState('move');
        addClass(this.container, 'walk-out');
        await new Promise(resolve => {
            this.container.addEventListener('transitionend', () => {
                resolve();
            }, { once: true });
        });
    }

    reload() {
        this.charimage.src = this.params.sprites[`rabbits:${this.color}_${this.state}_${this.orientation}_${this.frame}`];
    }

    setState(state) {
        this.state = state;
        this.reload();
    }

    setOrientation(orientation) {
        this.orientation = orientation;
        this.reload();
    }

    setFrame(frame) {
        this.frame = frame;
        this.reload();
    }

    animateFrame() {
        this.startFrameAnimation = performance.now();
        let start = this.startFrameAnimation;
        const weights = [10, 1];
        const statespool = ['idle', 'graze'];
        const animation = () => {
            wait(200, () => {
                if (start === this.startFrameAnimation) {
                    this.frame = (this.frame + 1) % 4;
                    if (this.frame === 0 && statespool.includes(this.state)) { this.state = weightedRandom(statespool, weights.slice()); }
                    this.reload();
                    requestAnimationFrame(animation);
                }
            });
        };
        requestAnimationFrame(animation);
    }

    destroy() {
        this.startFrameAnimation = 0;
        this.container.remove();
    }
}

export default Lapinou;