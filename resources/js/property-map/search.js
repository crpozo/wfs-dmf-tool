/*
 * Address search (Places Autocomplete, US only, biased to Lee and Charlotte counties)
 * and "Use my location" (browser geolocation + reverse geocoding).
 */

// Roughly between Fort Myers and Port Charlotte; 50 km is the largest bias radius allowed.
const SERVICE_AREA_BIAS = { center: { lat: 26.8, lng: -81.95 }, radius: 50000 };

export function mountSearch({ root, map, store, places, geocoder, onLocated, notify }) {
    const slot = root.querySelector('[data-pm-search]');
    const addressLine = root.querySelector('[data-pm-address]');
    const locateButton = root.querySelector('[data-pm-action="locate"]');

    const autocomplete = new places.PlaceAutocompleteElement({
        includedRegionCodes: ['us'],
        locationBias: SERVICE_AREA_BIAS,
    });
    autocomplete.id = 'propertyMapAddress';
    autocomplete.setAttribute('placeholder', 'Enter your property address');
    autocomplete.setAttribute('aria-label', 'Property address');
    slot.appendChild(autocomplete);

    // Current releases fire gmp-select with a prediction; older ones gmp-placeselect with a place.
    autocomplete.addEventListener('gmp-select', async (event) => {
        await selectPlace(event.placePrediction.toPlace());
    });
    autocomplete.addEventListener('gmp-placeselect', async (event) => {
        await selectPlace(event.place);
    });

    async function selectPlace(place) {
        try {
            await place.fetchFields({ fields: ['id', 'formattedAddress', 'location'] });
            const location = (await geocodePlace(place.id)) || place.location?.toJSON();
            if (!location) {
                notify('We could not find that address. Please try another one.');
                return;
            }
            locate({ address: place.formattedAddress, placeId: place.id, center: location });
        } catch (error) {
            console.error(error);
            notify('We could not find that address. Please try another one.');
        }
    }

    async function geocodePlace(placeId) {
        try {
            const { results } = await geocoder.geocode({ placeId });
            return results[0]?.geometry.location.toJSON() || null;
        } catch {
            return null;
        }
    }

    locateButton?.addEventListener('click', () => {
        if (!navigator.geolocation) {
            notify('Your browser does not share its location. Please type your address instead.');
            return;
        }
        locateButton.disabled = true;
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                locateButton.disabled = false;
                const center = { lat: position.coords.latitude, lng: position.coords.longitude };
                const match = await reverseGeocode(center);
                locate({ address: match?.formatted_address || '', placeId: match?.place_id || null, center });
            },
            () => {
                locateButton.disabled = false;
                notify('We could not access your location. Please type your address instead.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    });

    async function reverseGeocode(location) {
        try {
            const { results } = await geocoder.geocode({ location });
            return results[0] || null;
        } catch {
            return null;
        }
    }

    function locate({ address, placeId, center }) {
        map.setCenter(center);
        map.setZoom(20);
        store.setLocation({ address, placeId, center });
        onLocated?.();
    }

    function renderAddress() {
        const { address } = store.state;
        addressLine.textContent = address ? address : '';
        addressLine.hidden = !address;
    }

    store.subscribe(renderAddress);
    renderAddress();
}
