import {Component} from "@tsjs/entity/Component";

/**
 * ## SoundFxBag-Component
 *
 * The property of sound should be like this:
 *
 * ```
 * {
 *     "muh": "assets/sounds/some_very_long_strange_name_with_cow.mp3",
 *     "meh": "assets/sounds/some_very_long_strange_name_with_meh.mp3",
 *     "multi": [
 *         ["mySound1.mp3", 1, 1, 0],
 *                          ^  ^  ^
 *                          |  |  suspend
 *                          |  pitch
 *                          gain
 *         ["mySound2.mp3", 1, 1, 0],
 *         ["mySound3.mp3", 1, [0.5, 2], 0], // random pitch between 0.5 and 2
 *     ]
 * }
 * ```
 *
 * If loaded successful one can do this:
 *
 * const sounds = entity.findComponent("SoundFxBag");
 * sounds.playSimple('muh'); // simple sound
 * const myHowlerSound = sounds.getSound('muh'); // full access
 *
 * ```
 * entity.sendMessage('PlaySfx', 'muh');
 * entity.sendMessage('PlaySfx', {name: 'muh', gain: 0.5} );
 * ```
 *
 * When sounds.playSimple('multi'); // is called both sounds are played at the given config
 *
 * If a pending sound mix-entry exists during discard the mix-entry
 * is still played using a setTimeout. This behavior can be undesired (e.g. causing effects
 * being played in the next scene). For that the option discardSounds is for. Just
 * put the discardSounds = {"multi": true} to make sure it does exceed lifetime of the
 * object.
 *
 * Set discardAll to true to make it a general options
 *
 */
export class SoundFxBag extends Component {


    static requires = {
        props:  {
            sounds: ["soundbag", false],
            discardSounds: ["any", {}],
            discardAll: ["bool", false], //{type: "enum", def: false, allowed: [true, false]},
        },
        cmps: [],
        res: function(props) {
            if (props.sounds) {
                let out:string[] = [];
                Object.keys(props.sounds).forEach(k => {
                    const url = props.sounds[k];
                    if (Array.isArray(url)) {
                        url.forEach(mixEntry => {
                            out.push("sound:" + mixEntry.url);
                        })
                    }
                    else {
                        out.push("sound:" + url);
                    }
                });
                if (out.length > 0)
                    return out;
            }
        },
        children: function(props) {}
    };


    public playLater:any[];
    public sounds:any;
    public soundEnabled:boolean;

    onInit() {
        this.sounds = {};
        this.playLater = [];
        const addPlayLater = (suspend, snd, mix) => {
            this.playLater.push([suspend, snd, mix]);
        };

        if (this.entity.props.sounds) {
            Object.keys(this.entity.props.sounds).forEach(name => {
                const entry = this.entity.props.sounds[name];
                if (Array.isArray(entry)) {
                    const mix = new SoundMix(addPlayLater);
                    for (let i=0; i<entry.length; i++) {
                        const mixEntry = entry[i];
                        const howlerObject = this.entity.manager.getResource("sound", mixEntry.url);
                        mix.addEntry(howlerObject, name, mixEntry.gain, mixEntry.pitch, mixEntry.suspend);
                    }
                    this.sounds[name] = mix;
                }
                else {
                    const howlerObject = this.entity.manager.getResource("sound", entry);
                    this.sounds[name] = howlerObject;
                }
            });
        }

        this.soundEnabled = true; //GlobalState.getGameOptions().isSoundEnabled();
    }
    onMessage_GlobalAudioSettingsChanged(msg) {
        this.soundEnabled = msg.sound;
    }
    getSound(name) {
        if (name == "-")
            return;

        if (this.sounds === undefined) {
            console.error("Error: getSound() called before SoundFxBag.onInit(). Components not in order?");
            return null;
        }
        return this.sounds[name] || null;
    }
    playSimple(name) {
        if (name == "-")
            return;

        const snd = this.getSound(name);
        if (snd) {
            if (!this.soundEnabled)
                return;
            snd.play();
        }
        else
            console.error("SoundFxBag.playSimple() cannot play sound", name);
    }
    play(name, gain, pitch) {
        if (name == "-")
            return;

        const snd = this.getSound(name);
        if (snd) {
            if (!this.soundEnabled)
                return;
            const id = snd.play();
            snd.volume(gain||1, id);
            snd.rate(pitch||1, id);
        }
        else
            console.error("SoundFxBag.playSimple() cannot play sound", name);
    }
    onMessage_PlaySound(msg) {
        if (typeof msg == "string") {
            const snd = this.getSound(msg);
            if (snd) {
                if (!this.soundEnabled)
                    return;
                snd.play();
            }
            else
                console.error("SoundFxBag.onMessage_PlaySound() cannot play sound", msg);
        }
        else {
            const name = msg.name || "";
            const gain = msg.gain || 1;
            const snd = this.getSound(name);

            if (snd) {
                if (!this.soundEnabled)
                    return;

                const id = snd.play();
                snd.volume(gain, id);
            }
            else
                console.error("SoundFxBag.onMessage_PlaySound() cannot play sound", msg);
        }
    }
    onActivate() {
    }
    onUpdate(time) {
        if (this.playLater.length > 0) {
            let listChanged = false;
            for (let i=0; i<this.playLater.length; i++) {
                const laterEntry = this.playLater[i];
                laterEntry[0] -= time;
                if (laterEntry[0] <= 0) {
                    listChanged = true;
                    const snd = laterEntry[1];
                    const mix = laterEntry[2];
                    snd.playMix(mix);
                }
            }

            if (listChanged) {
                let newList:any[] = [];
                for (let i=0; i<this.playLater.length; i++) {
                    const laterEntry = this.playLater[i];
                    if (laterEntry[0] <= 0) {
                        // remove
                    }
                    else {
                        // remaining entries
                        newList.push(laterEntry);
                    }
                }
                this.playLater = newList;
            }
        }
    }
    onDeactivate() {
        // stop the sound effects?!
    }
    onDispose() {


        if (this.playLater.length > 0) {
            console.warn("SoundFxBag.dispose(): contains unplayed entries. Is this desired?", this.playLater);

            if (this.entity.props.discardAll)
                return;

            for (let i=0; i<this.playLater.length; i++) {
                const laterEntry = this.playLater[i];
                const restTime = laterEntry[0];
                const snd = laterEntry[1];
                const mix = laterEntry[2];
                snd._laterCallback = null; // free GC stuff

                if (this.entity.props.discardSounds[mix.name])
                    continue;
                setTimeout(function() {
                    snd.playMix(mix);
                }, restTime*1000);
            }
        }
    }
}


class SoundMix {

    private _laterCallback:any;
    private _entry:any[];

    constructor(laterCallback) {
        this._entry = [];
        this._laterCallback = laterCallback;
    }


    addEntry(snd, name, gain=1, pitch=1, suspend=0) {
        this._entry.push({
            snd: snd,
            gain: gain,
            pitch: pitch,
            suspend: suspend,
            name: name,
        });
    }
    playMix(mix) {
        const id = mix.snd.play();
        if (mix.gain != 1)
            mix.snd.volume(mix.gain, id);

        if (Array.isArray(mix.pitch)) {
            const min = mix.pitch[0];
            const max = mix.pitch[1];
            mix.snd.rate(min + (max-min)*Math.random(), id);
        }
        else if (mix.pitch != 1)
            mix.snd.rate(mix.pitch, id);
    }
    play() {
        for (let i=0; i<this._entry.length; i++) {
            const mix = this._entry[i];
            if (mix.suspend > 0) {
                this._laterCallback(mix.suspend, this, mix);
            }
            else {
                this.playMix(mix);
            }
        }
    }
    volume() {
        // ignored for sound bag
    }
    rate() {
        // ignored
    }

}

