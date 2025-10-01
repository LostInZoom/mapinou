import { makeDiv } from "../utils/dom";

class Recorder {
    constructor(options) {
        this.options = options;
        this.basemap = this.options.basemap;
        this.active = false;

        this.interactions = [];
        this.clics = [];

        this.resetInteraction();
        this.touchendOne = () => {
            const [x1, y1] = this.center.toArray();
            const [x2, y2] = this.basemap.getCenter().toArray();
            if (x1 === x2 || y1 === y2) {
                this.resetInteraction();
            } else {
                this.insert('pan', undefined);
            }
        }

        this.touchendTwo = () => {
            this.insertZoom('pinch');
        }

        this.touchstart = (e) => {
            if (e.points.length === 1) {
                this.startInteraction();
                this.basemap.map.once('touchend', this.touchendOne);
            } else if (e.points.length === 2) {
                this.startInteraction();
                this.basemap.map.off('touchend', this.touchendOne);
                this.basemap.map.once('touchend', this.touchendTwo);
            } else {
                this.basemap.map.off('touchend', this.touchendOne);
                this.basemap.map.off('touchend', this.touchendTwo);
            }
        }

        this.wheel = () => {
            if (this.start === null) {
                this.startInteraction();
                this.basemap.map.once('zoomend', () => { this.insertZoom('wheel'); });
            }
        }
    }

    isActive() {
        return this.active;
    }

    on() {
        this.basemap.map.on('touchstart', this.touchstart);
        this.basemap.map.on('wheel', this.wheel);
        this.active = true;
    }

    off() {
        this.basemap.map.off('touchstart', this.touchstart);
        this.basemap.map.off('wheel', this.wheel);
        this.active = false;
    }

    startInteraction() {
        this.start = Date.now();
        this.center = this.basemap.getCenter();
        this.zoom = this.basemap.getZoom();
    }

    resetInteraction() {
        this.center = null;
        this.zoom = null;
        this.start = null;
    }

    reset() {
        this.interactions = [];
        this.clics = [];
    }

    get() {
        return {
            interactions: this.interactions,
            clics: this.clics
        };
    }

    insertZoom(subtype) {
        const zoom = this.basemap.getZoom();
        if (zoom > this.zoom) { this.insert('zoom in', subtype); }
        else if (zoom < this.zoom) { this.insert('zoom out', subtype); }
    }

    insert(type, subtype) {
        const end = Date.now();
        console.log('insert inter')
        this.interactions.push({
            type: type,
            subtype: subtype,
            start: new Date(this.start).toISOString(),
            end: new Date(end).toISOString(),
            duration: end - this.start,
            center1: this.center.toArray(),
            center2: this.basemap.getCenter().toArray(),
            zoom1: this.zoom.toFixed(2),
            zoom2: this.basemap.getZoom().toFixed(2)
        });
        this.resetInteraction();
    }

    insertCustomInteraction(options) {
        this.interactions.push(options);
    }

    insertCustomClic(options) {
        this.clics.push(options);
    }
}

export default Recorder;