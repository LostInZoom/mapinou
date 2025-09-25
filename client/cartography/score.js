import { Header } from "../pages/elements";
import { addClass, hasClass, makeDiv, removeClass, wait } from "../utils/dom";
import { calculateTextSize } from "../utils/parse";

class Score {
    constructor(options) {
        this.parent = options.parent;
        this.level = options.level;
        this.params = this.level.options.app.options;

        this.value = options.value || 0;
        this.states = options.states || ['stopped', 'default', 'movement'];
        this.modifiers = options.modifiers || ['enemies', 'helpers', 'position']
        this.state = options.state || 'stopped'

        this.running = false;

        this.interval;
        this.container = makeDiv(null, 'score-container');
        this.text = makeDiv(null, 'score-text');
        this.textcontainer = makeDiv(null, 'score-text-container');
        this.textcontainer.append(this.text);
        this.container.append(this.textcontainer);

        if (this.parent instanceof Header) { this.parent.insertAtIndex(this.container, 2); }
        else { this.parent.append(this.container); }

        this.setState(this.state);
        this.update(0);
    }

    get() {
        return this.value;
    }

    addModifier(name) {
        if (this.modifiers.includes(name)) {
            let value = this.params.game.score.modifier[name]
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
                    this.update(this.params.game.score.modifier[name]);
                    addClass(this.textcontainer, name);
                    wait(300, () => {
                        this.modifiers.forEach(m => { removeClass(this.textcontainer, m); });
                    });
                })
            })
        }
    }

    getLeftPosition() {
        return this.container.getBoundingClientRect().left;
    }

    start() {
        if (this.state === 'stopped') { this.setState('default'); }
        this.stop();
        this.running = true;
        this.increment = this.params.game.score.increment[this.state];
        this.refresh = this.params.game.score.refresh[this.state];
        this.interval = setInterval(() => {
            this.update(this.increment);
            this.animate();
        }, this.refresh);
    }

    stop() {
        if (this.interval !== undefined) { clearInterval(this.interval); }
        this.running = false;
    }

    update(value) {
        if (this.value + value > 0) { this.value += value; }
        else { this.value = 0 }
        this.text.innerHTML = this.value;
        let width = calculateTextSize(this.value, getComputedStyle(this.text)).width + 1.7;
        if (width < 2.5) { width = 2.5; }
        this.text.style.width = `${width}rem`;
    }

    animate() {
        if (hasClass(this.text, 'left')) {
            removeClass(this.text, 'left');
            addClass(this.text, 'right');
        } else {
            removeClass(this.text, 'right');
            addClass(this.text, 'left');
        }
    }

    setState(state) {
        if (this.states.includes(state)) {
            let running = this.running;
            removeClass(this.text, this.state);
            this.stop();
            this.state = state;
            addClass(this.text, this.state);
            if (running) { this.start(); }
        }
    }

    pop(callback) {
        callback = callback || function () { };
        addClass(this.container, 'pop');
        wait(200, callback);
    }

    unpop(callback) {
        callback = callback || function () { };
        removeClass(this.container, 'pop');
        wait(200, callback);
    }

    destroy(callback) {
        callback = callback || function () { };
        this.unpop(() => {
            this.stop();
            this.container.remove();
            callback();
        });
    }
}

export default Score;