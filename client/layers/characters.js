import { wait } from "../utils/dom";
import Layer from "./layer";

class Characters extends Layer {
    constructor(options) {
        super(options);
        this.level = this.options.level;

        this.characters = [];
        this.features = [];

        this.source.type = 'geojson';
        this.source.data = {
            type: 'FeatureCollection',
            features: this.features
        }

        this.layer.type = 'symbol';
        this.layer.layout = {
            'icon-size': ['get', 'scale'],
            'icon-offset': ['get', 'offset'],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
        };

        this.layer.paint = {
            'icon-opacity': ['get', 'opacity']
        }
    }

    getNumber() {
        return this.characters.length;
    }

    getLayerExtent() {
        if (!this.features || this.features.length === 0) {
            return null;
        }
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        this.features.forEach(f => {
            let [x, y] = f.geometry.coordinates;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        });
        return [[minX, minY], [maxX, maxY]];
    }

    addFeature(feature) {
        this.features.push(feature);
        this.updateSource();
    }

    getCharacter(index) {
        if (index < this.getNumber()) {
            return this.characters[index];
        } else {
            return undefined;
        }
    }

    getCharacters() {
        return this.characters;
    }

    getActiveCharacters() {
        let actives = [];
        this.characters.forEach(c => {
            if (c.isActive()) { actives.push(c); }
        });
        return actives;
    }

    addCharacter(character) {
        this.characters.push(character);
        this.addFeature(character.getFeature());
    }

    removeCharacter(character) {
        let id = character.getId();
        for (let i = 0; i < this.characters.length; i++) {
            if (id === this.characters[i].getId()) {
                this.characters.splice(i, 1);
                break;
            }
        }
        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].properties.id === id) {
                this.features.splice(i, 1);
                break;
            }
        }
        this.updateSource();
    }

    updateSource() {
        const source = this.basemap.map.getSource(this.id);
        if (source) {
            source.setData({
                type: 'FeatureCollection',
                features: this.features
            });
        }
    }

    despawnCharacters(callback) {
        callback = callback || function () { };
        let delay = 0;
        this.characters.forEach(character => {
            let d = character.getSpawnDuration();
            if (d > delay) { delay = d; }
            if (character.getScale() > 0) {
                character.despawn();
                if (character.router) {
                    character.despawnRouter();
                }
            }
        });
        wait(delay, callback);
    }

    destroy() {
        this.characters.forEach(c => { c.stopAnimations(); });
        this.characters = [];
        this.features = [];
        this.updateSource();
    }
}

export default Characters;