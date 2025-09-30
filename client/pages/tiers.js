import Basemap from "../cartography/map";
import Piaget from "../experiences/piaget";
import SpatialOrientation from "../experiences/ptsot";
import Purdue from "../experiences/purdue";
import SantaBarbara from "../experiences/sbsod";
import Level from "../game/level";
import Tutorial from "../game/tutorial";

import { addClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
import { LevelEdges } from "../utils/svg";

class Panel {
    constructor(options, callback) {
        this.options = options;
        this.callback = callback ?? function () { };

        this.page = this.options.page;
        this.animate = this.options.animate ?? false;
        this.position = this.options.position ?? 'current';

        this.params = this.page.app.options;
        this.basemap = this.page.basemap;

        // Create the content of the tier or experience
        this.container = makeDiv(null, 'levels-panel-container ' + this.position);
        this.page.container.append(this.container);
        this.container.offsetHeight;
    }

    getType() {
        return this.type;
    }
}

class TierPanel extends Panel {
    constructor(options, callback) {
        super(options, callback);
        this.type = 'tier';
        this.tier = this.options.tier;
        this.level = this.options.level;
        this.update = this.options.update ?? false;

        this.minimapscontainer = [];
        this.minimaps = [];

        this.svg = new LevelEdges({
            parent: this.container,
            animation: this.animate
        });

        this.observer = new ResizeObserver(() => {
            this.basemap.fit(this.params.interface.map.levels, { duration: 0 });
            this.svg.resize(this.page.getWidth(), this.page.getHeight());
            for (let i = 0; i < this.minimapscontainer.length; i++) {
                let minimap = this.minimapscontainer[i];
                this.minimaps[i].setZoom(this.basemap.getZoom() + 1);
                let p = [parseFloat(minimap.getAttribute('x')), parseFloat(minimap.getAttribute('y'))];
                let px = this.basemap.getPixelAtCoordinates(p);
                minimap.style.left = px[0] + 'px';
                minimap.style.top = px[1] + 'px';
                if (i < this.minimapscontainer.length - 1) { this.svg.moveLineStart(i, px[0], px[1]); }
                if (i > 0) { this.svg.moveLineEnd(i - 1, px[0], px[1]); }
            }
        });

        this.createTier().then(() => {
            this.observer.observe(this.container);
            callback(this);
        });
    }

    async createTier() {
        const tier = this.page.getTierContent();

        // Wait 200 ms if animating
        if (!this.update && this.animate) { await waitPromise(200); }

        for (let i = 0; i < tier.content.length; i++) {
            const level = tier.content[i];
            let px = this.basemap.getPixelAtCoordinates(level.target);

            let minimapcontainer = makeDiv(null, 'levels-minimap-container');
            if (!this.animate) { addClass(minimapcontainer, 'pop'); }

            minimapcontainer.setAttribute('x', level.target[0]);
            minimapcontainer.setAttribute('y', level.target[1]);

            let minimap = makeDiv(null, 'levels-minimap');
            let state = makeDiv(null, 'levels-state');

            minimap.append(state);
            minimapcontainer.append(minimap);
            minimapcontainer.style.left = px[0] + 'px';
            minimapcontainer.style.top = px[1] + 'px';
            this.container.append(minimapcontainer);

            if (this.animate) {
                minimapcontainer.offsetHeight;
                addClass(minimapcontainer, 'pop');
            }

            const startLevel = () => {
                if (this.page.listening()) {
                    minimapcontainer.removeEventListener('click', startLevel);
                    this.page.listen = false;
                    this.page.hide(() => {
                        wait(100, () => {
                            this.page.destroy();
                            this.page.app.page = new Level({
                                app: this.page.app,
                                levels: this.page,
                                position: 'current',
                                tier: this.page.getPosition(),
                                level: i
                            });
                        });
                    });
                }
            }

            if (this.page.app.debug) {
                addClass(minimapcontainer, 'active-debug');
                minimapcontainer.addEventListener('click', startLevel);
                if (i < tier.content.length - 1) {
                    let nextpx = this.page.app.basemap.getPixelAtCoordinates(tier.content[i + 1].target);
                    this.svg.addLine(px[0], px[1], nextpx[0], nextpx[1], i, i + 1);
                }
            }

            this.minimapscontainer.push(minimapcontainer);
            this.minimaps.push(new Basemap({
                app: this.page.app,
                parent: minimap,
                class: 'minimap',
                center: level.target,
                zoom: this.basemap.getZoom() + 1,
                interactive: false
            }));

            const progtier = this.page.getProgression().tier

            if (!this.page.app.debug) {
                if (this.tier === progtier) {
                    if (i > this.level) {
                        addClass(minimapcontainer, 'remaining');
                        state.innerHTML = this.page.app.options.svgs.lock;
                    } else {
                        if (i < this.level) {
                            addClass(minimapcontainer, 'finished');
                            state.innerHTML = this.page.app.options.svgs.check;
                        }
                        if (i === this.level) {
                            addClass(minimapcontainer, 'active');
                        }
                    }

                    if (!this.update && i === this.level) {
                        minimapcontainer.addEventListener('click', startLevel);
                    }

                    if (this.update && i === this.level + 1) {
                        minimapcontainer.addEventListener('click', startLevel);
                    }
                }
                else if (this.tier < progtier) {
                    addClass(minimapcontainer, 'finished');
                    state.innerHTML = this.page.app.options.svgs.check;
                }
                else {
                    addClass(minimapcontainer, 'remaining');
                    state.innerHTML = this.page.app.options.svgs.lock;
                }

                if (!this.update && this.animate && i <= this.level) { await waitPromise(300); }

                let drawLine = false;
                if (this.tier === progtier && i < this.level) { drawLine = true; }
                if (this.tier < progtier && i < tier.content.length - 1) { drawLine = true; }
                if (drawLine) {
                    let nextpx = this.page.app.basemap.getPixelAtCoordinates(tier.content[i + 1].target);
                    this.svg.addLine(px[0], px[1], nextpx[0], nextpx[1], i, i + 1);
                }

                if (!this.update && this.animate && i < this.level) { await waitPromise(300); }
            }
        }
    }

    hide(callback) {
        callback = callback || function () { };
        this.unobserveSize();
        this.minimapscontainer.forEach((minimap) => { removeClass(minimap, 'pop'); });
        this.svg.thinOutLines();
        wait(500, () => {
            this.minimaps.forEach((minimap) => { minimap.remove(); });
            callback();
        });
    }

    loading() {
        this.minimaps.forEach(minimap => { minimap.loading(); });
    }

    destroy() {
        this.container.remove();
    }

    unobserveSize() {
        if (this.observer) this.observer.unobserve(this.container);
    }

    slideOut(direction, callback) {
        callback = callback || function () { };
        removeClass(this.container, 'current');
        addClass(this.container, direction);

        wait(500, () => {
            if (this.minimaps) {
                this.minimaps.forEach(minimap => { minimap.remove(); });
            }
            callback();
        });
    }

    slideIn(callback) {
        removeClass(this.container, 'next');
        removeClass(this.container, 'previous');
        addClass(this.container, 'current');
        wait(500, callback);
    }

    progress(callback) {
        callback = callback || function () { };
        const tier = this.page.getTierContent();
        const level = tier.content[this.level];
        let minimap = this.minimapscontainer[this.level];
        let minimaplevel = minimap.querySelector('.levels-minimap');
        let state = minimaplevel.querySelector('.levels-state');
        removeClass(minimap, 'active');
        addClass(minimap, 'hide');
        wait(300, () => {
            removeClass(minimap, 'hide');
            addClass(minimap, 'shrink');
            state.remove();
            state = makeDiv(null, 'levels-state');
            state.innerHTML = this.page.app.options.svgs.check;
            minimaplevel.append(state);
            minimaplevel.offsetHeight;
            addClass(minimap, 'finished');
            wait(300, () => {
                removeClass(minimap, 'shrink');
                wait(300, () => {
                    let px = this.basemap.getPixelAtCoordinates(level.target);
                    let nextpx = this.page.app.basemap.getPixelAtCoordinates(tier.content[this.level + 1].target);
                    this.svg.addLine(px[0], px[1], nextpx[0], nextpx[1], this.level, this.level + 1);
                    minimap = this.minimapscontainer[this.level + 1];
                    wait(300, () => {
                        removeClass(minimap, 'remaining');
                        addClass(minimap, 'active');
                        wait(300, () => {
                            callback();
                        });
                    });
                });
            });
        });
    }
}

class ExperiencePanel extends Panel {
    constructor(options, callback) {
        super(options, callback);
        this.type = 'experience';
        this.update = this.options.update ?? false;
        this.number = this.options.number;

        const prognumber = this.page.getProgression().tier;
        const content = this.page.getTierContent();

        this.expcontainer = makeDiv(null, 'levels-experience-container');
        this.experience = makeDiv(null, 'levels-experience');
        this.background = makeDiv(null, 'levels-experience-background');
        this.svg = makeDiv(null, 'levels-experience-svg');
        this.experience.append(this.svg, this.background);
        this.expcontainer.append(this.experience);

        const startExperience = () => {
            if (this.page.listening()) {
                this.experience.removeEventListener('click', startExperience);
                this.page.listen = false;
                this.page.hide(() => {
                    wait(100, () => {
                        this.page.destroy();
                        if (content.index === 'sbsod') {
                            this.page.app.page = new SantaBarbara({
                                app: this.page.app,
                                position: 'current',
                                elements: content,
                                stage: 'presentation'
                            });
                        } else if (content.index === 'piaget') {
                            this.page.app.page = new Piaget({
                                app: this.page.app,
                                position: 'current',
                                elements: content,
                                stage: 'presentation'
                            });
                        } else if (content.index === 'ptsot') {
                            this.page.app.page = new SpatialOrientation({
                                app: this.page.app,
                                position: 'current',
                                elements: content,
                                stage: 'presentation'
                            });
                        } else if (content.index === 'purdue') {
                            this.page.app.page = new Purdue({
                                app: this.page.app,
                                position: 'current',
                                elements: content,
                                stage: 'presentation'
                            });
                        }
                    });
                });
            }
        }

        if (this.page.app.debug) {
            this.container.append(this.expcontainer);
            this.expcontainer.offsetHeight;
            addClass(this.expcontainer, 'pop');
            addClass(this.expcontainer, 'active-debug');
            this.svg.innerHTML = this.page.app.options.svgs.flask;
            this.experience.addEventListener('click', startExperience);
            this.callback(this);
        } else {
            if (!this.animate) { addClass(this.expcontainer, 'pop'); }
            this.container.append(this.expcontainer);

            if (this.number === prognumber) {
                addClass(this.expcontainer, 'active');
                this.svg.innerHTML = this.page.app.options.svgs.flask;
                let pursue = makeDiv(null, 'levels-continue-indicator bottom', 'Continuer');
                wait(500, () => {
                    this.experience.append(pursue);
                    this.experience.offsetHeight;
                    addClass(pursue, 'pop');
                });
            }
            else if (this.number < prognumber) {
                addClass(this.expcontainer, 'finished');
                this.svg.innerHTML = this.page.app.options.svgs.check;
            }
            else if (this.number > prognumber) {
                addClass(this.expcontainer, 'remaining');
                this.svg.innerHTML = this.page.app.options.svgs.lock;
            }

            if (this.animate) {
                this.expcontainer.offsetHeight;
                addClass(this.expcontainer, 'pop');
            }

            if (!this.update && this.number === prognumber) {
                this.experience.addEventListener('click', startExperience);
            }

            if (this.update) {
                this.progress(() => {
                    this.callback(this);
                });
            } else {
                this.callback(this);
            }
        }
    }

    hide(callback) {
        removeClass(this.expcontainer, 'pop');
        wait(500, callback);
    }

    destroy() {
        this.container.remove();
    }

    slideOut(direction, callback) {
        removeClass(this.container, 'current');
        addClass(this.container, direction);
        wait(500, callback);
    }

    slideIn(callback) {
        removeClass(this.container, 'next');
        removeClass(this.container, 'previous');
        addClass(this.container, 'current');
        wait(500, callback);
    }

    progress(callback) {
        callback = callback || function () { };
        removeClass(this.expcontainer, 'active');
        wait(500, () => {
            addClass(this.svg, 'hide');
            wait(300, () => {
                this.svg.remove();
                this.svg = makeDiv(null, 'levels-experience-svg shrink');
                this.svg.innerHTML = this.page.app.options.svgs.check;
                this.experience.append(this.svg);
                this.svg.offsetHeight;
                removeClass(this.svg, 'shrink');
                wait(300, callback);
            });
        });
    }
}

class TutorialPanel extends Panel {
    constructor(options, callback) {
        super(options, callback);
        this.type = 'tutorial';
        this.update = this.options.update ?? false;
        this.number = this.options.number;
        this.level = this.options.level;

        const level = this.page.getTierContent();
        const prognumber = this.page.getProgression().tier;

        this.minimapcontainer = makeDiv(null, 'levels-minimap-container tutorial');
        if (!this.animate) { addClass(this.minimapcontainer, 'pop'); }

        this.minimap = makeDiv(null, 'levels-minimap tutorial');
        this.state = makeDiv(null, 'levels-state');

        this.minimap.append(this.state);
        this.minimapcontainer.append(this.minimap);
        this.container.append(this.minimapcontainer);

        if (this.animate) {
            this.minimapcontainer.offsetHeight;
            addClass(this.minimapcontainer, 'pop');
        }

        const startTutorial = () => {
            if (this.page.listening()) {
                this.minimapcontainer.removeEventListener('click', startTutorial);
                this.page.listen = false;
                this.page.hide(() => {
                    wait(100, () => {
                        this.page.destroy();
                        this.page.app.page = new Tutorial({
                            app: this.page.app,
                            levels: this.page,
                            position: 'current',
                            tier: this.page.getPosition(),
                            first: this.number === prognumber ? true : false
                        });
                    });
                });
            }
        }

        if (this.page.app.debug) {
            addClass(this.minimapcontainer, 'active-debug');
            this.minimapcontainer.addEventListener('click', startTutorial);
        }

        this.map = new Basemap({
            app: this.page.app,
            parent: this.minimap,
            class: 'minimap',
            center: level.target,
            zoom: this.basemap.getZoom() + 1,
            interactive: false
        });

        this.minimapcontainer.addEventListener('click', startTutorial);

        if (this.page.app.debug) {
            addClass(this.minimapcontainer, 'active-debug');
            this.callback(this);
        } else {
            if (this.number === prognumber) {
                addClass(this.minimapcontainer, 'active');
                let pursue = makeDiv(null, 'levels-continue-indicator bottom', 'Continuer');
                wait(500, () => {
                    this.minimap.append(pursue);
                    this.minimap.offsetHeight;
                    addClass(pursue, 'pop');
                });
            }

            if (this.update) {
                this.progress(() => {
                    this.callback(this);
                });
            } else {
                this.callback(this);
            }
        }
    }

    hide(callback) {
        removeClass(this.minimapcontainer, 'pop');
        wait(500, callback);
    }

    destroy() {
        this.container.remove();
    }

    slideOut(direction, callback) {
        removeClass(this.container, 'current');
        addClass(this.container, direction);
        wait(500, callback);
    }

    slideIn(callback) {
        removeClass(this.container, 'next');
        removeClass(this.container, 'previous');
        addClass(this.container, 'current');
        wait(500, callback);
    }

    progress(callback) {
        callback = callback || function () { };
        removeClass(this.minimapcontainer, 'active');
        wait(500, () => {
            wait(300, callback);
        });
    }
}

class NavigationBar {
    constructor(options) {
        this.options = options;
        this.page = this.options.page;
        this.params = this.options.page.params;
        this.listen = false;

        const nb = this.page.getNumber();
        const pos = this.page.getPosition();

        // Listeners to assign to navigation bar buttons
        this.previousListener = () => { this.page.slide('previous'); };
        this.nextListener = () => { this.page.slide('next'); };

        // Create the tier navigation bar
        this.container = makeDiv(null, 'levels-navigation-container');
        if (pos > 0) {
            this.previous = makeDiv(null, 'levels-navigation-entry previous', this.params.svgs.arrowleft);
            this.container.append(this.previous);
            this.previous.addEventListener('click', this.previousListener);
        }

        this.current = makeDiv(null, 'levels-navigation-entry current', this.page.getTierContent().name);
        this.container.append(this.current);

        if (pos < nb - 1) {
            this.next = makeDiv(null, 'levels-navigation-entry next', this.params.svgs.arrowright);
            this.container.append(this.next);
            this.next.addEventListener('click', this.nextListener);
        }

        this.page.container.append(this.container);
        this.container.offsetHeight;

        addClass(this.container, 'pop');
        wait(300, () => { this.listen = true; });
    }

    hide(callback) {
        callback = callback || function () { };
        removeClass(this.container, 'pop');
        wait(300, callback);
    }

    slide(direction, callback) {
        callback = callback || function () { };
        if (this.listen) {
            this.listen = false;
            const isPrevious = direction === 'previous';

            // Remove old events
            if (this.previous) { this.previous.removeEventListener('click', this.previousListener); }
            if (this.next) { this.next.removeEventListener('click', this.nextListener); }
            removeClass(this.current, 'current');
            this.current.innerHTML = '';

            // Update class conditionally
            if (isPrevious && this.next) { addClass(this.next, 'shrink'); }
            if (!isPrevious && this.previous) { addClass(this.previous, 'shrink'); }

            if (isPrevious && this.previous) {
                removeClass(this.previous, 'previous');
                addClass(this.previous, 'current');
            }
            if (!isPrevious && this.next) {
                removeClass(this.next, 'next');
                addClass(this.next, 'current');
            }

            if (isPrevious && this.previous) { removeClass(this.previous, 'previous'); }
            if (!isPrevious && this.next) { removeClass(this.next, 'next'); }

            addClass(this.current, isPrevious ? 'next' : 'previous');

            // Update name
            if (isPrevious && this.previous) { this.previous.innerHTML = this.page.getTierContent().name; }
            if (!isPrevious && this.next) { this.next.innerHTML = this.page.getTierContent().name; }

            const nb = this.page.getNumber();
            const pos = this.page.getPosition();
            const element = makeDiv(null, `levels-navigation-entry ${isPrevious ? 'previous' : 'next'} shrink`, this.params.svgs[isPrevious ? 'arrowleft' : 'arrowright']);
            if (pos > 0 && pos < nb - 1) {
                // Insertion in the dom
                if (isPrevious) { this.container.insertBefore(element, this.container.firstChild); }
                else { this.container.append(element); }
                element.offsetHeight;
                removeClass(element, 'shrink');
            }

            // Add new svg arrow
            this.current.innerHTML = this.params.svgs[isPrevious ? 'arrowright' : 'arrowleft'];

            wait(500, () => {
                if (isPrevious && this.next) { this.next.remove(); }
                if (!isPrevious && this.previous) { this.previous.remove(); }

                // Reassign new buttons
                if (isPrevious) {
                    this.next = this.current;
                    this.current = this.previous;
                    if (pos > 0) { this.previous = element; }
                    else { this.previous = undefined; }
                } else {
                    this.previous = this.current;
                    this.current = this.next;
                    this.next = element;
                    if (pos < nb) { this.next = element; }
                    else { this.next = undefined; }
                }

                // Remake new listeners
                if (this.previous) { this.previous.addEventListener('click', this.previousListener); }
                if (this.next) { this.next.addEventListener('click', this.nextListener); }

                this.listen = true;
                callback();
            });
        }
    }
}

export { TierPanel, ExperiencePanel, TutorialPanel, NavigationBar };