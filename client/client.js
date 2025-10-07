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

    if (getStorage('install') === null) {
        setStorage('install', true);
    }

    if (device.type !== 'desktop') {
        let installation = true;
        const firefox = navigator.userAgent.toLowerCase().includes('firefox');
        const ask = JSON.parse(getStorage('install'));

        if (firefox && ask) {
            installation = false;
            createValidation(document.body, `
                Pour proftier au mieux de Mapinou, vous pouvez créer un raccourcis sur votre écran d'accueil,
                sélectionnez :<br><i>Menu</i> ▸ <i>Ajouter à l’écran d’accueil</i>."`,
                ["D'accord", "Ne plus demander"],
                choice => {
                    if (choice === 1) { setStorage('install', false); }
                }
            );
        }

        if (device.os === 'ios' && ask) {
            installation = false;
            createValidation(document.body, `
                Pour profiter au mieux de Mapinou, vous pouvez installer le jeu sur votre appareil,
                sélectionnez :<br><i>Partager</i> ▸ <i>Sur l’écran d’accueil</i>.`,
                ["D'accord", "Ne plus demander"],
                choice => {
                    if (choice === 1) { setStorage('install', false); }
                }
            );
        }

        if (installation && ask) {
            let deferredPrompt;
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                createValidation(document.body, `
                    Voulez-vous installer Mapinou sur votre appareil ? Cela vous permettra de pleinement profiter du jeu.`,
                    ['Oui', 'Pas maintenant', 'Jamais'],
                    async (v) => {
                        // YES
                        if (v === 0) {
                            if (deferredPrompt) {
                                window.addEventListener('appinstalled', () => {
                                    createValidation(document.body, `
                                        Quittez ce navigateur et lancez Mapinou depuis votre téléphone.`,
                                    );
                                });
                                deferredPrompt.prompt();
                                yes = await deferredPrompt.userChoice;
                                deferredPrompt = null;
                            };
                        }
                        // NEVER
                        else if (v === 2) {
                            setStorage('install', false);
                        }
                    }
                );
            });
        }
    }

    start();
});