import device from "current-device";

import Application from "./game/application.js";
import { ajaxGet, ajaxPost } from "./utils/ajax.js";
import { generateRandomInteger } from "./utils/math.js";
import { createValidation, getStorage, setStorage } from "./utils/dom.js";

window.addEventListener("DOMContentLoaded", async () => {
    const register = (callback) => {
        callback = callback || function () { };
        function getInformation() {
            return {
                userAgent: navigator.userAgent,
                device: device.type,
                orientation: device.orientation,
                os: device.os,
                width: window.innerWidth,
                height: window.innerHeight,
            }
        }

        let sessionId = getStorage('session');
        let results = { consent: false, form: false };
        if (sessionId) {
            ajaxPost('verification/', { sessionId: sessionId }, (data) => {
                if (data.isPresent) {
                    results.index = parseInt(sessionId);
                    results.consent = data.consent;
                    results.form = data.form;
                    callback(results);
                } else {
                    ajaxPost('registration/', getInformation(), (data) => {
                        setStorage('session', data.sessionId);
                        results.index = parseInt(data.sessionId);
                        callback(results);
                    });
                }
            });
        } else {
            ajaxPost('registration/', getInformation(), (data) => {
                setStorage('session', data.sessionId);
                results.index = parseInt(data.sessionId);
                callback(results);
            });
        }
    }

    const start = async () => {
        setStorage('askInstall', false);

        if (navigator.storage && navigator.storage.persist) {
            await navigator.storage.persist();
        }

        register(sessionId => {
            ajaxGet('configuration/', (params) => {
                // Retrieve the current session progression
                let tier = getStorage('tier');
                let level = getStorage('level');
                if (!tier) {
                    tier = 0;
                    level = 0;
                    setStorage('tier', tier);
                    setStorage('tier', level);
                }

                params.session = sessionId;
                params.progression = {
                    tier: parseInt(tier),
                    level: parseInt(level)
                };

                let color = getStorage('color');
                if (!color) {
                    // Create a random rabbit color if none is found
                    color = params.game.colors[generateRandomInteger(0, params.game.colors.length - 1)];
                    setStorage('color', color);
                }
                params.game.color = color;

                new Application(params);
            });
        });
    }

    const pwa = window.matchMedia('(display-mode: standalone)').matches;
    if (pwa) { start(); }
    else {
        if (device.type === 'desktop') { start(); }
        else {
            if (!JSON.parse(getStorage('askInstall') ?? 'true')) { start(); }
            else {
                let pursue = true;
                const firefox = navigator.userAgent.toLowerCase().includes('firefox');

                if (firefox) {
                    pursue = false;
                    createValidation(document.body, `Vous pouvez créer un raccourcis de Mapinou sur votre écran d'accueil, sélectionnez :<br><i>Menu</i> ▸ <i>Ajouter à l’écran d’accueil</i>."`, ["D'accord"], async () => {
                        start();
                    });
                }

                if (device.os === 'ios') {
                    pursue = false;
                    createValidation(document.body, `Vous pouvez installer Mapinou sur votre appareil, sélectionnez :<br><i>Partager</i> ▸ <i>Sur l’écran d’accueil</i>.`, ["D'accord"], async () => {
                        start();
                    });
                }

                if (pursue) {
                    let deferredPrompt;
                    window.addEventListener('beforeinstallprompt', (e) => {
                        e.preventDefault();
                        deferredPrompt = e;
                        createValidation(document.body, 'Voulez-vous installer Mapinou sur votre appareil ?', ['Oui', 'Non'], async (v) => {
                            const yes = v === 0 ? true : false;
                            if (yes) {
                                if (!deferredPrompt) { start(); };
                                window.addEventListener('appinstalled', () => { start(); });
                                deferredPrompt.prompt();
                                yes = await deferredPrompt.userChoice;
                                deferredPrompt = null;
                                if (!yes) { start(); }
                                else { start(); }
                            } else { start(); }
                        });
                    });
                }
            }
        }
    }
});