import { addClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
import { generateRandomInteger, weightedRandom } from "../utils/math";

class Hint {
    constructor(options) {
        this.options = options;
        this.level = this.options.level;
        this.basemap = this.level.basemap;
        this.params = this.level.params;
        this.hints = this.level.parameters.hints;

        this.alive = true;
        this.state = 'idle';
        this.color = this.params.game.color;
        this.orientation = 'east';
        this.frame = 0;
        this.injured = false;
        this.transition = 300;

        this.currentText = '';

        this.container = makeDiv(null, 'level-hint-container');
        this.character = makeDiv(null, 'level-hint-character hidden');
        this.charimage = document.createElement('img');
        this.charimage.src = this.params.sprites[`rabbits:${this.color}_${this.state}_${this.orientation}_${this.frame}`];
        this.charimage.alt = 'character';
        this.character.append(this.charimage);

        this.type = 'thought';
        this.container.append(this.character);
        this.createBubble(this.type, '');
        this.level.container.append(this.container);

        this.listen = false;

        this.startBlinkAnimation = 0;
        this.startFrameAnimation = 0;
        this.animateFrame();

        this.container.offsetWidth;
    }

    async walkIn() {
        this.setState('move');
        removeClass(this.character, 'hidden');
        await waitPromise(600);
        this.setState('idle');
        this.listen = true;
        this.basemap.render();
    }

    async displayBubble() {
        addClass(this.bubble, 'pop');
        await waitPromise(this.transition);
    }

    async hideBubble() {
        removeClass(this.bubble, 'pop');
        await waitPromise(this.transition);
    }

    async focusBubble() {
        addClass(this.bubble, 'focus');
        await waitPromise(100);
        removeClass(this.bubble, 'focus');
        await waitPromise(this.transition);
    }

    async focusRabbit() {
        addClass(this.charimage, 'focus');
        await waitPromise(100);
        removeClass(this.charimage, 'focus');
        await waitPromise(this.transition);
    }

    setText(text) {
        this.currentText = text;
        this.bubble.innerHTML = text;
    }

    reload() {
        this.charimage.src = this.params.sprites[`rabbits:${this.color}_${this.state}_${this.orientation}_${this.frame}`];
    }

    setColor(color) {
        this.color = color;
        this.reload();
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

    createBubble(text) {
        this.bubble = makeDiv(null, 'level-hint-bubble', text);
        this.container.append(this.bubble);
        this.container.offsetWidth;
    }

    setType(type) {
        ['thought', 'lost', 'wrong'].forEach(c => removeClass(this.bubble, c));
        addClass(this.bubble, type);
        this.type = type;
    }

    async update(type, text, callback) {
        callback = callback || function () { };
        if (type !== this.type) {
            this.setType(type);
            this.setText(text);
            if (type === 'thought') { this.squeek(); }
            else if (type === 'lost') { this.complain(); }
            else if (type === 'wrong') { this.complain(); }
            this.focusRabbit();
            await this.focusBubble();
            callback();
        } else {
            if (this.type === 'thought') {
                this.setType(type);
                if (text !== this.currentText) {
                    this.setText(text);
                    this.squeek();
                    this.focusRabbit();
                    await this.focusBubble();
                    callback();
                } else {
                    this.setText(text);
                    callback();
                }
            }
        }
    }

    activateUpdate() {
        const updateListener = () => {
            if (this.listen) {
                let visible = this.basemap.isVisible(this.level.parameters.player, 20);
                let zoom = this.basemap.getZoom();
                let [u, t, v] = [false, undefined, ''];
                for (let [m, h] of Object.entries(this.hints)) {
                    if (!visible) {
                        if (this.type !== 'lost') {
                            let l = this.params.game.lost;
                            u = true;
                            t = 'lost';
                            v = l[generateRandomInteger(0, l.length - 1)];
                            break;
                        }
                    } else {
                        if (zoom >= m) {
                            u = true;
                            t = 'thought';
                            v = h;
                        }
                    }
                }

                if (u) {
                    this.listen = false;
                    this.update(t, v, () => { this.listen = true; });
                }
            }
        }
        this.basemap.addListener('render', updateListener);
    }

    squeek() {
        this.level.app.sounds.playFile({ src: 'lapinou-happy', amount: 4, volume: 0.8 });
    }

    complain() {
        this.level.app.sounds.playFile({ src: 'lapinou-hurt', amount: 3, volume: 0.8 });
    }

    found() {
        this.level.app.sounds.playFile({ src: 'lapinou-end', volume: 0.8 });
    }

    injure(blink, callback) {
        callback = callback || function () { };
        const origin = this.color;
        const start = performance.now();

        let pursue = true;
        this.setColor('red');
        let visible = false;
        let lastBlink = start;
        const animate = (time) => {
            if (pursue) {
                if (time - lastBlink >= blink) {
                    visible = !visible;
                    this.setColor(visible ? origin : 'red');
                    lastBlink = time;
                }
                requestAnimationFrame(animate);
            } else {
                this.setColor(origin);
            }
        };
        requestAnimationFrame(animate);

        const rightzoom = this.basemap.getZoom() >= Math.max(...Object.keys(this.hints).map(Number));
        let value = '';
        if (rightzoom) {
            let w = this.params.game.wrong.rightzoom;
            value = w[generateRandomInteger(0, w.length - 1)];
        } else {
            value = this.params.game.wrong.wrongzoom;
        }

        this.listen = false;
        this.update('wrong', value, () => {
            wait(rightzoom ? 1200 : 2000, () => {
                pursue = false;
                this.listen = true;
                this.basemap.render();
                callback();
            });
        });
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

    end(callback) {
        callback = callback || function () { };
        if (this.alive) {
            this.listen = false;
            this.basemap.removeListeners();
            removeClass(this.bubble, 'pop');
            this.setFrame(0);
            this.setOrientation('west');
            this.setState('move');
            addClass(this.character, 'hidden');
            wait(600, () => {
                this.container.remove();
                this.alive = false;
                callback();
            });
        } else {
            callback();
        }
    }
}

export default Hint;