import * as turf from "@turf/turf";
import { LngLat } from "maplibre-gl";
import proj4 from "proj4";

/**
 * Calculate a buffer around the given coordinates.
 * @param {array} coordinates The coordinates of the point.
 * @param {integer} size      The size of the buffer in meters.
 * @return {turf.Polygon}     turf.js Polygon geometry.
 */
function buffer(coordinates, size) {
    // Calculate the buffer around the coordinates
    return turf.buffer(turf.point(coordinates), size, { units: "meters", steps: 12 });
}

/**
 * Calculate a buffer around the given polygon.
 * @param {array} coordinates The coordinates of the point.
 * @param {integer} size      The size of the buffer in meters.
 * @return {turf.Polygon}     turf.js Polygon geometry.
 */
function bufferAroundPolygon(polygon, size) {
    let b = turf.buffer(polygon, size, { units: "meters", steps: 4 });
    let d = turf.difference(turf.featureCollection([b, polygon]));
    return d;
}

/**
 * Return the coordinates of the middle point between the two provided positions.
 * @param {array} position1 Coordinates of first position.
 * @param {array} position2 Coordinates of second position.
 * @return {array}          Coordinates of the middle position.
 */
function middle(position1, position2) {
    let x1, y1, x2, y2;
    [x1, y1] = position1;
    [x2, y2] = position2;
    return [(x1 + x2) / 2, (y1 + y2) / 2];
}

/**
 * Return true if position1 and position2 are within a given distance in meters.
 * @param {array} position1 Coordinates of first position.
 * @param {array} position2 Coordinates of second position.
 * @param {number} distance Distance in meters.
 * @return {boolean}        true if both position are within a given distance from each other.
 */
function within(position1, position2, distance) {
    let d = turf.distance(turf.point(position1), turf.point(position2), { units: "meters" });
    if (d > distance) { return false; }
    else { return true; }
}

/**
 * Return the angle of the line formed by two coordinates.
 * @param {array} position1 - Coordinates of the first position
 * @param {array} position2 - Coordinates of the first position
 * @return {number} - The angle formed by the two positions.
 */
function angle(position1, position2, proj = true) {
    if (proj) {
        position1 = project('4326', '3857', position1);
        position2 = project('4326', '3857', position2);
    }
    let x = position2[0] - position1[0];
    let y = position2[1] - position1[1];
    let a = Math.atan2(y, x);
    if (a < 0) { return a + 2 * Math.PI }
    else { return a }
}

/**
 * Project the given coordinates.
 * @param {string} epsg1 - Origin EPSG.
 * @param {string} epsg2 - Destination EPSG.
 * @param {Array} coordinates - Coordinates to project.
 * @returns {Array} - Projected coordinates.
 */
function project(epsg1, epsg2, coordinates) {
    return proj4(proj4.defs('EPSG:' + epsg1), proj4.defs('EPSG:' + epsg2), coordinates);
}

function toLongLat(coordinates) {
    let c = proj4(proj4.defs('EPSG:3857'), proj4.defs('EPSG:4326'), coordinates);
    return new LngLat(c[0], c[1]);
}

/**
 * Get a random point inside a given circle.
 * @param {float} center - Center of the circle.
 * @param {float} radius - Radius of the circle.
 * @returns {Array} - Random point coordinates.
 */
function randomPointInCircle(center, radius) {
    const pcenter = project('4326', '3857', center);
    const angle = Math.random() * 2 * Math.PI;
    const hypothenus = Math.sqrt(Math.random()) * radius;
    const adjacent = Math.cos(angle) * hypothenus;
    const opposite = Math.sin(angle) * hypothenus;
    let point = [pcenter[0] + adjacent, pcenter[1] + opposite]
    return project('3857', '4326', point);
}

function flatten(coordinates) {
    const coords = [];
    function rec(c) {
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
            coords.push(c);
        } else {
            c.forEach(flatten);
        }
    }
    rec(coordinates);
    return coords;
}

function mergeExtents(extents) {
    if (!extents || extents.length === 0) {
        return null;
    }
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    extents.forEach(extent => {
        const [[x1, y1], [x2, y2]] = extent;
        if (x1 < minX) minX = x1;
        if (y1 < minY) minY = y1;
        if (x2 > maxX) maxX = x2;
        if (y2 > maxY) maxY = y2;
    });
    return [[minX, minY], [maxX, maxY]];
}

function pointExtent(coordinates, radius) {
    const options = { units: 'meters' };
    const point = turf.point(coordinates);
    const north = turf.destination(point, radius, 0, options).geometry.coordinates;
    const east = turf.destination(point, radius, 90, options).geometry.coordinates;
    const south = turf.destination(point, radius, 180, options).geometry.coordinates;
    const west = turf.destination(point, radius, -90, options).geometry.coordinates;
    const minX = west[0];
    const maxX = east[0];
    const minY = south[1];
    const maxY = north[1];
    return [minX, minY, maxX, maxY];
}

function centroid(array) {
    let points = [];
    array.forEach(c => { points.push(turf.point(c)); })
    let fc = turf.featureCollection(points);
    return turf.centroid(fc).geometry.coordinates;
}

export {
    buffer, flatten, bufferAroundPolygon,
    middle, within, project, angle,
    randomPointInCircle, toLongLat, mergeExtents,
    pointExtent, centroid
}