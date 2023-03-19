/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {PropertyParser} from "@tsjs/entity/PropertyParser";

/**
 * Property parser for: sound-information
 *
 * SoundBag at it's core is always a map:
 * {
 *     "sound-name1": "sound-url",  // << simple entry
 *     "sound-name2": [ // sound-mix-desc
 *         "sound-url",
 *         sound-volume(default=1),
 *         sound-pitch(default=1),
 *         sound-offset(default=0)
 *     ]
 * }
 *
 * The output is also a map. But the array is transformed to a expressive format:
 * {
 *     "sound-name1": "sound-url",  // << simple entry
 *     "sound-name2": {
 *         "url": "sound-url",
 *         "gain": gain,
 *         "pitch": pitch,
 *         "suspend": suspend
 *     }
 *      "sound-name3": {
 *         "url": "sound-url",
 *         "gain": gain
 *         "pitch": [0.5, 2], // < random pitch between 0.5 and 2
 *         "suspend": suspend
 *     }
 * }
 *
 * pitch can be an array of two values.
 *
 */
export class SoundBagPropertyParser extends PropertyParser {

    constructor() {
        super("soundbag");
    }

    /**
     *
     * @param {String} propertyName the name
     * @param {Object} propertyInfo data from the component
     * @param {Object} instanceValue unparsed value from the instance
     * @param {Object} outProps object that
     * @return {undefined|string} undefined: okay, string: error desc;
     */
    parse(propertyName, propertyInfo, instanceValue, outProps) {
        const parsedValue = {};
        if (typeof instanceValue == "string") {
            try {
                instanceValue = JSON.parse(instanceValue);
            }
            catch(err) {
                return `SoundFxBag failed to parse this JSON:\n ${instanceValue}`;
            }
        }

        const keys = instanceValue === false ? [] : Object.keys(instanceValue);
        for (let i=0; i<keys.length; i++) {
            const key = keys[i];
            const val = instanceValue[key];
            if (Array.isArray(val)) {
                // sound-mix
                const mix:any[] = [];
                for (let i2=0; i2<val.length; i2++) {
                    const soundMixEntry = val[i2];

                    if (Array.isArray(soundMixEntry)) {
                        const url = soundMixEntry.length > 0 ? (soundMixEntry[0] || null) : null;
                        const gain = Number(soundMixEntry.length > 1 ? (soundMixEntry[1] || 1) : 1);
                        const pitch = soundMixEntry.length > 2 ? (soundMixEntry[2] || 1) : 1;
                        const suspend = Number(soundMixEntry.length > 3 ? (soundMixEntry[3] || 0) : 0);

                        if (url == null || typeof url !== "string")
                            return "A sound mix entry must have at least an URL entry. Plz check SoundBagPropertyParser.js for details.";

                        if (Array.isArray(pitch) && pitch.length != 2)
                            return "Gain value in a sound mix must either be a number or an array of two numbers.  Plz check SoundBagPropertyParser.js for details.";

                        mix.push({
                            url: url,
                            gain: gain,
                            pitch: pitch,
                            suspend: suspend,
                        });
                    }
                    else {
                        return "A sound mix entry must be an array too. Plz check SoundBagPropertyParser.js for details."
                    }

                }
                parsedValue[key] = mix;
            }
            else if (typeof val === "string") {
                parsedValue[key] = val;
            }
            else {
                return "SoundBag entry must either be a string with a path or an array with a sound mix. Please check SoundBagPropertyParser.js for details.";
            }
        }

        outProps[propertyName] = parsedValue;
    }
}