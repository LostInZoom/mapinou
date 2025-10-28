import * as turf from '@turf/turf';
import * as d3 from "d3";

import Basemap from '../cartography/map';
import Rabbits from '../layers/rabbits';
import Target from '../characters/target';

import { pointExtent, randomPointInCircle } from "../cartography/analysis";
import { easeInOutSine, easeOutExpo, removeOutliersIQR } from '../utils/math';
import { addClass, easingIncrement, hasClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
import { makeDiv } from "../utils/dom";
import { getColorsByClassNames } from '../utils/parse';

class Leaderboard {
    constructor(options, callback) {
        this.options = options;
        this.callback = callback || function () { };

        this.page = this.options.page;
        this.params = this.page.params;
        this.results = this.options.results;
        this.highscores = this.options.highscores;
        this.parent = this.page.container;
        this.listen = false;

        this.activated = [];

        // Creation of containers and map
        this.container = makeDiv(null, 'highscore-container');
        let map = makeDiv(null, 'highscore-map');
        let tabscontainer = makeDiv(null, 'highscore-tabs-container');
        // Tabs buttons
        this.buttons = makeDiv(null, 'highscore-buttons');
        // Tabs to display metrics/leaderboard/chart/journey
        this.tabs = makeDiv(null, 'highscore-tabs');
        tabscontainer.append(this.buttons, this.tabs);

        this.continue = makeDiv(null, 'highscore-continue page-button', "Continuer")
        this.container.append(map, tabscontainer, this.continue);
        this.parent.append(this.container);

        this.createMetrics();

        this.width = this.tabs.offsetWidth;
        this.height = this.tabs.offsetHeight;

        this.createLeaderboard();
        this.createChart();
        this.createJourney();

        addClass(this.container, 'pop');

        let c = this.page.parameters.target;
        let r = this.params.game.tolerance.target;
        let hsmap = new Basemap({
            app: this.page.app,
            parent: map,
            class: 'minimap',
            interactive: false,
            extent: pointExtent(c, r * 2)
        }, () => {
            hsmap.loadSprites().then(async () => {
                this.listen = true;

                let hsRabbits = new Rabbits({
                    id: 'leaderboard-rabbits',
                    basemap: hsmap,
                    level: this.page
                });
                let hsTarget = new Target({
                    layer: hsRabbits,
                    color: this.page.basemap.player.getColor(),
                    coordinates: randomPointInCircle(c, r)
                });
                let hsPlayer = new Target({
                    layer: hsRabbits,
                    color: this.page.basemap.target.getColor(),
                    coordinates: randomPointInCircle(c, r)
                });

                await waitPromise(300);
                hsTarget.spawn();
                hsPlayer.spawn();
                await waitPromise(200);

                this.animateMetrics(() => {
                    addClass(this.continue, 'pop');
                    this.continue.addEventListener('click', () => {
                        if (this.listen) {
                            this.listen = false;
                            removeClass(this.container, 'pop');
                            hsRabbits.despawnCharacters(() => {
                                hsRabbits.destroy();
                                hsmap.remove();
                                if (this.journeyMap) { this.journeyMap.remove(); }
                                this.callback();
                            });
                        }
                    });
                });
            });
        });
    }

    activateButton(e) {
        const el = e.target;
        if (!hasClass(el, 'active') && this.listen) {
            this.listen = false;
            const v = el.getAttribute('value');
            Array.from(this.tabs.children).forEach(t => {
                if (hasClass(t, v)) { addClass(t, 'active'); }
                else { removeClass(t, 'active'); }
            });
            Array.from(this.buttons.children).forEach(b => { removeClass(b, 'active'); });
            addClass(el, 'active');

            if (v === 'journey') { wait(300, () => { addClass(this.journeymask, 'loaded'); }) }
            else { wait(200, () => { removeClass(this.journeymask, 'loaded'); }) }

            if (!this.activated.includes(v)) {
                this.activated.push(v);
                wait(200, () => {
                    this.listen = true;
                    if (v === 'leaderboard') { this.animateLeaderboard(); }
                    else if (v === 'chart') { this.animateChart(); }
                    else if (v === 'journey') { this.animateJourney(); }
                });
            } else { this.listen = true; }
        }
    }

    createMetrics() {
        let button = makeDiv(null, 'highscore-button active metrics', this.params.svgs.metrics);
        button.setAttribute('value', 'metrics');
        button.addEventListener('click', (e) => { this.activateButton(e); });
        this.metrics = makeDiv(null, 'highscore-tab active metrics no-scrollbar');
        this.buttons.append(button);
        this.tabs.append(this.metrics);

        const n = this.results.phase1.duration + this.results.phase2.duration;
        const m = Math.floor(n / 60000).toString();
        const s = Math.floor((n % 60000) / 1000).toString();

        const length = turf.length(turf.lineString(this.results.phase2.journey));
        const km = Math.floor(length).toString();
        const metres = length.toString().split('.')[1]?.slice(0, 3) || '000';

        let [zoomin, zoomout, pan] = [0, 0, 0];
        const calculateInteractions = (phase) => {
            this.results[`phase${phase}`].interactions.forEach(i => {
                if (i.type === 'zoom in') { ++zoomin; }
                else if (i.type === 'zoom out') { ++zoomout; }
                else if (i.type === 'pan') { ++pan; }
            });
        }
        calculateInteractions(1);
        calculateInteractions(2);

        this.increments = [
            { name: 'Score', value: this.results.score, duration: 500 },
            { name: 'Temps', value: [m, s], duration: [100, 500], labels: ['m', 's'] },
            { name: 'Distance parcourue', value: [km, metres], duration: [300, 500], labels: ['km', 'm'] },
            { name: 'Prédateurs rencontrés', value: this.results.enemies, duration: 100 },
            { name: 'Légumes mangés', value: this.results.helpers, duration: 100 },
            { name: 'Clics pour trouver Lapinou', value: this.results.phase1.clics.length, duration: 100 },
            { name: 'Clics pour guider Lapinou', value: this.results.phase2.clics.length, duration: 100 },
            { name: 'Zooms avant', value: zoomin, duration: 100 },
            { name: 'Zooms arrière', value: zoomout, duration: 100 },
            { name: 'Déplacements sur la carte', value: pan, duration: 100 },
        ];

        this.increments.forEach(i => {
            let entry = makeDiv(null, 'highscore-entry');
            let name = makeDiv(null, 'highscore-entry-label pop name', i.name);
            let value = makeDiv(null, 'highscore-entry-label pop value');

            if (i.value.constructor === Array) {
                let v1 = makeDiv(null, 'highscore-entry-label pop first', '0');
                let v1l = makeDiv(null, 'highscore-entry-label pop', i.labels[0]);
                let v2 = makeDiv(null, 'highscore-entry-label pop second', '0'.repeat(i.value[1].length));
                let v2l = makeDiv(null, 'highscore-entry-label pop', i.labels[1]);
                value.append(v1, v1l, v2, v2l);
            } else {
                value.innerHTML = 0;
            }

            entry.append(name, value);
            this.metrics.append(entry);
        });
    }

    async animateMetrics(callback) {
        callback = callback || function () { };
        const entries = this.metrics.children;
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const value = entry.querySelector('.value');
            const duration = this.increments[i].duration;

            if (this.increments[i].value.constructor === Array) {
                if (this.increments[i].value[0] > 0) {
                    const v1 = value.querySelector('.first');
                    addClass(v1, 'incrementing');
                    await easingIncrement({
                        element: v1,
                        maximum: this.increments[i].value[0],
                        duration: duration[0],
                        easing: easeOutExpo
                    }, () => {
                        removeClass(v1, 'incrementing');
                        addClass(v1, 'stop');
                    });
                }
                if (this.increments[i].value[1] > 0) {
                    const v2 = value.querySelector('.second');
                    addClass(v2, 'incrementing');
                    await easingIncrement({
                        element: v2,
                        maximum: this.increments[i].value[1],
                        duration: duration[1],
                        easing: easeOutExpo
                    }, () => {
                        removeClass(v2, 'incrementing');
                        addClass(v2, 'stop');
                    });
                }
            } else {
                if (this.increments[i].value) {
                    addClass(value, 'incrementing');
                    await easingIncrement({
                        element: value,
                        maximum: this.increments[i].value,
                        duration: duration,
                        easing: easeOutExpo
                    }, () => {
                        removeClass(value, 'incrementing');
                        addClass(value, 'stop');
                    });
                }
            }
        }
        callback();

    }

    createLeaderboard() {
        let button = makeDiv(null, 'highscore-button leaderboard', this.params.svgs.rank);
        button.setAttribute('value', 'leaderboard');
        button.addEventListener('click', (e) => { this.activateButton(e); });
        this.leaderboard = makeDiv(null, 'highscore-tab leaderboard no-scrollbar');
        this.buttons.append(button);
        this.tabs.append(this.leaderboard);

        // Tab to display personnal rank
        this.highscores.leaderboard.sort((a, b) => a.score - b.score);
        this.personal;
        for (let i = 0; i < this.highscores.leaderboard.length; i++) {
            let e = this.highscores.leaderboard[i];
            let entry = makeDiv(null, 'highscore-entry');
            let html = `${i + 1}. ${e.name}`;
            if (this.params.session.index === e.session) {
                html += ' (Vous)';
                addClass(entry, 'active');
                this.personal = entry;
            }
            let place = makeDiv(null, 'highscore-entry-label pop name', html);
            let score = makeDiv(null, 'highscore-entry-label pop value', e.score);
            entry.append(place, score);
            this.leaderboard.append(entry);
        }
    }

    animateLeaderboard() {
        if (this.personal) {
            let topScroll = this.personal.offsetTop + this.personal.offsetHeight / 2;
            this.leaderboard.scrollTo({
                top: topScroll - this.leaderboard.offsetHeight / 2,
                behavior: 'smooth'
            });
        }
    }

    createChart() {
        let button = makeDiv(null, 'highscore-button chart', this.params.svgs.histogram);
        button.setAttribute('value', 'chart');
        button.addEventListener('click', (e) => { this.activateButton(e); });
        let tab = makeDiv(null, 'highscore-tab chart no-scrollbar');
        this.buttons.append(button);
        this.tabs.append(tab);

        // Tab to display a chart with position
        let scores = this.highscores.leaderboard.map(h => h.score);

        if (scores.length < 2) {
            let oops = makeDiv(null, 'highscore-oops', "Il n'y a personne encore !");
            tab.append(oops);
        } else {
            const score = this.results.score;
            const realmin = scores[0];
            const realmax = scores[scores.length - 1];
            scores = removeOutliersIQR(scores);

            const n = scores.length;
            const ticks = Math.round(Math.sqrt(n) * 10);
            // Calculate Scott bandwidth value
            const bandwidth = 3.49 * d3.deviation(scores) * Math.pow(n, -1 / 3);

            const min = d3.min(scores);
            const max = d3.max(scores);

            // Here, the score is not an outlier
            let topPercent = 100;
            if (scores.includes(score)) {
                const rank = scores.findIndex(s => s >= score);
                topPercent = (rank / n) * 100;
            } else {
                if (score < min) {
                    topPercent = 1;
                }
            }
            const topText = `Top ${Math.round(topPercent)}%`;

            function kde(kernel, thresholds, data) {
                return thresholds.map(t => [t, d3.mean(data, d => kernel(t - d))]);
            }

            function epanechnikov(bandwidth) {
                return x => Math.abs(x /= bandwidth) <= 1 ? 0.75 * (1 - x * x) / bandwidth : 0;
            }

            const mindom = d3.min(scores) - 2 * bandwidth;
            const maxdom = d3.max(scores) + 2 * bandwidth;
            const x = d3.scaleLinear()
                .domain([mindom, maxdom])
                .range([0, this.width]);

            const thresholds = d3.ticks(mindom, maxdom, ticks);
            const density = kde(epanechnikov(bandwidth), thresholds, scores);
            density.unshift([mindom, -1]);
            density.push([maxdom, -1]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(density, d => d[1])])
                .range([this.height, 0]);

            const svg = d3.create("svg")
                .attr("width", this.width)
                .attr("height", this.height)
                .attr("viewBox", [0, 0, this.width, this.height])
                .attr("preserveAspectRatio", "none")
                .attr("style", "height: auto;");

            this.chartmask = svg.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", this.height)
                .attr("width", 0)
                .attr("fill", "white");

            const g = svg.append("g").attr("mask", "url(#reveal-mask)");

            g.append("path")
                .datum(density)
                .attr("d", d3.area()
                    .curve(d3.curveBasis)
                    .x(d => x(d[0]))
                    .y0(y(0))
                    .y1(d => y(d[1]))
                );

            g.append("line")
                .attr("x1", () => {
                    if (score > max) { return x(max); }
                    else if (score < min) { return x(min); }
                    else { return x(score); }
                })
                .attr("x2", () => {
                    if (score > max) { return x(max); }
                    else if (score < min) { return x(min); }
                    else { return x(score); }
                })
                .attr("y1", y(0))
                .attr("y2", y(d3.max(density, d => d[1])));

            const defs = svg.append("defs");
            defs.append("mask")
                .attr("id", "reveal-mask")
                .append(() => this.chartmask.node());

            this.chartlabels = makeDiv(null, 'highscore-chart-labels');
            let top = makeDiv(null, 'highscore-chart-label top', topText);
            let minlabel = makeDiv(null, 'highscore-chart-label min', `Min : ${realmin}`);
            let maxlabel = makeDiv(null, 'highscore-chart-label max', `Max : ${realmax}`);
            this.chartlabels.append(top, minlabel, maxlabel);

            tab.append(svg.node(), this.chartlabels);
        }
    }

    animateChart() {
        if (this.chartmask) {
            this.chartmask.transition()
                .duration(1000)
                .ease(easeInOutSine)
                .attr("width", this.width);
            wait(1000, () => {
                addClass(this.chartlabels, 'reveal');
            });
        }
    }

    createJourney() {
        let button = makeDiv(null, 'highscore-button journey', this.params.svgs.journey);
        button.setAttribute('value', 'journey');
        button.addEventListener('click', (e) => { this.activateButton(e); });
        let tab = makeDiv(null, 'highscore-tab journey no-scrollbar');
        this.journeymask = makeDiv(null, 'mask');
        let loader = makeDiv(null, 'loader');
        this.journeymask.append(loader);
        tab.append(this.journeymask);
        this.buttons.append(button);
        this.tabs.append(tab);

        // Tab to display journeys
        const winner = JSON.parse(this.highscores.journey);
        const bbox1 = turf.bbox(turf.lineString(this.results.phase2.journey));
        const bbox2 = turf.bbox(winner);
        const bbox = [Math.min(bbox1[0], bbox2[0]), Math.min(bbox1[1], bbox2[1]), Math.max(bbox1[2], bbox2[2]), Math.max(bbox1[3], bbox2[3])];

        this.winner = winner.coordinates;

        this.journeyMap = new Basemap({
            app: this.page.app,
            parent: tab,
            class: 'highscores',
            extent: bbox,
            padding: { top: 10, left: 10, right: 10, bottom: 30 },
            interactive: false
        }, () => {
            let labels = makeDiv(null, 'highscore-journey-labels');
            this.journeyLabel = makeDiv(null, 'highscore-journey-label player', 'Vous');
            this.winnerLabel = makeDiv(null, 'highscore-journey-label winner', 'Numéro 1');
            labels.append(this.journeyLabel, this.winnerLabel);
            tab.append(labels);

            this.journeyMap.map.addSource('winner', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [] }
                }
            });

            this.journeyMap.map.addSource('journey', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [] }
                }
            });

            let colors = getColorsByClassNames('highscore-player', 'highscore-winner');
            this.journeyMap.map.addLayer({
                id: 'winner',
                type: 'line',
                source: 'winner',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': colors['highscore-winner'], 'line-width': 4 }
            });

            this.journeyMap.map.addLayer({
                id: 'journey',
                type: 'line',
                source: 'journey',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': colors['highscore-player'], 'line-width': 4 }
            });
        });
    }

    animateLine(coords, name, duration, callback) {
        callback = callback || function () { };
        const total = coords.length;

        let start = performance.now();
        this.start = start;

        const step = timestamp => {
            if (this.start === start) {
                const elapsed = timestamp - start;
                const t = Math.min(elapsed / duration, 1);
                const count = Math.floor(t * total);
                const currentLine = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coords.slice(0, count)
                    }
                };
                this.journeyMap.map.getSource(name).setData(currentLine);

                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    callback();
                }
            }
        }

        requestAnimationFrame(step);
    }

    animateJourney() {
        const journey = this.results.phase2.journey;
        this.listen = false;
        wait(400, async () => {
            addClass(this.winnerLabel, 'reveal');
            this.animateLine(this.winner, 'winner', 1000, () => {
                addClass(this.journeyLabel, 'reveal');
                this.animateLine(journey, 'journey', 1000, () => {
                    this.listen = true;
                });
            });
        });
    }
}

export default Leaderboard;