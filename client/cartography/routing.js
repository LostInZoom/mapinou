/**
 * @routing
 * Classes and functions related to the routing fonctionalities within the game.
 */

import Journeys from "../layers/journeys.js";
import { ajaxGet } from "../utils/ajax.js";
import Credentials from "../utils/credentials.js";

class Router {
    constructor(options) {
        this.options = options || {};
        this.basemap = this.options.basemap;
        this.player = this.options.player;
        this.params = this.basemap.options.app.options;

        this.credentials = new Credentials();
        this.providers = ['ors', 'ign'];
        this.provider = 'ign';

        // Threshold in ms above which a request is considered failed
        this.waiting = 5000;

        this.position = this.options.position;
        this.journeys = new Journeys({
            id: 'level-journeys',
            router: this,
            basemap: this.basemap,
            behind: 'level-enemies',
            color: this.player.getColor(),
            maxlength: 3000
        });
    }

    setPosition(position) {
        this.position = position;
    }

    getProvider() {
        return this.provider;
    }

    setProvider(provider) {
        if (this.providers.includes(provider)) {
            this.provider = provider;
        }
    }

    getWaitingThreshold() {
        return this.waiting;
    }

    switchProvider() {
        for (let i = 0; i < this.providers.length; i++) {
            const p = this.providers[i];
            if (p !== this.getProvider()) {
                this.setProvider(p);
                break;
            }
        }
    }

    calculateRoute(target, success, error) {
        success = success || (() => { });
        error = error || (() => { });

        let url = '';
        if (this.provider === 'ign') {
            url = 'https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&profile=pedestrian&optimization=shortest'
                + `&start=${this.position[0]},${this.position[1]}`
                + `&end=${target[0]},${target[1]}`
                + '&geometryFormat=geojson'
        }
        else if (this.provider === 'ors') {
            url = 'https://api.openrouteservice.org/v2/directions/foot-walking?'
                + `api_key=${this.credentials.openrouteservice}`
                + `&start=${this.position[0]},${this.position[1]}`
                + `&end=${target[0]},${target[1]}`
        }

        if (url.length > 0) {
            ajaxGet(url,
                (route) => {
                    if (this.provider === 'ors') { route = route.features[0]; }
                    success(route);
                },
                (e) => { error(e) }
            );
        } else {
            error('wrong provider.');
        }
    }

    despawnJourney() {
        this.journeys.despawn();
    }

    stopFadeJourney() {
        this.journeys.stopFade();
    }

    fadeJourney() {
        this.journeys.fade();
    }

    updateJourney(coordinates) {
        this.journeys.update(coordinates);
    }
}

export default Router