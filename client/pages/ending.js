import Page from "./page";

import { addClass } from "../utils/dom";
import { ajaxGet } from "../utils/ajax";

class Ending extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.results = this.options.results;
        this.listen = false;

        ajaxGet('statistics/',
            results => {
                console.log(results)
            }
        )

        addClass(this.container, 'page-ending');

    }
}

export default Ending;