import Levels from "../pages/levels";
import Page from "../pages/page";
import { ajaxPost } from "../utils/ajax";
import { addClass, addClassList, hasClass, makeDiv, removeClass, removeClassList, wait } from "../utils/dom";
import { easeInOutSine, generateRandomInteger } from "../utils/math";
import { remToPx } from "../utils/parse";

class SpatialOrientation extends Page {
    /**
     * Constructor for the SpatialOrientation experience.
     *
     * @param {Object} options - Object containing all the necessary options for the experience.
     * @param {function} callback - Callback function to be executed when the experience is finished.
     */
    constructor(options, callback) {
        super(options, callback);
        this.elements = this.options.elements;
        this.stage = this.options.stage;
        this.answers = this.options.answers ?? [];
        this.timelimit = this.elements.timelimit;
        this.namespace = 'http://www.w3.org/2000/svg';
        this.index = 0;
        this.tutorial = true;
        this.elapsed = 0;

        this.answer = {};
        this.texts = [];

        this.content = makeDiv(null, 'page-content pop');
        this.container.append(this.content);

        // If we currently are in the presentation stage
        if (this.stage === 'presentation') {
            // Fly to a random center
            let centers = this.app.options.interface.map.start.centers;
            let i = generateRandomInteger(0, centers.length - 1);
            this.basemap.fly({
                easing: easeInOutSine,
                center: centers[i],
                zoom: this.app.options.interface.map.start.zoom
            }, () => {
                // Create the presentation
                this.createPresentation();
            });
        }
        // If we currently are in the results stage
        else if (this.stage === 'results') {
            // Create the results page
            this.createResults();
        }
        // If we currently are in the regular test stage
        else {
            this.topcontent = makeDiv(null, 'experience-content ptsot top pop');
            this.back = makeDiv(null, 'page-button page-button-back', 'Retour');
            this.toptext = makeDiv(null, 'experience-text top nobutton pop');
            this.topcontent.append(this.back, this.toptext);
            this.content.append(this.topcontent);

            // Stores the start time if the experience is starting
            if (this.options.start === undefined) { this.options.start = Date.now(); }

            // If we are in the tutorial
            if (this.stage === 'tutorial') {
                // Loop through the elements to create in the top window
                this.elements.top.forEach(e => {
                    // Do something if there is a type in the object 
                    if ('type' in e) {
                        if (e.type === 'characters') {
                            // Generate the characters inside the DOM Element
                            this.generateCharacters(this.toptext, e.subtype);
                        }
                    }
                });
                addClass(this.content, 'ptsot');
                this.createBottomContent();
            }
        }
    }

    /**
     * Creates the presentation for the PT-SOT experience.
     */
    createPresentation() {
        // Create the DOM elements
        let back = makeDiv(null, 'page-button page-button-back', 'Retour');
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        let text = makeDiv(null, 'experience-text');
        this.content.append(back, text, pursue);
        this.content.offsetWidth;

        let presentation = makeDiv(null, 'experience-presentation');
        let title = makeDiv(null, 'experience-presentation-paragraph experience-presentation-title', this.elements.title);
        presentation.append(title);
        this.elements.presentation.forEach(t => {
            presentation.append(makeDiv(null, 'experience-presentation-paragraph', t));
        });
        text.append(presentation);

        addClass(text, 'pop');
        // Wait for the pop animation to finish
        wait(300, () => {
            addClass(back, 'pop');
            addClass(pursue, 'pop');
            this.listen = true;

            // Listener for the back button
            back.addEventListener('click', () => {
                this.playButtonSound();
                // Go back to the levels
                this.toLevels(false);
            }, { once: true });

            // Listener for the continue button
            pursue.addEventListener('click', () => {
                this.playButtonSound();
                this.listen = false;
                let o = this.options;
                // Continue to the tutorial stage
                o.stage = 'tutorial';
                o.position = 'next';
                o.answers = this.answers;
                // Reload the experience
                this.next = new SpatialOrientation(o);
                this.slideNext();
            }, { once: true });
        });
    }

    /**
     * Creates the results page.
     * This function creates a page which displays the results of the experience.
     */
    createResults() {
        this.end = Date.now();
        // Create the results object
        const results = {
            session: this.params.session.index,
            game: this.params.game,
            start: new Date(this.options.start).toISOString(),
            end: new Date(this.end).toISOString(),
            duration: this.end - this.options.start,
            answers: this.answers
        }

        // Create the DOM elements
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');
        let text = makeDiv(null, 'experience-text noback pop');
        this.content.append(text, pursue);
        this.content.offsetWidth;

        let presentation = makeDiv(null, 'experience-presentation');
        let title = makeDiv(null, 'experience-presentation-paragraph experience-presentation-title', 'Résultats');
        presentation.append(title);
        text.append(presentation);

        // Create a table that will display the results
        const container = makeDiv(null, 'ptsot-results no-scrollbar');
        const table = document.createElement('table');
        addClass(table, 'ptsot-metrics-container');

        const first = document.createElement('tr');
        addClass(first, 'ptsot-type');
        const test = document.createElement('td');
        test.textContent = 'Test';
        const you = document.createElement('td');
        you.textContent = 'Écart';
        const all = document.createElement('td');
        all.textContent = 'Écart global moyen';
        first.append(test, you, all);
        table.append(first);

        // Loop through the results to populate the table
        results.answers.forEach((a, i) => {
            const l = document.createElement('tr');
            const t = document.createElement('td');
            t.textContent = i + 1;
            const y = document.createElement('td');
            // Display the average difference in degrees from the truth
            const ylabel = makeDiv(null, 'ptsot-results-value user', `${Math.round(a.difference)}°`);
            y.append(ylabel);
            const g = document.createElement('td');
            const glabel = makeDiv(null, 'ptsot-results-value global');
            g.append(glabel);
            l.append(t, y, g);
            table.append(l);
        });

        container.append(table);
        text.append(container);

        // Send the results
        ajaxPost('ptsot', results, r => {
            // Retrieve the global average difference from the truth and add it to the table
            r.differences.forEach((d, i) => {
                table.children[i + 1].lastElementChild.firstElementChild.innerHTML = `${Math.round(d)}°`;
            });
        });

        // Wait for the page transition
        wait(this.params.interface.transition.page, () => {
            // Activate the continue button
            addClass(pursue, 'pop');
            this.listen = true;
            // Listener on the continue button to go back to the levels
            pursue.addEventListener('click', () => {
                this.playButtonSound();
                this.toLevels(true);
            }, { once: true });
        });
    }

    /**
     * Creates the bottom content of the experience.
     * This function creates a page which displays the text and possibly the timer or characters
     * depending on the current stage of the experience.
     * @param {boolean} forwards - Whether the user is advancing or going back in the experience.
     */
    createBottomContent(forwards = true) {
        // Get the page elements depending on the stage
        let elements = this.elements[this.tutorial ? 'tutorial' : 'tests'];
        let content = elements[this.index].content;
        let first = this.index === 0 && forwards && this.tutorial;
        this.texts = [];

        /**
         * Listener for the back button click event.
         */
        const backListener = () => {
            this.back.removeEventListener('click', backListener);
            this.playButtonSound();
            this.listen = false;
            let o = this.options;
            // Set the presentation as the previous page
            o.stage = 'presentation';
            o.position = 'previous';
            o.answers = this.answers;
            // Create the previous page
            this.previous = new SpatialOrientation(o);
            this.slidePrevious();
        }

        // Create the DOM elements
        this.bottomcontent = makeDiv(null, 'experience-content ptsot bottom');
        if (first) { addClass(this.bottomcontent, 'pop'); }
        this.continue = makeDiv(null, 'page-button page-button-continue', 'Continuer');
        this.bottomtext = makeDiv(null, 'experience-text bottom nobutton pop');
        this.bottomcontent.append(this.bottomtext, this.continue);
        this.content.append(this.bottomcontent);

        let tutotest = false;
        // Loop through the content and generate the page depending on the type
        content.forEach(e => {
            if (e.type === 'characters') {
                this.generateCharacters(this.bottomtext, e.subtype);
            }
            else if (e.type === 'tutorial') {
                // Create the interactable tutorial circle
                this.generateCircle(this.bottomtext, e);
            }
            else if (e.type === 'test') {
                // Create the interactable test circle
                this.generateCircle(this.bottomtext, e);
                tutotest = true;
            }
            else if (e.type === 'timer') {
                // Create the timer
                this.generateTimer(this.bottomtext, () => {
                    // If we are not in the tutorial, store the answer
                    if (!this.tutorial) {
                        this.answer.elapsed = Math.round(this.elapsed);
                        this.answers.push(this.answer);
                        this.answer = {};
                    }
                    this.back.removeEventListener('click', backListener);

                    // If we are at the last test
                    if (this.index === elements.length - 1) {
                        this.index = undefined;
                        // Progress the application
                        this.app.progress();
                        let o = this.options;
                        // Go to the results page
                        o.stage = 'results';
                        o.position = 'next';
                        o.answers = this.answers;
                        this.next = new SpatialOrientation(o);
                        this.slideNext();
                    }
                    // Here, we are not at the last test so we continue to the next test
                    else {
                        ++this.index;
                        this.navigateBottom();
                    }
                });
            }
            // We add a simple text
            else {
                // If not in the tutorial, add the test number asa title
                if (!this.tutorial) {
                    let title = makeDiv(null, 'ptsot-characters-text title bottom', `Test ${parseInt(this.index) + 1}/${this.elements.tests.length}`);
                    this.bottomtext.append(title);
                }
                let bottom = makeDiv(null, 'ptsot-characters-text bottom', e.text.replace(/<b>(.*?)<\/b>/gi, '<span>$1</span>'));
                this.bottomtext.append(bottom);
            }
        });

        // If not in the tutorial, remove back button
        if (!this.tutorial) {
            removeClass(this.back, 'pop');
            addClass(this.toptext, 'nobutton');
        }

        // If we are in the test, pop the bottom window
        if (this.index > 0 || !forwards || !this.tutorial) {
            this.bottomcontent.offsetHeight;
            addClass(this.bottomcontent, 'pop');
        }

        // Wait for the window pop transition
        const transition = first ? this.app.options.interface.transition.page : 300;
        wait(transition, () => {
            // if tutorial, pop the back button
            if (this.tutorial) {
                // If tutorial test, pop the continue button
                if (!tutotest) { addClass(this.continue, 'pop'); }
                addClass(this.back, 'pop');
                removeClassList([this.toptext, this.bottomtext], 'nobutton');
            }
            this.listen = true;
            // Display character names
            this.displayTexts();

            // Listener for the back button
            this.back.addEventListener('click', backListener);
            // Listener for the continue button
            this.continue.addEventListener('click', () => {
                this.playButtonSound();

                // If not tutorial, stores the answer
                if (!this.tutorial) {
                    this.answer.difference = Math.abs(this.answer.trueAngle - this.answer.drawAngle);
                    this.answer.elapsed = Math.round(this.elapsed);
                    this.answers.push(this.answer);
                    this.answer = {};
                }

                // Remove the back button listener
                this.back.removeEventListener('click', backListener);
                // If we are at the last test
                if (this.index === elements.length - 1) {
                    // If we are in the tutorial, change test
                    if (this.tutorial) {
                        this.index = 0;
                        this.tutorial = false;
                        this.navigateBottom();
                    }
                    // If not in the tutorial, progress the application
                    else {
                        this.index = undefined;
                        this.app.progress();
                        let o = this.options;
                        // Go to the results page
                        o.stage = 'results';
                        o.position = 'next';
                        o.answers = this.answers;
                        this.next = new SpatialOrientation(o);
                        this.slideNext();
                    }
                }
                // Here, we are not at the last test so we continue to the next test
                else {
                    ++this.index;
                    this.navigateBottom();
                }
            }, { once: true });
        });
    }

    /**
     * Generates the characters elements in the given container.
     * @param {Element} container - The container where the characters will be appended.
     * @param {string} type - The type of characters to generate. Can be either 'images' or 'names'.
     */
    generateCharacters(container, type) {
        let charcontainer = makeDiv(null, 'ptsot-characters-container');
        // Loop through each characters element
        for (let [c, infos] of Object.entries(this.elements.characters)) {
            // If type images
            if (type === 'images') {
                // Create the image character with its sprite
                let character = makeDiv(null, 'ptsot-characters-character hidden ' + c);
                let image = document.createElement('img');
                image.src = this.params.sprites[`ptsot:${c}`];
                image.alt = infos.name;
                character.append(image);
                // Position the character at the right coordinates defined in the configuration
                character.style.left = infos.coordinates[0] + '%';
                character.style.top = infos.coordinates[1] + '%';
                charcontainer.append(character);
            }
            // If type names
            else if (type === 'names') {
                // Create the name character and position it
                let name = makeDiv(null, 'ptsot-characters-name ' + c, infos.name);
                name.style.left = infos.coordinates[0] + '%';
                name.style.top = infos.coordinates[1] + '%';
                charcontainer.append(name);
            }

            // Create the point and position it
            let point = makeDiv(null, 'ptsot-characters-point ' + c);
            point.style.left = infos.coordinates[0] + '%';
            point.style.top = infos.coordinates[1] + '%';
            charcontainer.append(point);
        }
        container.append(charcontainer);
    }

    /**
     * Generates a circle on the given container.
     * @param {Element} container - The container where the circle will be appended.
     * @param {Object} options - The options of the circle. Can contain the following properties:
     *   - {string} type: The type of circle to generate. Can be either 'test' or 'result'.
     *   - {string} character1: The first character.
     *   - {string} character2: The second character.
     *   - {string} character3: The third character.
     */
    generateCircle(container, options) {
        // Create the SVG and its container
        let svgcontainer = makeDiv(null, 'ptsot-svg-container');
        let svg = document.createElementNS(this.namespace, 'svg');
        svgcontainer.append(svg);
        container.append(svgcontainer);
        container.offsetWidth;

        // Set SVG size and viewBox
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${svgcontainer.offsetWidth} ${svgcontainer.offsetHeight}`);

        // Set a padding of 20% to the SVG
        let padding = Math.min(20 * svgcontainer.offsetHeight / 100, 20 * svgcontainer.offsetWidth / 100);
        let center = { x: svgcontainer.offsetWidth / 2, y: svgcontainer.offsetHeight / 2 }
        let radius = Math.min(svgcontainer.offsetHeight / 2 - padding, svgcontainer.offsetWidth / 2 - padding);

        // Create the user point at center
        let p1 = document.createElementNS(this.namespace, 'circle');
        p1.setAttribute('class', 'point1');
        p1.setAttribute('cx', center.x);
        p1.setAttribute('cy', center.y);

        // Create the point of the character the user is facing
        let p2 = document.createElementNS(this.namespace, 'circle');
        p2.setAttribute('class', 'point2');
        p2.setAttribute('cx', center.x);
        p2.setAttribute('cy', padding);

        // Create the circle around the user
        let circle = document.createElementNS(this.namespace, 'circle');
        circle.setAttribute('class', 'circle');
        circle.setAttribute('cx', center.x);
        circle.setAttribute('cy', center.y);
        circle.setAttribute('r', radius);

        // Create the line between user and facing point
        let line = document.createElementNS(this.namespace, 'line');
        line.setAttribute('class', 'line1');
        line.setAttribute('x1', center.x);
        line.setAttribute('y1', center.y);
        line.setAttribute('x2', center.x);
        line.setAttribute('y2', padding);

        // Append the circle to the SVG
        svg.append(circle);

        // Calculate the angle between the user, the character the user is facing and the character the user must find
        let angle = this.calculateNameAngles(options.character1, options.character2, options.character3);
        // Array storing svg elements (lines and points) that are currently displayed
        // This allows us to have multiple circles and lines during hide and display animations
        let tutoelements = [];

        // If this is a tutorial
        if (this.tutorial) {
            // Create the point of the character the user must find
            let p3 = document.createElementNS(this.namespace, 'circle');
            p3.setAttribute('class', 'point-solution');
            // Deduce the position of the third character on the circle based on the angle
            const rad = angle * Math.PI / 180;
            const [p3x, p3y] = [center.x + radius * Math.sin(rad), center.y - radius * Math.cos(rad)]
            p3.setAttribute('cx', p3x);
            p3.setAttribute('cy', p3y);

            // Create the line between the user and the character the user must find
            let line2 = document.createElementNS(this.namespace, 'line');
            line2.setAttribute('class', 'line-solution');
            line2.setAttribute('x1', center.x);
            line2.setAttribute('y1', center.y);
            line2.setAttribute('x2', p3x);
            line2.setAttribute('y2', p3y);

            // If it's a test, don't display the solution and store the elements
            if (options.type === 'test') {
                tutoelements = [line2, p3];
                addClassList(tutoelements, 'hidden');
            }

            // Add the line and point to the SVG
            svg.append(line2, p3);
        }

        // If it's a test (can be a standard or a tutorial test)
        if (options.type === 'test') {
            // Storage for the end points and the connecting lines
            let lines = [];
            let end = [];
            // Stores selected point coordinates
            let [x, y] = [0, 0];

            /**
             * Destroys the last line and point created
             */
            const destroyElements = () => {
                // If lines exist, pop them off the array and remove them from the DOM
                if (lines.length > 0) {
                    let oldline = lines.pop();
                    addClass(oldline, 'hidden');
                    wait(200, () => { oldline.remove(); })
                }
                // If end points exist, pop them off the array and remove them from the DOM
                if (end.length > 0) {
                    let oldend = end.pop();
                    addClass(oldend, 'hidden');
                    wait(200, () => { oldend.remove(); })
                }
                // Reset the storages
                lines = [];
                end = [];
            }

            /**
             * Creates the lines and points and appends them to the SVG
             */
            const createElements = () => {
                // Create the line
                let l = document.createElementNS(this.namespace, 'line');
                l.setAttribute('class', 'line-answer');
                l.setAttribute('x1', center.x);
                l.setAttribute('y1', center.y);
                l.setAttribute('x2', x);
                l.setAttribute('y2', y);
                lines.push(l);
                // Create the point at the current coordinates
                let p = document.createElementNS(this.namespace, 'circle');
                p.setAttribute('class', 'point-answer');
                p.setAttribute('cx', x);
                p.setAttribute('cy', y);
                end.push(p);
                // Keep the line and point hidden
                addClassList([p, l], 'hidden');
                svg.append(l, p);
                svgcontainer.offsetHeight;
                // Display both the line and point
                removeClassList([p, l], 'hidden');
            }

            /**
             * The down event handler that create the point and the line.
             * @param {Event} e - The event that triggered the function
             */
            const down = (e) => {
                e.preventDefault();
                // Destroy all current elements
                destroyElements();
                // Remove event listeners
                svgcontainer.removeEventListener('touchstart', down);
                svgcontainer.removeEventListener('mousedown', down);
                // Get the coordinates of the event in pixels
                [x, y] = this.getRelativeCoordinates(svgcontainer, e);
                // Project the point on the circle
                [x, y] = this.projectPointOnCircle(center.x, center.y, radius, x, y);
                // Create the point and line
                createElements(x, y);
                // Reappend the user point so it stays on top
                svg.appendChild(p1);
                // Add the moving and mouse/touch stop events
                svgcontainer.addEventListener('touchmove', move);
                svgcontainer.addEventListener('mousemove', move);
                svgcontainer.addEventListener('touchend', up);
                svgcontainer.addEventListener('mouseup', up);
            };

            /**
             * The move event handler that updates the line and point as the user is moving.
             * @param {Event} e - The event that triggered the function
             */
            const move = (e) => {
                e.preventDefault();
                // Get the current position coordinates and project it on the circle
                [x, y] = this.getRelativeCoordinates(svgcontainer, e);
                [x, y] = this.projectPointOnCircle(center.x, center.y, radius, x, y);
                // Update the last created line and point
                lines[0].setAttribute('x2', x);
                lines[0].setAttribute('y2', y);
                end[0].setAttribute('cx', x);
                end[0].setAttribute('cy', y);
            };

            /**
             * Event listener when the user stops its interaction with the SVG.
             * @param {Event} e - The event that triggered the function
             */
            const up = (e) => {
                e.preventDefault();
                // Removes all moving and mouse/touch events
                svgcontainer.removeEventListener('touchmove', move);
                svgcontainer.removeEventListener('mousemove', move);
                svgcontainer.removeEventListener('touchend', up);
                svgcontainer.removeEventListener('mouseup', up);

                // Display the continue button
                addClass(this.continue, 'pop');
                removeClass(this.bottomtext, 'nobutton');

                // If tutorial, display the solution on the circle
                if (this.tutorial) {
                    removeClassList(tutoelements, 'hidden');
                    this.displayTextSolution();
                }
                // If not tutorial, save the answer
                else {
                    this.answer = {
                        trueAngle: angle,
                        // Stores the difference from the true angle
                        drawAngle: 360 - this.calculateAngle(center, { x: center.x, y: padding }, { x: x, y: y }),
                        time: new Date().toISOString()
                    };
                }

                // Reactivate the click event
                svgcontainer.addEventListener('touchstart', down);
                svgcontainer.addEventListener('mousedown', down);
            };

            // Activate the click event
            svgcontainer.addEventListener('touchstart', down);
            svgcontainer.addEventListener('mousedown', down);
        }

        // Add the player point, the faced character point and the line on the SVG
        svg.append(line, p1, p2);

        // Add the characters label to the SVG
        this.createCharactersLabels(svg, options.type, {
            center: center,
            radius: radius + 10,
            character1: options.character1,
            character2: options.character2,
            character3: options.character3,
            angle: angle
        });
    }

    generateTimer(container, callback) {
        this.activeTimer = true;

        let timercontainer = makeDiv(null, 'ptsot-timer-container');
        let timerdiv = makeDiv(null, 'ptsot-timer');
        timercontainer.append(timerdiv);
        container.append(timercontainer);
        let index = this.index;
        let start = performance.now();
        this.elapsed = 0;
        const timer = () => {
            if (index === this.index) {
                let time = performance.now();
                this.elapsed = time - start;
                if (this.elapsed >= this.timelimit * 1000) {
                    callback();
                } else {
                    let perc = 100 - (this.elapsed * 100 / (this.timelimit * 1000));
                    if (perc <= 50) {
                        if (perc > 25) { addClass(timerdiv, 'half'); }
                        else { addClass(timerdiv, 'quarter'); }
                    }
                    timerdiv.style.width = `${perc}%`;
                    requestAnimationFrame(timer);
                }
            }
        };
        requestAnimationFrame(timer);
    }

    navigateBottom(forwards = true) {
        this.listen = false;
        removeClass(this.bottomcontent, 'pop');
        wait(300, () => {
            this.bottomcontent.remove();
            this.createBottomContent(forwards);
        });
    }

    toLevels(update) {
        this.index = undefined;
        this.listen = false;
        if (this.topcontent) { removeClass(this.topcontent, 'pop'); }
        if (this.bottomcontent) { removeClass(this.bottomcontent, 'pop'); }
        else { removeClass(this.content, 'pop'); }

        wait(300, () => {
            this.destroy();
            this.basemap.fit(this.params.interface.map.levels, {
                easing: easeInOutSine
            }, () => {
                this.app.page = new Levels({ app: this.app, position: 'current', update: update });
            });
        });
    }

    /**
     * Create the SVG elements for the character labels of the given type (e.g. 'solution' or 'problem')
     * @param {SVGSVGElement} svg - the SVG element to append the character labels
     * @param {string} type - the type of the character labels (e.g. 'solution' or 'problem')
     * @param {object} options - options for creating the character labels
     * - {object} options.center - center coordinates of the circle
     * - {number} options.radius - radius of the circle
     * - {number} options.character1 - index of the first character
     * - {number} options.character2 - index of the second character
     * - {number} options.character3 - index of the third character (only for 'solution' type)
     * - {boolean} options.angle - angle of rotation of the third character (only for 'solution' type)
     */
    createCharactersLabels(svg, type, options) {
        let characters = this.elements.characters;
        let c = options.center;
        let r = options.radius;

        // Create the name of the user's character
        let name1 = document.createElementNS(this.namespace, 'text');
        name1.textContent = characters[options.character1].name;
        name1.setAttribute('class', 'hidden');
        name1.setAttribute('x', c.x);
        name1.setAttribute('y', c.y + remToPx(1));
        name1.setAttribute('text-anchor', 'middle');

        // Create the curved path following the circle that will be used to display the characters' names
        const path = document.createElementNS(this.namespace, 'path');
        path.setAttribute("id", 'circle-path');
        path.setAttribute("d", `M ${c.x},${c.y} m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`);
        let defs = document.createElementNS(this.namespace, 'defs');
        svg.appendChild(defs);
        defs.appendChild(path);

        // Display the faced character's name
        const text2 = document.createElementNS(this.namespace, 'text');
        text2.setAttribute('class', 'hidden');
        const textPat2 = document.createElementNS(this.namespace, 'textPath');
        textPat2.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#circle-path');
        textPat2.setAttribute('startOffset', '25%');
        textPat2.setAttribute('text-anchor', 'middle');
        textPat2.textContent = characters[options.character2].name;
        text2.append(textPat2);

        svg.append(name1, text2);
        this.texts = [name1, text2];

        // If it's the tutorial, display the third character's name
        if (this.tutorial) {
            const text3 = document.createElementNS(this.namespace, 'text');
            text3.setAttribute('class', 'hidden');
            addClass(text3, 'text-solution');
            addClass(text3, type);
            const textPath3 = document.createElementNS(this.namespace, 'textPath');
            textPath3.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#circle-path');
            textPath3.setAttribute('startOffset', 25 + (100 * options.angle / 360) + '%');
            textPath3.setAttribute('text-anchor', 'middle');
            textPath3.textContent = characters[options.character3].name;
            text3.append(textPath3);
            svg.append(text3);
            this.texts.push(text3);
        }
    }

    /**
     * Display the character names.
     */
    displayTexts() {
        this.texts.forEach(text => {
            if (!hasClass(text, 'test')) {
                removeClass(text, 'hidden');
            }
        });
    }

    /**
     * Display the solution character names.
     */
    displayTextSolution() {
        this.texts.forEach(text => {
            if (hasClass(text, 'test')) {
                removeClass(text, 'hidden');
            }
        });
    }

    /**
     * Calculate the angle between the 3 character names.
     * @param {string} name1 - The first character name.
     * @param {string} name2 - The second character name.
     * @param {string} name3 - The third character name.
     * @returns {number} The angle between the character names in degrees.
     */
    calculateNameAngles(name1, name2, name3) {
        // Get the size of the container
        let charactercontainer = this.toptext.querySelector('.ptsot-characters-container');
        const width = charactercontainer.offsetWidth;
        const height = charactercontainer.offsetHeight;
        // Get the three points elements
        let e1 = charactercontainer.querySelector('.ptsot-characters-point.' + name1);
        let e2 = charactercontainer.querySelector('.ptsot-characters-point.' + name2);
        let e3 = charactercontainer.querySelector('.ptsot-characters-point.' + name3);
        // Retrieve the coordinates of the three points
        const p1 = { x: parseFloat(e1.style.left) * width / 100, y: (100 - parseFloat(e1.style.top)) * height / 100 };
        const p2 = { x: parseFloat(e2.style.left) * width / 100, y: (100 - parseFloat(e2.style.top)) * height / 100 };
        const p3 = { x: parseFloat(e3.style.left) * width / 100, y: (100 - parseFloat(e3.style.top)) * height / 100 };
        // Returns the angle
        return this.calculateAngle(p1, p2, p3);
    }

    /**
     * Calculate the angle between the 3 points.
     * @param {Object} p1 - The first point with x and y coordinates.
     * @param {Object} p2 - The second point with x and y coordinates.
     * @param {Object} p3 - The third point with x and y coordinates.
     * @returns {number} The angle between the points in degrees.
     */
    calculateAngle(p1, p2, p3) {
        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const v2x = p3.x - p1.x;
        const v2y = p3.y - p1.y;
        const a1 = Math.atan2(v1y, v1x);
        const a2 = Math.atan2(v2y, v2x);
        let angle = a1 - a2;
        if (angle < 0) angle += 2 * Math.PI;
        return angle * 180 / Math.PI;
    }


    /**
     * Project a point onto a circle.
     * @param {number} cx - Center x of the circle.
     * @param {number} cy - Center y of the circle.
     * @param {number} r - Radius of the circle.
     * @param {number} x - X coordinate of the point.
     * @param {number} y - Y coordinate of the point.
     * @returns {Array} - The projected point coordinates [x, y].
     */
    projectPointOnCircle(cx, cy, r, x, y) {
        const vx = x - cx;
        const vy = y - cy;
        const len = Math.hypot(vx, vy);
        // avoid dividing by zero
        if (len === 0) return [cx + r, cy];
        const ux = vx / len;
        const uy = vy / len;
        const x1 = cx + r * ux;
        const y1 = cy + r * uy;
        return [x1, y1];
    }

    /**
     * Retrieves the relative coordinates of an event within a given container.
     * @param {HTMLElement} container - The container element to get the relative coordinates from.
     * @param {Event} event - The event to get the coordinates from.
     * @returns {Array<number>} - The relative coordinates [x, y] of the event in the container.
     */
    getRelativeCoordinates(container, event) {
        const touch = event.touches ? event.touches[0] : event;
        const rect = container.getBoundingClientRect();
        // Get the coordinates of the event
        const xRel = touch.clientX - rect.left;
        const yRel = touch.clientY - rect.top;
        const vb = container.querySelector('svg').viewBox.baseVal;
        // Calculate the position based on the viewBox
        const x = xRel / rect.width * vb.width + vb.x;
        const y = yRel / rect.height * vb.height + vb.y;
        return [x, y];
    }
}

export default SpatialOrientation;