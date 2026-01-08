class Recorder {
    /**
     * Recorder object that allows to record interactions on the map
     * on demand, and sort them in three categories, zoom in, zoom out and pan.
     * Touch screen and mouse interactions are distinct as well.
     * @param {Object} options 
     */
    constructor(options) {
        this.options = options;
        this.basemap = this.options.basemap;
        // Flag to check whether its recording
        this.active = false;

        this.zooming = false;
        this.currentZoom = this.basemap.getZoom();
        this.isSet = false;

        this.interactions = [];
        this.clics = [];

        // Resets all interactions
        this.resetInteraction();

        // Listener for the touch pan interaction (1 point touch)
        this.touchendOne = () => {
            // Get former and new center
            const [x1, y1] = this.center.toArray();
            const [x2, y2] = this.basemap.getCenter().toArray();
            if (x1 === x2 || y1 === y2) {
                // Reset interaction if center has not changed
                this.resetInteraction();
            } else {
                // Insert the interaction
                this.insert('pan', undefined);
            }
        }

        // Listener for the pinch zoom interaction (2 points touch)
        this.touchendTwo = () => {
            this.insertZoom('pinch');
        }

        // Listener entry point for touch interactions
        this.touchstart = (e) => {
            // Remove the zooming flag
            this.zooming = false;
            // Check the number of touch points
            if (e.points.length === 1) {
                // Start the interaction and add the listener for one point touch
                this.startInteraction();
                this.basemap.map.once('touchend', this.touchendOne);
            } else if (e.points.length === 2) {
                // Start the interaction
                this.startInteraction();
                // Remove the listener for one point touch and add the two points touch
                this.basemap.map.off('touchend', this.touchendOne);
                this.basemap.map.once('touchend', this.touchendTwo);
            } else {
                // If more than 2 points, remove all listeners
                this.basemap.map.off('touchend', this.touchendOne);
                this.basemap.map.off('touchend', this.touchendTwo);
            }
        }

        // Listener to insert mouse wheel interaction
        this.wheelinsert = () => {
            this.insertZoom('wheel');
            this.zooming = false;
        }

        // Listener for mouse wheel interaction
        this.wheel = (e) => {
            // Remove the mouse wheel interaction listener
            this.basemap.map.off('wheel', this.wheel);
            // Get the type of zooming interaction
            const currentZoom = e.originalEvent.deltaY < 0 ? 'in' : 'out';

            // If the zoom is not currently taking place
            // This is used to avoid multiple records at
            // each zooming interaction with stepping mouse scroller
            if (!this.zooming) {
                // Activate zoom flag, start the interaction
                this.zooming = true;
                this.startInteraction();
                // Insert interaction on zoomend
                this.basemap.map.once('zoomend', this.wheelinsert);
            }
            // Here the zoom is already taking place
            else {
                // If the zoom type is different (in or out)
                if (currentZoom !== this.currentZoom) {
                    // End this interaction and insert it
                    this.basemap.map.off('zoomend', this.wheelinsert);
                    this.insertZoom('wheel');
                    // Restart the interaction
                    this.startInteraction();
                }
            }

            // Store the current zoom type
            this.currentZoom = currentZoom;
            // Activate the listener again
            this.basemap.map.on('wheel', this.wheel);
        }
    }

    /**
     * Checks wheter the recorder is currently recording
     * @returns {boolean}
     */
    isActive() {
        return this.active;
    }

    /**
     * Activate the recorder (wheel and touch interactions)
     */
    on() {
        this.basemap.map.on('touchstart', this.touchstart);
        this.basemap.map.on('wheel', this.wheel);
        this.active = true;
    }

    /**
     * Deactivate the recorder
     */
    off() {
        this.basemap.map.off('touchstart', this.touchstart);
        this.basemap.map.off('wheel', this.wheel);
        // Removes all other listener in case they are active
        this.basemap.map.off('zoomend', this.wheelinsert);
        this.basemap.map.off('touchend', this.touchendOne);
        this.basemap.map.off('touchend', this.touchendTwo);
        this.active = false;
    }

    /**
     * Start an interaction by setting the properties of the current record
     */
    startInteraction() {
        this.start = Date.now(); // Start time
        this.center = this.basemap.getCenter(); // Map center
        this.extent = this.basemap.getExtentAsWKT(); // Map extent as WKT
        this.zoom = this.basemap.getZoom(); // Map zoom
        this.isSet = true; // Flag to check if the records has been set up
    }

    /**
     * Reset the interaction by resetting the properties of the current record
     */
    resetInteraction() {
        this.center = null;
        this.zoom = null;
        this.extent = null;
        this.start = null;
        this.isSet = false;
    }

    /**
     * Removes all currently recorded interactions
     */
    reset() {
        this.interactions = [];
        this.clics = [];
    }

    /**
     * Get all currently recorded interactions
     * @returns {Object}
     */
    get() {
        return {
            interactions: this.interactions,
            clics: this.clics
        };
    }

    /**
     * Insert the current zoom interaction
     * @param {string} subtype 
     */
    insertZoom(subtype) {
        const zoom = this.basemap.getZoom();
        if (zoom > this.zoom) { this.insert('zoom in', subtype); }
        else if (zoom < this.zoom) { this.insert('zoom out', subtype); }
    }

    /**
     * Insert an interaction into the recording array
     * @param {string} type Type of interaction (zoom in, zoom out or pan)
     * @param {string} subtype Only for zoom interactions (pinch or wheel)
     */
    insert(type, subtype) {
        const end = Date.now();
        const r = {
            type: type,
            subtype: subtype,
            start: new Date(this.start).toISOString(),
            end: new Date(end).toISOString(),
            duration: end - this.start,
            center1: this.center.toArray(),
            center2: this.basemap.getCenter().toArray(),
            zoom1: this.zoom.toFixed(2),
            zoom2: this.basemap.getZoom().toFixed(2),
            extent1: this.extent,
            extent2: this.basemap.getExtentAsWKT()
        };

        this.interactions.push(r);
        this.resetInteraction();
    }

    /**
     * Insert a custom interaction in the array
     * @param {Object} options 
     */
    insertCustomInteraction(options) {
        this.interactions.push(options);
    }

    /**
     * Insert a custom clic interaction inside the clic array
     * @param {Object} options 
     */
    insertCustomClic(options) {
        this.clics.push(options);
    }
}

export default Recorder;