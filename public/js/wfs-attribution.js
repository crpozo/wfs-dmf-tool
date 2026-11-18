/*
 * Campaign attribution shared by westernfencesupply.com and Draw My Fence.
 *
 * Stores the visitor's campaign data in the first-party cookie `wfs_attribution`
 * (JSON, 90 days, shared across *.westernfencesupply.com), with localStorage as
 * a fallback. First touch: once the stored data has campaign values it is never
 * replaced. A stored visit with no campaign values is replaced by the first
 * visit that brings them, so a later ad click is not lost.
 */
(function (window, document) {
    'use strict';

    var COOKIE = 'wfs_attribution';
    var ROOT_DOMAIN = 'westernfencesupply.com';
    var MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
    var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var CLICK_KEYS = ['gclid', 'fbclid', 'ttclid'];
    var CAMPAIGN_KEYS = UTM_KEYS.concat(CLICK_KEYS);
    var URL_KEYS = ['landing_page', 'referrer'];
    var ALL_KEYS = CAMPAIGN_KEYS.concat(URL_KEYS);
    var MAX_LENGTH = { utm: 150, click: 255, url: 500 };

    // Agreed source names (Nov 2026): forms and calls must read the same in
    // Odoo. Common variants are folded into google, gbp, meta and tiktok.
    var SOURCE_ALIASES = {
        google: ['google', 'googleads', 'google-ads', 'google_ads', 'adwords', 'google.com', 'gads'],
        gbp: ['gbp', 'gmb', 'google-business', 'google_business', 'googlebusiness', 'google-business-profile',
            'google_business_profile', 'google-my-business', 'google_my_business', 'business-profile'],
        meta: ['meta', 'facebook', 'fb', 'instagram', 'ig', 'facebook.com', 'instagram.com', 'meta-ads',
            'meta_ads', 'facebook-ads', 'facebook_ads', 'fb-ads', 'fb_ads', 'm.facebook.com', 'l.facebook.com'],
        tiktok: ['tiktok', 'tik-tok', 'tik_tok', 'tiktok-ads', 'tiktok_ads', 'tiktok.com', 'tt']
    };
    // With no utm_source, the click ID tells which platform sent the visit.
    var SOURCE_FROM_CLICK = { gclid: 'google', fbclid: 'meta', ttclid: 'tiktok' };

    function normalizeSource(data) {
        var source = (data.utm_source || '').toLowerCase();
        Object.keys(SOURCE_ALIASES).forEach(function (name) {
            if (SOURCE_ALIASES[name].indexOf(source) !== -1) { source = name; }
        });
        if (!source) {
            Object.keys(SOURCE_FROM_CLICK).forEach(function (key) {
                if (!source && data[key]) { source = SOURCE_FROM_CLICK[key]; }
            });
        }
        data.utm_source = source;
        return data;
    }

    function isOwnHost(hostname) {
        return hostname === ROOT_DOMAIN || hostname.slice(-(ROOT_DOMAIN.length + 1)) === '.' + ROOT_DOMAIN;
    }

    function blank() {
        var data = {};
        ALL_KEYS.forEach(function (key) { data[key] = ''; });
        return data;
    }

    function hasCampaign(data) {
        return !!data && CAMPAIGN_KEYS.some(function (key) { return !!data[key]; });
    }

    function readCookie() {
        var prefix = COOKIE + '=';
        var parts = document.cookie ? document.cookie.split('; ') : [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].indexOf(prefix) === 0) {
                try {
                    return JSON.parse(decodeURIComponent(parts[i].slice(prefix.length)));
                } catch (error) {
                    return null;
                }
            }
        }
        return null;
    }

    function readStorage() {
        try {
            var stored = JSON.parse(window.localStorage.getItem(COOKIE));
            if (stored && stored.expires > Date.now()) {
                return stored.data;
            }
        } catch (error) { /* storage blocked or corrupt */ }
        return null;
    }

    function read() {
        return readCookie() || readStorage();
    }

    function write(data) {
        // Browsers reject a Domain that is not the current site (staging hosts).
        var cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(data))
            + '; Max-Age=' + MAX_AGE_SECONDS + '; Path=/; SameSite=Lax';
        if (isOwnHost(window.location.hostname)) {
            cookie += '; Domain=.' + ROOT_DOMAIN;
        }
        if (window.location.protocol === 'https:') {
            cookie += '; Secure';
        }
        document.cookie = cookie;

        try {
            window.localStorage.setItem(COOKIE, JSON.stringify({
                data: data,
                expires: Date.now() + MAX_AGE_SECONDS * 1000
            }));
        } catch (error) { /* storage blocked */ }
    }

    function incomingCampaign() {
        var params = new URLSearchParams(window.location.search);
        var incoming = {};
        UTM_KEYS.forEach(function (key) {
            incoming[key] = (params.get(key) || '').trim().toLowerCase().slice(0, MAX_LENGTH.utm);
        });
        // Click IDs are case-sensitive: never change their case.
        CLICK_KEYS.forEach(function (key) {
            incoming[key] = (params.get(key) || '').trim().slice(0, MAX_LENGTH.click);
        });
        return normalizeSource(incoming);
    }

    function externalReferrer() {
        if (!document.referrer) {
            return '';
        }
        try {
            var referrer = new URL(document.referrer);
            if (isOwnHost(referrer.hostname) || referrer.hostname === window.location.hostname) {
                return '';
            }
            return (referrer.origin + referrer.pathname).slice(0, MAX_LENGTH.url);
        } catch (error) {
            return '';
        }
    }

    function capture() {
        var stored = read();
        var incoming = incomingCampaign();

        if (stored && (hasCampaign(stored) || !hasCampaign(incoming))) {
            return stored;
        }

        var data = blank();
        CAMPAIGN_KEYS.forEach(function (key) { data[key] = incoming[key]; });
        data.landing_page = (window.location.origin + window.location.pathname).slice(0, MAX_LENGTH.url);
        data.referrer = externalReferrer();
        write(data);

        return data;
    }

    var current = capture();

    window.WFSAttribution = {
        get: function () {
            var data = blank();
            var stored = read() || current;
            ALL_KEYS.forEach(function (key) {
                data[key] = stored && stored[key] ? String(stored[key]) : '';
            });
            // Also folds values saved before the agreed names existed.
            return normalizeSource(data);
        }
    };
})(window, document);
