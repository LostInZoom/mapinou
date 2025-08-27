import { unByKey } from 'ol/Observable.js';

import { randomPointInCircle, within } from "../cartography/analysis";
import Score from "../cartography/score";
import Page from "../pages/page";
import { addClass, easingIncrement, makeDiv, removeClass, wait } from "../utils/dom";
import { inAndOut } from 'ol/easing';
import Target from '../characters/target';
import Levels from '../pages/levels';
import { ajaxPost } from '../utils/ajax';
import Basemap from '../cartography/map';
import { easeOutExpo } from '../utils/math';

class Level extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.params = this.options.app.options;
        this.level = this.options.params;
        this.levels = this.options.levels;
        this.basemap = this.options.app.basemap;

        this.options.app.forbidRabbits();

        this.score = new Score({
            level: this,
            parent: this.options.app.header,
            state: 'stopped'
        });

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
                    this.toLevels();
                });
            }
        });

        // this.phase1(() => {
        //     this.phase2(() => {
        //         this.ending();
        //     });
        // });

        this.phase2(() => {
            this.ending();
        });
    }

    phase1(callback) {
        callback = callback || function () { };
        this.phase = 1;

        this.score.pop();
        this.score.setState('default');
        this.score.start();

        this.hints = this.level.hints;

        this.hint = makeDiv(null, 'level-hint-container');
        this.hintext = makeDiv(null, 'level-hint');
        this.hint.append(this.hintext);
        this.container.append(this.hint);
        this.hint.offsetHeight;

        this.basemap.enableInteractions();

        let player = this.level.player;

        const hintListener = () => {
            let visible = this.basemap.isVisible(player);
            let zoom = this.basemap.getZoom();
            for (let [m, h] of Object.entries(this.hints)) {
                if (!visible) {
                    let t = this.params.game.lost;
                    this.hintext.innerHTML = t;
                } else {
                    if (zoom >= m) {
                        addClass(this.hint, 'pop');
                        this.hintext.innerHTML = h;
                    }
                }
            }
        }

        this.basemap.addListener('render', hintListener);

        let activeWrong = false;
        const selectionListener = (e) => {
            let target = e.lngLat.toArray();
            if (within(target, player, this.params.game.tolerance.target)) {
                this.basemap.removeListeners();
                removeClass(this.hint, 'pop');
                wait(300, () => {
                    this.hint.remove();
                    callback();
                });
            } else {
                if (!activeWrong) {
                    activeWrong = true;
                    addClass(this.basemap.getContainer(), 'wrong');
                    wait(500, () => {
                        removeClass(this.basemap.getContainer(), 'wrong');
                        activeWrong = false;
                    })
                }
            }
        }
        this.basemap.addListener('click', selectionListener);
        this.basemap.render();
        this.listening = true;
    }

    phase2(callback) {
        callback = callback || function () { };

        this.score.pop();
        this.score.setState('default');
        this.score.start();

        this.phase = 2;
        this.basemap.disableInteractions();
        this.basemap.createCharacters(this, this.level);

        this.canceler = makeDiv(null, 'level-cancel-button', this.params.svgs.helm);
        this.container.append(this.canceler);
        this.canceler.addEventListener('click', () => {
            if (this.basemap.player.traveling) { this.basemap.player.stop(); }
        });

        this.basemap.player.spawn(() => {
            this.dataExtent = this.basemap.getExtentForData();
            this.basemap.fit(this.dataExtent, {
                duration: 500,
                easing: inAndOut,
                padding: { top: 100, bottom: 50, left: 50, right: 50 }
            }, () => {
                this.basemap.target.spawn(() => {
                    this.basemap.enemies.spawn(1000, () => {
                        this.listening = true;
                        this.basemap.enableInteractions();
                        this.basemap.enableMovement(win => {
                            if (win) {
                                this.basemap.disableInteractions();
                                this.clear(callback);
                            }
                        });
                    });
                });
            })
        });
    }

    ending() {
        this.score.stop()
        this.endScore = this.score.get();
        this.score.unpop(() => { this.score.destroy(); });

        let results = {
            session: this.params.session.index,
            tier: this.levels.progression.tier,
            level: this.levels.progression.level,
            score: this.endScore,
        }

        const clearing = 2;
        let cleared = 0;
        ajaxPost('results', results, hs => {
            this.highscores = hs.highscores;
            if (++cleared === clearing) { this.leaderboard(); }
        });

        this.basemap.fit(this.dataExtent, {
            duration: 500,
            easing: inAndOut,
            padding: [100, 50, 50, 50]
        }, () => {
            if (++cleared === clearing) { this.leaderboard(); }
        });
    }

    leaderboard() {
        this.canceler.remove();

        this.highscoreContainer = makeDiv(null, 'highscore-container');
        this.highscoreMap = makeDiv(null, 'highscore-map');
        this.highscoreScore = makeDiv(null, 'highscore-score', 0);
        this.highscoreLeaderboardContainer = makeDiv(null, 'highscore-leaderboard-container');
        this.highscoreLeaderboard = makeDiv(null, 'highscore-leaderboard no-scrollbar');
        this.continue = makeDiv(null, 'highscore-continue-button', "Continuer")

        this.highscoreLeaderboardContainer.append(this.highscoreScore, this.highscoreLeaderboard)
        this.highscoreContainer.append(this.highscoreMap, this.highscoreLeaderboardContainer, this.continue);
        this.container.append(this.highscoreContainer);

        this.highscoreContainer.offsetWidth;
        addClass(this.highscoreContainer, 'pop');

        let c = this.level.target;
        let r = this.params.game.tolerance.target;
        let hsmap = new Basemap({
            app: this.app,
            parent: this.highscoreMap,
            center: this.level.target,
            extent: [c[0] - r * 2, c[1] - r * 2, c[0] + r * 2, c[1] + r * 2]
        }, () => {
            this.hsTarget = new Target({
                basemap: hsmap,
                level: this,
                color: 'brown',
                coordinates: randomPointInCircle(c, r),
                orientable: true,
                zIndex: 40
            });
            this.hsPlayer = new Target({
                basemap: hsmap,
                level: this,
                color: 'white',
                coordinates: randomPointInCircle(c, r),
                orientable: true,
                zIndex: 50
            });
            this.hsTarget.spawn();
            this.hsPlayer.spawn();
        });

        let delay = 300;
        delay += 200;

        wait(delay, () => {
            addClass(this.highscoreScore, 'pop');
            addClass(this.continue, 'pop');
        });
        delay += 500;

        wait(delay, () => {
            addClass(this.highscoreScore, 'incrementing');
            easingIncrement({
                element: this.highscoreScore,
                maximum: this.endScore,
                duration: 2000,
                easing: easeOutExpo
            }, () => {
                removeClass(this.highscoreScore, 'incrementing');
                addClass(this.highscoreScore, 'stop');
                this.continue.addEventListener('click', () => {
                    const clearing = 2;
                    let cleared = 0;
                    removeClass(this.highscoreContainer, 'pop');
                    this.hsPlayer.despawn(() => {
                        if (++cleared === clearing) {
                            hsmap.dispose();
                            this.toLevels();
                        }
                    });
                    this.hsTarget.despawn(() => {
                        if (++cleared === clearing) {
                            hsmap.dispose();
                            this.toLevels();
                        }
                    });
                }, { once: true })
            });
        })

        this.highscores.sort((a, b) => a.score - b.score);
        let personal;
        for (let e = 1; e < this.highscores.length; e++) {
            let entry = this.highscores[e];
            let boardEntry = makeDiv(null, 'highscore-leaderboard-entry');
            let html = `${e}.`;
            if (this.params.session.index === entry.session) {
                html += ' Vous';
                addClass(boardEntry, 'active');
                personal = boardEntry;
            }
            let boardPlace = makeDiv(null, 'highscore-leaderboard-place', html);
            let boardScore = makeDiv(null, 'highscore-leaderboard-score', entry.score);
            boardEntry.append(boardPlace, boardScore);
            this.highscoreLeaderboard.append(boardEntry);
        }

        // Scroll to the user result
        if (personal) {
            let topScroll = personal.offsetTop;
            this.highscoreLeaderboard.scrollTop = topScroll - this.highscoreLeaderboard.offsetHeight / 2;
        }
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
        if (this.hint) removeClass(this.hint, 'pop');

        this.basemap.disableInteractions();
        this.basemap.removeListeners();

        let cleared = 0;
        const clearing = 4;
        const checkDone = () => {
            if (++cleared === clearing) {
                this.back.remove();
                callback();
            };
        };

        const tasks = [
            (cb) => wait(500, cb),
            (cb) => this.basemap.clear(cb),
            (cb) => this.score.destroy(cb),
            (cb) => this.basemap.makeUnroutable(cb)
        ];

        tasks.forEach(task => task(checkDone));
    }

    toLevels() {
        this.destroy();
        this.app.page = new Levels({
            app: this.app,
            position: 'current',
            init: true
        });
    }
}

export default Level;