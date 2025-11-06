import Page from "./page";
import Title from "./title";
import Leaderboard from "../game/leaderboard";

import { addClass } from "../utils/dom";
import { ajaxGet } from "../utils/ajax";
import { easeInOutSine } from "../utils/math";

class Ending extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.listen = false;
        addClass(this.container, 'page-ending');

        ajaxGet('statistics/',
            highscores => {
                new Leaderboard({
                    page: this,
                    ending: true,
                    results: highscores.find(r => r.session === this.params.session.index),
                    highscores: highscores
                }, () => {
                    this.destroy();
                    this.listen = false;
                    this.options.app.basemap.fly({
                        center: this.app.center,
                        zoom: this.params.interface.map.start.zoom,
                        easing: easeInOutSine
                    }, () => {
                        this.app.page = new Title({ app: this.app, position: 'current' });
                    });
                });
            }
        );
    }
}

export default Ending;