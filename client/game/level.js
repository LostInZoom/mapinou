import * as turf from '@turf/turf';

import Basemap from '../cartography/map';
import Rabbits from '../layers/rabbits';

import Page from "../pages/page";
import Levels from '../pages/levels';
import Score from "../cartography/score";
import Target from '../characters/target';

import { pointExtent, randomPointInCircle, within } from "../cartography/analysis";
import { addClass, addClassList, easingIncrement, getStorage, hasClass, makeDiv, removeClass, removeClassList, setStorage, wait, waitPromise } from "../utils/dom";
import { ajaxPost } from '../utils/ajax';
import { easeInOutSine, easeOutExpo } from '../utils/math';
import Hint from './hint';
import Recorder from '../cartography/recorder';

class Level extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.params = this.options.app.options;
        this.levels = this.options.levels;
        this.tutorial = this.options.tutorial ?? false;

        this.tier = this.options.tier;
        this.level = this.options.level;
        this.parameters = this.app.options.levels[this.tier].content[this.level];

        this.options.app.forbidRabbits();
        this.score = new Score({
            level: this,
            parent: this.options.app.header,
            state: 'stopped'
        });
        this.recorder = new Recorder({ basemap: this.basemap });

        this.results = {
            session: this.params.session.index,
            game: this.params.game,
            tier: this.tier,
            level: this.level
        };

        this.back = makeDiv(null, 'header-button left', this.params.svgs.cross);
        this.options.app.header.insert(this.back);
        this.back.offsetWidth;
        addClass(this.back, 'pop');

        // Cancel current game and go back to level selection
        this.listening = false;
        this.back.addEventListener('click', () => {
            if (this.listening) {
                this.listening = false;
                this.clear(() => {
                    this.toLevels(false);
                });
            }
        });

        // if (this.app.music.isActive()) {
        //     wait(1500, () => { this.app.music.change('game', true); })
        // }

        // this.phase1(() => {
        //     this.phase2(() => {
        //         wait(300, () => {
        //             this.ending();
        //         });
        //     });
        // });

        // this.phase2(() => {
        //     wait(300, () => {
        //         this.ending();
        //     });
        // });

        this.results = JSON.parse(getStorage('test'));
        this.results.score = 150;
        this.basemap.createCharacters(this, this.parameters);
        this.dataExtent = this.basemap.getExtentForData();

        this.ending();
    }

    async phase1(callback) {
        callback = callback || function () { };
        this.phase = 1;
        const start = Date.now();

        this.displayPhase(1, async () => {
            let activeWrong = false;
            const selectionListener = (e) => {
                let target = e.lngLat.toArray();
                let player = this.parameters.player;
                let clic = {
                    time: new Date().toISOString(),
                    pixel: [e.point.x, e.point.y],
                    coordinates: target
                }

                if (within(target, player, this.params.game.tolerance.click)) {
                    this.score.stop();
                    clic.correct = true;
                    this.basemap.recorder.insertCustomClic(clic);
                    this.basemap.recorder.off();
                    this.results.phase1 = this.basemap.recorder.get();

                    const end = Date.now();
                    this.results.phase1.duration = end - start;
                    this.results.phase1.start = new Date(start).toISOString();
                    this.results.phase1.end = new Date(end).toISOString();
                    this.results.phase1.score = this.score.get();

                    this.basemap.recorder.reset();
                    this.hint.end(callback);
                } else {
                    if (!activeWrong) {
                        activeWrong = true;
                        clic.correct = false;
                        this.basemap.recorder.insertCustomClic(clic);

                        addClass(this.basemap.getContainer(), 'wrong');
                        this.score.addModifier('position');
                        wait(500, () => { removeClass(this.basemap.getContainer(), 'wrong'); });
                        this.hint.injure(300, () => {
                            activeWrong = false;
                        });
                    }
                }
            }

            this.hint = new Hint({ level: this });
            await this.hint.walkIn();
            this.basemap.addListener('click', selectionListener);
            this.hint.activateUpdate();
            await this.hint.displayBubble();
            this.score.pop();
            this.score.setState('default');
            this.score.start();

            this.basemap.recorder.on();
            this.basemap.enableInteractions();
            this.listening = true;
        });
    }

    async phase2(callback) {
        callback = callback || function () { };
        this.phase = 2;
        const start = Date.now();
        this.basemap.recorder.reset();

        this.basemap.disableInteractions();
        this.basemap.createCharacters(this, this.parameters);

        this.canceler = makeDiv(null, 'level-cancel-button', this.params.svgs.helm);
        this.container.append(this.canceler);
        this.canceler.addEventListener('click', () => {
            if (this.basemap.player.traveling) {
                this.basemap.player.stop();
                this.score.start();
            }
        });

        let visible = false;
        this.basemap.addListener('render', () => {
            let threshold = this.params.game.routing.minzoom;
            let zoom = this.basemap.getZoom();
            if (zoom >= threshold && !visible) {
                visible = true;
                this.basemap.helpers.reveal();
                this.basemap.enemies.revealAreas();
            }
            else if (zoom < threshold && visible) {
                visible = false;
                this.basemap.helpers.hide();
                this.basemap.enemies.hideAreas();
            }
        });

        this.basemap.player.spawn(() => {
            this.dataExtent = this.basemap.getExtentForData();
            this.basemap.fit(this.dataExtent, {
                easing: easeInOutSine,
                padding: { top: 100, bottom: 50, left: 50, right: 50 }
            }, () => {
                this.basemap.target.spawn(() => {
                    this.basemap.enemies.spawn(1000, () => {
                        this.displayPhase(2, () => {
                            this.score.start();
                            this.listening = true;
                            this.basemap.enableInteractions();
                            this.basemap.recorder.on();
                            this.basemap.enableMovement(win => {
                                if (win) {
                                    const end = Date.now();
                                    this.basemap.recorder.off();
                                    this.results.phase2 = this.basemap.recorder.get();
                                    this.results.score = this.score.get();
                                    this.results.enemies = this.basemap.player.getEnemiesNumber();
                                    this.results.helpers = this.basemap.player.getHelpersNumber();

                                    this.results.phase2.duration = end - start;
                                    this.results.phase2.start = new Date(start).toISOString();
                                    this.results.phase2.end = new Date(end).toISOString();
                                    this.results.phase2.journey = this.basemap.player.getJourney();
                                    this.results.phase2.score = this.score.get();

                                    this.basemap.recorder.reset();
                                    this.basemap.disableInteractions();
                                    this.score.stop();
                                    this.score.unpop(() => { this.score.destroy(); });
                                    this.clear(callback);
                                }
                            });
                        });
                    });
                });
            });
        });
    }

    ending() {
        const clearing = 2;
        let cleared = 0;
        const toLeaderBoard = () => {
            if (++cleared === clearing) { this.leaderboard(); }
        };

        ajaxPost('results', this.results, hs => {
            this.highscores = hs.highscores;
            toLeaderBoard();
        });

        this.basemap.fit(this.dataExtent, {
            easing: easeInOutSine,
            padding: { top: 100, bottom: 50, left: 50, right: 50 },
            curve: 1.42,
            speed: 1.2
        }, () => { toLeaderBoard(); });
    }

    leaderboard() {
        this.app.progress();
        if (this.canceler) { this.canceler.remove(); }

        console.log(this.results);

        // Creation of containers and map
        let highscorecontainer = makeDiv(null, 'highscore-container');
        let map = makeDiv(null, 'highscore-map');
        let tabscontainer = makeDiv(null, 'highscore-tabs-container');

        // Tabs buttons
        let buttons = makeDiv(null, 'highscore-buttons');
        let buttonstats = makeDiv(null, 'highscore-button active statistics', 'Statistiques');
        buttonstats.setAttribute('value', 'statistics');
        let buttonleaderboard = makeDiv(null, 'highscore-button leaderboard', 'Position');
        buttonleaderboard.setAttribute('value', 'leaderboard');
        buttons.append(buttonstats, buttonleaderboard);

        // Tabs to display statistics/leaderboard
        let tabs = makeDiv(null, 'highscore-tabs');
        let statscontainer = makeDiv(null, 'highscore-tab active statistics no-scrollbar');
        let leaderboardcontainer = makeDiv(null, 'highscore-tab leaderboard no-scrollbar');
        tabs.append(statscontainer, leaderboardcontainer);
        tabscontainer.append(buttons, tabs);

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

        let increments = [
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
        ]

        increments.forEach(i => {
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
            statscontainer.append(entry);
        });

        this.highscores.sort((a, b) => a.score - b.score);
        let personal;
        for (let e = 0; e < this.highscores.length; e++) {
            let entry = this.highscores[e];
            let boardEntry = makeDiv(null, 'highscore-entry');
            let html = `${e + 1}.`;
            if (this.params.session.index === entry.session) {
                html += ' Vous';
                addClass(boardEntry, 'active');
                personal = boardEntry;
            }
            let boardPlace = makeDiv(null, 'highscore-entry-label pop name', html);
            let boardScore = makeDiv(null, 'highscore-entry-label pop value', entry.score);
            boardEntry.append(boardPlace, boardScore);
            leaderboardcontainer.append(boardEntry);
        }

        // Scroll to the user result
        if (personal) {
            let topScroll = personal.offsetTop;
            leaderboardcontainer.scrollTop = topScroll - leaderboardcontainer.offsetHeight / 2;
        }

        let pursue = makeDiv(null, 'highscore-continue page-button', "Continuer")
        highscorecontainer.append(map, tabscontainer, pursue);
        this.container.append(highscorecontainer);

        highscorecontainer.offsetWidth;
        addClass(highscorecontainer, 'pop');

        const activate = (e) => {
            const el = e.target;
            if (!hasClass(el, 'active')) {
                const v = el.getAttribute('value');
                Array.from(tabs.children).forEach(t => {
                    if (hasClass(t, v)) {
                        addClass(t, 'active');
                    } else {
                        removeClass(t, 'active');
                    }
                });
                Array.from(buttons.children).forEach(b => { removeClass(b, 'active'); });
                addClass(el, 'active');
            }
        }

        buttonstats.addEventListener('click', activate);
        buttonleaderboard.addEventListener('click', activate);

        // Increment statistics
        const incrementStats = async (callback) => {
            const entries = statscontainer.children;
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const value = entry.querySelector('.value');
                const duration = increments[i].duration;

                if (increments[i].value.constructor === Array) {
                    if (increments[i].value[0] > 0) {
                        const v1 = value.querySelector('.first');
                        addClass(v1, 'incrementing');
                        await easingIncrement({
                            element: v1,
                            maximum: increments[i].value[0],
                            duration: duration[0],
                            easing: easeOutExpo
                        }, () => {
                            removeClass(v1, 'incrementing');
                            addClass(v1, 'stop');
                        });
                    }
                    if (increments[i].value[1] > 0) {
                        const v2 = value.querySelector('.second');
                        addClass(v2, 'incrementing');
                        await easingIncrement({
                            element: v2,
                            maximum: increments[i].value[1],
                            duration: duration[1],
                            easing: easeOutExpo
                        }, () => {
                            removeClass(v2, 'incrementing');
                            addClass(v2, 'stop');
                        });
                    }
                } else {
                    if (increments[i].value) {
                        addClass(value, 'incrementing');
                        await easingIncrement({
                            element: value,
                            maximum: increments[i].value,
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

        let c = this.parameters.target;
        let r = this.params.game.tolerance.target;
        let hsmap = new Basemap({
            app: this.app,
            parent: map,
            class: 'minimap',
            interactive: false,
            extent: pointExtent(c, r * 2)
        }, () => {
            hsmap.loadSprites().then(async () => {
                let hsRabbits = new Rabbits({
                    id: 'leaderboard-rabbits',
                    basemap: hsmap,
                    level: this
                });
                let hsTarget = new Target({
                    layer: hsRabbits,
                    colors: ['brown', 'sand', 'grey'],
                    color: 'random',
                    coordinates: randomPointInCircle(c, r)
                });
                let hsPlayer = new Target({
                    layer: hsRabbits,
                    colors: ['brown', 'sand', 'grey'],
                    color: 'random',
                    coordinates: randomPointInCircle(c, r)
                });

                await waitPromise(300);
                hsTarget.spawn();
                hsPlayer.spawn();
                await waitPromise(200);

                incrementStats(() => {
                    addClass(pursue, 'pop');
                    pursue.addEventListener('click', () => {
                        removeClass(highscorecontainer, 'pop');
                        hsRabbits.despawnCharacters(() => {
                            hsRabbits.destroy();
                            hsmap.remove();
                            this.toLevels(true);
                        });
                    }, { once: true })
                });
            });
        });
    }

    async displayPhase(number, callback) {
        callback = callback || function () { };

        let phasecontainer = makeDiv(null, 'level-phase-container');
        let textcontainer = makeDiv(null, 'level-phase-text');
        let title = makeDiv(null, 'level-phase-title', 'Phase ' + number);
        let text;
        if (number === 1) { text = "Retrouvez la position de Lapinou en navigant sur la carte" }
        else { text = "Naviguez sur la carte et guidez Lapinou pour l'aider à rejoindre son ami" }
        let subtitle = makeDiv(null, 'level-phase-subtitle', text);
        let clicktocontinue = makeDiv(null, 'level-phase-continue', 'Cliquez pour continuer');
        textcontainer.append(title, subtitle);
        phasecontainer.append(textcontainer, clicktocontinue);
        this.container.append(phasecontainer);
        this.container.offsetWidth;

        addClass(textcontainer, 'reveal');
        await waitPromise(1000);
        addClass(subtitle, 'reveal');
        addClass(clicktocontinue, 'reveal');

        const listener = () => {
            phasecontainer.removeEventListener('click', listener);
            removeClass(clicktocontinue, 'reveal');
            addClass(textcontainer, 'hide');
            wait(1000, () => {
                phasecontainer.remove();
                callback();
            });
        }

        phasecontainer.addEventListener('click', listener);
    }

    routing() {
        if (this.canceler) {
            removeClass(this.canceler, 'moving');
            addClass(this.canceler, 'routing');
        }
    }

    moving() {
        if (this.canceler) {
            removeClass(this.canceler, 'routing');
            addClass(this.canceler, 'moving');
        }
    }

    activateMovementButton() {
        if (this.canceler) {
            addClass(this.canceler, 'active');
        }
    }

    deactivateMovementButton() {
        if (this.canceler) {
            removeClass(this.canceler, 'moving');
            removeClass(this.canceler, 'routing');
            removeClass(this.canceler, 'active');
        }
    }

    clear(callback) {
        callback = callback || function () { };
        removeClass(this.back, 'pop');
        this.basemap.disableInteractions();
        this.basemap.removeListeners();

        const tasks = [
            (cb) => wait(300, cb),
            (cb) => this.score.destroy(cb),
        ];

        this.basemap.recorder.off();
        if (this.phase === 1) {
            tasks.push((cb) => this.hint.end(cb));
        }
        else if (this.phase === 2) {
            tasks.push((cb) => this.basemap.clear(cb));
            tasks.push((cb) => this.basemap.makeUnroutable(cb));
        }

        let cleared = 0;
        const clearing = tasks.length;
        const checkDone = () => {
            if (++cleared === clearing) {
                this.back.remove();
                callback();
            };
        };
        tasks.forEach(task => task(checkDone));
    }

    toLevels(update) {
        // this.app.music.fadeOut(500, true);
        this.destroy();

        this.basemap.fit(this.params.interface.map.levels, {
            easing: easeInOutSine
        }, () => {
            this.app.page = new Levels({
                app: this.app,
                position: 'current',
                update: update
            });
        });
    }
}

export default Level;