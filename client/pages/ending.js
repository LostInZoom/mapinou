import Page from "./page";
import Title from "./title";
import Leaderboard from "../game/leaderboard";

import { addClass, makeDiv, removeClass, waitPromise } from "../utils/dom";
import { ajaxGet } from "../utils/ajax";
import { easeInOutSine } from "../utils/math";
import Lapinou from "../game/lapinou";

class Ending extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.listen = false;
        addClass(this.container, 'page-ending');

        this.content = makeDiv(null, 'page-content pop');
        this.container.append(this.content);

        const congratulations = async callback => {
            const lapinou = new Lapinou({ page: this, parent: this.content, color: this.params.game.color });
            let mask = makeDiv(null, 'ending-mask');
            let congrats = makeDiv(null, 'ending-congratulations', 'Félicitations !<br>Vous avez terminé Mapinou !');
            let text = makeDiv(null, 'ending-text hidden', 'Cliquez pour voir vos statistiques');
            this.app.container.append(mask);
            this.content.append(congrats);
            this.container.append(text);

            await lapinou.walkIn();
            addClass(congrats, 'pop');
            await waitPromise(1000);
            lapinou.setOrientation('east');
            removeClass(text, 'hidden');

            mask.addEventListener('click', async () => {
                addClass(text, 'hidden');
                removeClass(congrats, 'pop');

                lapinou.setOrientation('south');
                await waitPromise(1000);
                await lapinou.walkOut();
                lapinou.destroy();
                this.content.remove();
                mask.remove();
                text.remove();
                callback();
            }, { once: true });
        };

        let highscores;
        const tasks = [
            cb => ajaxGet('statistics/', r => { highscores = r; cb(); }),
            cb => congratulations(cb)
        ]
        let cleared = 0;
        const clearing = tasks.length;

        const stats = () => {
            if (++cleared >= clearing) {
                this.listen = false;
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
        };

        tasks.forEach(t => t(stats));
    }
}

export default Ending;