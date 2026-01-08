/**
 * @routing
 * Classes and functions related to the routing fonctionalities within the game.
 */

import Journeys from "../layers/journeys.js";
import { ajaxGet } from "../utils/ajax.js";
import Credentials from "../utils/credentials.js";

class Router {
    /**
     * Router class that allows the calculation of the shortest path
     * to a point in the road network using different online solution
     * @param {Object} options 
     */
    constructor(options) {
        this.options = options || {};
        this.basemap = this.options.basemap;
        this.player = this.options.player;
        this.params = this.basemap.options.app.options;

        // Create a credential object to get the secret password to other providers
        this.credentials = new Credentials();
        // Set up available providers
        // IGN -> IGN geoservices
        // ORS -> OpenRouteServices, requires an account key in the Credentials object
        this.providers = ['ors', 'ign'];
        // Set the default provider as IGN
        this.provider = 'ign';

        // Threshold in ms above which a request is considered failed
        this.waiting = 5000;

        // Store the current player position
        this.position = this.options.position;
        // Create a journey object to display the path behind the player
        this.journeys = new Journeys({
            id: 'level-journeys',
            router: this,
            basemap: this.basemap,
            behind: 'level-enemies',
            color: this.player.getColor(),
            maxlength: 3000
        });
    }

    /**
     * Set the coordinates of the player position
     * @param {Array} position 
     */
    setPosition(position) {
        this.position = position;
    }

    /**
     * Get the current provider
     * @returns {string}
     */
    getProvider() {
        return this.provider;
    }

    /**
     * Set the provider to calculate shortest paths
     * @param {string} provider 
     */
    setProvider(provider) {
        if (this.providers.includes(provider)) {
            this.provider = provider;
        }
    }

    /**
     * Get the waiting threshold used before switching provider
     * @returns {int}
     */
    getWaitingThreshold() {
        return this.waiting;
    }

    /**
     * Auto switch provider by using the following in the providers array
     */
    switchProvider() {
        for (let i = 0; i < this.providers.length; i++) {
            const p = this.providers[i];
            if (p !== this.getProvider()) {
                this.setProvider(p);
                break;
            }
        }
    }

    /**
     * Calculate the route between the current player position and the provided
     * target using the current provider
     * @param {Array} target target coordinates
     * @param {Function} success execute on success and returns the calculated route
     * @param {Function} error execute on error
     */
    calculateRoute(target, success, error) {
        // Define empty functions if missing
        success = success || (() => { });
        error = error || (() => { });

        // Change the url depending on the current provider
        let url = '';
        if (this.provider === 'ign') {
            url = 'https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&profile=pedestrian&optimization=shortest'
                + `&start=${this.position[0]},${this.position[1]}`
                + `&end=${target[0]},${target[1]}`
                + '&geometryFormat=geojson'
        }
        else if (this.provider === 'ors') {
            url = 'https://api.openrouteservice.org/v2/directions/foot-walking?'
                + `api_key=${this.credentials.openrouteservice}` // Set the personal key
                + `&start=${this.position[0]},${this.position[1]}`
                + `&end=${target[0]},${target[1]}`
        }

        // Check that the url has been set up before sending the ajax
        if (url.length > 0) {
            // Send the ajax to the provider
            ajaxGet(url,
                (route) => {
                    // If ors is used, retrieve the list of coordinates inside the object
                    if (this.provider === 'ors') { route = route.features[0]; }
                    success(route);
                },
                (e) => { error(e) }
            );
        } else {
            error('wrong provider.');
        }
    }

    /**
     * Despawn the trailing displayed journey line
     */
    despawnJourney() {
        this.journeys.despawn();
    }

    /**
     * Stop the fading of the trailing journey line
     */
    stopFadeJourney() {
        this.journeys.stopFade();
    }

    /**
     * Fade the trailing journey line
     */
    fadeJourney() {
        this.journeys.fade();
    }

    /**
     * Update the trailing journey line by adding a point
     * @param {Array} coordinates 
     */
    updateJourney(coordinates) {
        this.journeys.update(coordinates);
    }
}

export default Router