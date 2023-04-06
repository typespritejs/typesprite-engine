/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Component} from "@tsjs/entity/Component";
import {AudioHowl, AudioHowlerGlobal} from "@tsjs/lib/howlerESM"
import {prop} from "@tsjs/entity/decorate/ComponentDecorators";


/**
 * ## AudioManager-Component
 *
 * Attach this early when running the game to ensure that
 * the audio context is available
 */
export class AudioManager extends Component {

    private dummy:any;

    @prop('number', 1)
    private gain:number;
    @prop('bool', false)
    private mute:boolean;
    private backgroundMusic:any;
    private currentMusic:string = "";


    onInit(): void {
        this.dummy = new AudioHowl({
            src: ["none/existing/path/for/howler"],
            preload: false,
        });

        this.globalGain = this.gain;
        this.globalMute = this.mute;
    }

    get globalGain():number {
        return AudioHowlerGlobal._volume;
    }

    set globalGain(v:number) {
        AudioHowlerGlobal.volume(v);
    }

    set globalMute(v:boolean) {
        AudioHowlerGlobal.mute(v);
    }

    get globalMute():boolean {
        return AudioHowlerGlobal._muted;
    }

    onMessage_GlobalMute(muted) {
        this.globalMute = !!muted;
    }

    onMessage_GlobalGain(gain) {
        this.globalGain = gain;
    }

    playMusic(assetPath:string, gain=1, rate=1) {
        if (this.currentMusic == assetPath)
            return;

        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
        const conf = {
            src: [assetPath],
            html5: true,
            loop: true,
            autoplay: true,
        }
        this.backgroundMusic = new AudioHowl(conf);
        this.currentMusic = assetPath;
    }

    stopMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
        this.backgroundMusic = null;
        this.currentMusic = null;
    }

    onMessage_PlayMusic(conf) {
        if (typeof conf === "string")
            this.playMusic(conf);
        else {
            const {assetPath, gain=1, rate=1} = conf;
            this.playMusic(assetPath, gain, rate);
        }
    }

    onMessage_StopMusic() {
        this.stopMusic();
    }

}
