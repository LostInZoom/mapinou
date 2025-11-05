import Page from "./page";

class Ending extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.listen = false;

        addClass(this.container, 'page-ending');

    }
}

export default Ending;