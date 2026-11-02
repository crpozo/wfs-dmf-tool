/*
 * House footprint for the static demo, looked up from the browser. Same source and rules
 * as app/Services/BuildingFootprints.php (FEMA USA Structures, which allows cross-origin
 * requests): the largest building inside a closed fence; for an open fence the one whose
 * walls are nearest its two end points; else the one nearest the middle of the drawing,
 * preferring the more detailed outline when a house appears twice.
 */
const SERVICE = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0/query';
const SEARCH_MARGIN_METERS = 25;
// An open fence end this close to a building's walls is taken as attached to it.
const ANCHOR_METERS = 6;

const center = (points) => ({
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
});

function distance(a, b) {
    const dy = (a.lat - b.lat) * 110540;
    const dx = (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
    return Math.hypot(dx, dy);
}

function contains(polygon, point) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        if ((a.lat > point.lat) !== (b.lat > point.lat)
            && point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng) {
            inside = !inside;
        }
    }
    return inside;
}

async function buildingsAround(vertices) {
    const lats = vertices.map((v) => v.lat);
    const lngs = vertices.map((v) => v.lng);
    const marginLat = SEARCH_MARGIN_METERS / 110540;
    const marginLng = SEARCH_MARGIN_METERS / (111320 * Math.cos((center(vertices).lat * Math.PI) / 180));
    const params = new URLSearchParams({
        geometry: [Math.min(...lngs) - marginLng, Math.min(...lats) - marginLat, Math.max(...lngs) + marginLng, Math.max(...lats) + marginLat]
            .map((value) => value.toFixed(5)).join(','),
        geometryType: 'esriGeometryEnvelope',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'OCC_CLS,PRIM_OCC,HEIGHT,SQMETERS',
        returnGeometry: 'true',
        outSR: '4326',
        f: 'geojson',
    });
    const response = await fetch(`${SERVICE}?${params}`);
    const data = await response.json();
    if (!response.ok || data.error) {
        return [];
    }
    return (data.features || [])
        .filter((feature) => feature.geometry?.type === 'Polygon' && feature.geometry.coordinates?.[0]?.length >= 4)
        .map((feature) => {
            const outline = feature.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
            return {
                outline,
                center: center(outline),
                area: Number(feature.properties?.SQMETERS) || 0,
                height: feature.properties?.HEIGHT,
                occupancy: feature.properties?.OCC_CLS || null,
                use: feature.properties?.PRIM_OCC || null,
            };
        });
}

// Distance in meters from a point to the nearest edge of an outline.
function distanceToOutline(point, outline) {
    const cosLat = Math.cos((point.lat * Math.PI) / 180);
    const toXY = (p) => [(p.lng - point.lng) * 111320 * cosLat, (p.lat - point.lat) * 110540];
    let nearest = Infinity;
    for (let i = 0; i < outline.length; i++) {
        const [ax, ay] = toXY(outline[i]);
        const [bx, by] = toXY(outline[(i + 1) % outline.length]);
        const dx = bx - ax;
        const dy = by - ay;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
        nearest = Math.min(nearest, Math.hypot(ax + dx * t, ay + dy * t));
    }
    return nearest;
}

// The building whose walls are nearest both ends of an open fence, or null.
function anchoredTo(start, end, buildings) {
    let best = null;
    let bestScore = Infinity;
    for (const building of buildings) {
        const toStart = distanceToOutline(start, building.outline);
        const toEnd = distanceToOutline(end, building.outline);
        if (Math.min(toStart, toEnd) <= ANCHOR_METERS && toStart + toEnd < bestScore) {
            bestScore = toStart + toEnd;
            best = building;
        }
    }
    return best;
}

function mostDetailed(chosen, buildings) {
    for (const building of buildings) {
        if (distance(building.center, chosen.center) < 6 && building.outline.length > chosen.outline.length) {
            chosen = building;
        }
    }
    return chosen;
}

function result(building) {
    const height = Number.isFinite(building.height) && building.height >= 2.5 && building.height <= 15
        ? Math.round(building.height * 3.28084 * 10) / 10
        : 11;
    return { outline: building.outline.map((p) => [p.lat, p.lng]), height_ft: height, occupancy: building.occupancy, use: building.use };
}

// Same answer shape as POST /property-map/scene: { house }.
export async function fetchScene(project) {
    const vertices = project.vertices;
    if (vertices.length < 2) {
        return { house: null };
    }
    let buildings;
    try {
        buildings = await buildingsAround(vertices);
    } catch {
        return { house: null };
    }
    if (!buildings.length) {
        return { house: null };
    }

    const last = vertices.length - 1;
    const closed = vertices.length >= 3 && project.runs.some((run) => run.from === last && run.to === 0);
    if (closed) {
        const inside = buildings.filter((building) => contains(vertices, building.center)).sort((a, b) => b.area - a.area);
        if (inside.length) {
            return { house: result(mostDetailed(inside[0], buildings)) };
        }
    }

    if (!closed) {
        const anchored = anchoredTo(vertices[0], vertices[last], buildings);
        if (anchored) {
            return { house: result(mostDetailed(anchored, buildings)) };
        }
    }

    const middle = center(vertices);
    buildings.sort((a, b) => distance(a.center, middle) - distance(b.center, middle));
    return { house: distance(buildings[0].center, middle) <= 60 ? result(mostDetailed(buildings[0], buildings)) : null };
}
