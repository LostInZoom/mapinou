import Basemap from "../cartography/map";
import SantaBarbara from "../experiences/sbsod";
import Level from "../game/level";
import { addClass, hasClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
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
            callback();
        });
    }

    async createTier() {
        const tier = this.page.getTierContent();

        // Wait 200 ms if animating
        if (this.animate) { await waitPromise(200); }

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

            const progtier = this.page.getProgression().tier

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
                        const startLevel = () => {
                            if (this.page.listening()) {
                                minimapcontainer.removeEventListener('click', startLevel);
                                this.page.listen = false;
                                this.page.hide(() => {
                                    this.page.destroy();
                                    this.page.app.page = new Level({
                                        app: this.page.app,
                                        levels: this.page,
                                        position: 'current',
                                        params: level
                                    });
                                });
                            }
                        }
                        minimapcontainer.addEventListener('click', startLevel);
                    }
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

            this.minimapscontainer.push(minimapcontainer);
            this.minimaps.push(new Basemap({
                app: this.page.app,
                parent: minimap,
                class: 'minimap',
                center: level.target,
                zoom: this.basemap.getZoom() + 1,
                interactive: false
            }));

            if (this.animate && i <= this.level) { await waitPromise(300); }

            let drawLine = false;
            if (this.tier === progtier && i < this.level) { drawLine = true; }
            if (this.tier < progtier && i < tier.content.length - 1) { drawLine = true; }
            if (drawLine) {
                let nextpx = this.page.app.basemap.getPixelAtCoordinates(tier.content[i + 1].target);
                this.svg.addLine(px[0], px[1], nextpx[0], nextpx[1], i, i + 1);
            }

            if (this.animate && i < this.level) { await waitPromise(300); }
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

    update(callback) {
        callback = callback || function () { };
    }
}

class ExperiencePanel extends Panel {
    constructor(options, callback) {
        super(options, callback);
        this.type = 'experience';
        this.number = this.options.number;

        const prognumber = this.page.getProgression().tier;
        const content = this.page.getTierContent();

        this.expcontainer = makeDiv(null, 'levels-experience-container');
        this.experience = makeDiv(null, 'levels-experience');
        this.expcontainer.append(this.experience);

        if (!this.animate) { addClass(this.expcontainer, 'pop'); }
        this.container.append(this.expcontainer);

        if (this.number === prognumber) {
            addClass(this.expcontainer, 'active');
            this.experience.innerHTML = this.page.app.options.svgs.flask;
        }
        else if (this.number < prognumber) {
            addClass(this.expcontainer, 'finished');
            this.experience.innerHTML = this.page.app.options.svgs.check;
        }
        else if (this.number > prognumber) {
            addClass(this.expcontainer, 'remaining');
            this.experience.innerHTML = this.page.app.options.svgs.lock;
        }

        if (this.animate) {
            this.expcontainer.offsetHeight;
            addClass(this.expcontainer, 'pop');
        }

        const startExperience = () => {
            if (this.page.listening()) {
                this.experience.removeEventListener('click', startExperience);
                this.page.listen = false;
                this.page.hide(() => {
                    this.page.destroy();
                    if (content.index === 'SBSOD') {
                        this.page.app.page = new SantaBarbara({
                            app: this.page.app,
                            position: 'current',
                            elements: content,
                            stage: 'tutorial'
                        });
                    }
                });
            }
        }
        this.experience.addEventListener('click', startExperience);
        this.callback();
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

    update(callback) {
        callback = callback || function () { };
    }
}

class TutorialPanel extends Panel {
    constructor(options) {
        super(options);
    }
}

class NavigationBar {
    constructor(options) {
        this.options = options;
        this.page = this.options.page;
        this.params = this.options.page.params;

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
    }

    hide(callback) {
        callback = callback || function () { };
        removeClass(this.container, 'pop');
        wait(300, callback);
    }

    slide(direction, callback) {
        callback = callback || function () { };
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

            callback();
        });
    }
}

export { TierPanel, ExperiencePanel, TutorialPanel, NavigationBar };