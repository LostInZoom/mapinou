import { within } from "../cartography/analysis";
import Helper from "../characters/helper";
import Characters from "./characters";

class Helpers extends Characters {
    constructor(options) {
        super(options);
        this.layer.layout['icon-image'] = [
            'concat',
            'vegetables:',
            ['get', 'type']
        ]

        this.basemap.addLayer(this);

        if (this.options.coordinates) {
            this.options.coordinates.forEach((coords) => {
                let o = this.options;
                o.coordinates = coords;
                o.layer = this;
                new Helper(o);
            });
        }
    }

    reveal() {
        this.visible = true;
        this.characters.forEach(c => { c.reveal(); });
    }

    hide() {
        this.visible = false;
        this.characters.forEach(c => { c.hide(); });
    }

    getVisibleHelpers() {
        let visible = [];
        this.characters.forEach(c => {
            if (c.isVisible()) {
                visible.push(c);
            }
        });
        return visible;
    }

    handle(player) {
        const position = player.getCoordinates();
        for (let i = 0; i < this.characters.length; i++) {
            let helper = this.characters[i];
            if (helper.isActive()) {
                if (within(position, helper.getCoordinates(), this.params.game.visibility.helpers)) {
                    if (!helper.isVisible()) {
                        helper.setVisibility(true);
                        helper.spawn(() => { helper.breathe(); });
                    }
                    // Consume them if within consuming range
                    if (within(position, helper.getCoordinates(), this.params.game.tolerance.helpers)) {
                        helper.consume();
                        this.level.score.addModifier('helpers');
                        player.incrementHelpers();
                    }
                }
                else {
                    if (helper.isVisible()) {
                        helper.setVisibility(false);
                        helper.despawn();
                    }
                }
            }
        }
    }
}

export default Helpers;