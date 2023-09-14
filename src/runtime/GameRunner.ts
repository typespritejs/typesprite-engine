/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {WorldManager, WorldManagerBuilder} from "@tsjs/entity/WorldManager";
import {BaseEntityActivator} from "@tsjs/entity/BaseEntityActivator";
import {WorldDescription} from "@tsjs/entity/WorldDescription";
import {getText} from "@tsjs/util/TTTools";
import {PropertyParser} from "@tsjs/entity/PropertyParser";
import {ResourceLoader} from "@tsjs/entity/ResourceManager";
import {NumberPropertyParser} from "@tsjs/entity/parser/NumberPropertyParser";
import {StringPropertyParser} from "@tsjs/entity/parser/StringPropertyParser";
import {EaseFuncPropertyParser} from "@tsjs/entity/parser/EaseFuncPropertyParser";
import {BoolPropertyParser} from "@tsjs/entity/parser/BoolPropertyParser";
import {AnyPropertyParser} from "@tsjs/entity/parser/AnyPropertyParser";
import {TextLoader} from "@tsjs/entity/resources/TextLoader";
import {JsonLoader} from "@tsjs/entity/resources/JsonLoader";
import {ImageLoader} from "@tsjs/entity/resources/ImageLoader";
import {TextureLoader} from "@tsjs/entity/resources/TextureLoader";
import {SpriteSheetLoader} from "@tsjs/entity/resources/SpriteSheetLoader";
import {EngineContext} from "@tsjs/engine/tt2d/EngineContext";
import {SharedRunnerConfig} from "@tsjs/config/service";
import {ColorPropertyParser} from "@tsjs/entity/parser/ColorPropertyParser";
import {WorldState} from "@tsjs/entity/World";
import {AudioLoader} from "@tsjs/entity/resources/AudioLoader";
import {SoundBagPropertyParser} from "@tsjs/entity/parser/SoundBagPropertyParser";


/**
 *
 * **New to TypeSprite?:**
 *
 * This is the class that runs when you configure your game in `typesprite.config.mjs`
 * using run: {...}. It is also used when there is no `typesprite.config` at all.
 *
 * In most cases one won't need to worry about this class.
 *
 * ---
 *
 * **The details:**
 *
 * This is a _facade_ that performs all steps required to config the engine
 * and run a game. The config is defined by a GameRunnerConfig and provides
 * a lot of options.
 *
 * ---
 *
 * **For advanced devs:**
 *
 * Internally it is a wrapper around WorldManagerBuilder and a mainloop-handler.
 * It's totally fine to not use GameRunner and setup your game without it. In that
 * case the source-code of this class can help to understand how the things
 * are working.
 *
 * If you run the dev server (using `typesprite dev`) not use a custom main-entry-file than
 * it's possible to visit http://localhost:5001/inspect-game.js. It shows how the
 * GameRunner is configured by the dev-server.
 *
 * @see GameRunnerConfig
 * @see WorldManager
 * @see WorldManagerBuilder
 */
export class GameRunner implements EngineContextProvider {

    public engineContext:EngineContext = null;
    public readonly worldManager:WorldManager;
    public frame:number = 0;
    private bluredMaxFps:number = 0;
    private _frameRequest:number = 0;
    private quit:boolean = false;
    private starter:WorldStarter;

    constructor(
        public readonly config:GameRunnerConfig
    ) {
        const wmb = new WorldManagerBuilder();
        loader.prefix = config.resourcePathPrefix||"";
        wmb.setTextLoader(loader);
        //
        // canvas
        //
        let canvas = null;
        {
            const selectorElement = config.canvasSelector ? window.document.querySelector(config.canvasSelector) : null;
            if (config.canvasSelector && !selectorElement) {
                console.warn(`GameRunner() cannot find element with selector: '${config.canvasSelector}'`);
            }
            if (!config.canvasType) {
                canvas = document.createElement("canvas");
                const target = selectorElement || document.querySelector("body");
                target.appendChild(canvas);
            }
            else {
                if (!selectorElement || typeof (selectorElement as any).getContext != "function") {
                    throw new Error(`GameRunner(): cannot find canvas object. Searched by using selector: ${config.canvasSelector}`);
                }
                canvas = selectorElement as HTMLCanvasElement;
            }
            if (!canvas) {
                throw new Error("Canvas not found.");
            }
            wmb.addGlobalProp("canvas", canvas);
        }
        //
        // context
        //
        let engineContext:EngineContext = null;
        if (!config.noEngineContext) {
            engineContext = new EngineContext(canvas);
            this.engineContext = engineContext;
            wmb.addGlobalProp("engineContext", engineContext);
        }
        //
        // props
        //
        if (!config.noStandardPropertyParser) {
            wmb .addPropertyParser(new NumberPropertyParser())
                .addPropertyParser(new StringPropertyParser())
                .addPropertyParser(new EaseFuncPropertyParser())
                .addPropertyParser(new BoolPropertyParser())
                .addPropertyParser(new AnyPropertyParser())
                .addPropertyParser(new ColorPropertyParser())
                .addPropertyParser(new SoundBagPropertyParser())
        }
        for (const p of config.propertyParser||empty) {
            wmb.addPropertyParser(p);
        }
        //
        // resource loader
        //
        if (!config.noStandardResourceLoader) {
            wmb .addResourceLoader(new TextLoader())
                .addResourceLoader(new JsonLoader())
                .addResourceLoader(new ImageLoader())
                .addResourceLoader(new AudioLoader())
                .addResourceLoader(new TextureLoader())
                .addResourceLoader(new SpriteSheetLoader())
        }
        for (const rl of config.resourceLoader||empty) {
            wmb.addResourceLoader(rl);
        }
        //
        // register worlds
        //
        for (const w of config.worlds||empty) {
            const {name, edfPath, activatorFactory} = w;
            wmb.addWorld(
                new WorldDescription()
                    .setName(name)
                    .setActivatorFactory(activatorFactory || config.standardActivatorFactory)
                    .setEDFFilePath(edfPath)
            )
        }
        //
        // props + instantiate
        //
        wmb.addGlobalProp("game", this);
        this.worldManager = wmb.build();
        if (config.resourcePathPrefix)
            this.worldManager.resources.setRootPath(config.resourcePathPrefix);
        this.worldManager.resources.setWorldManager(this.worldManager);
        //
        // start worlds
        //
        this.starter = new WorldStarter(
            this,
            config
        );

        if (this.starter.issue) {
            console.warn("Game not started.")
            return;
        }

        if (config.maxBlurredFps > 0) {
            this.bluredMaxFps = -1;
            window.addEventListener('blur', () => {
                this.bluredMaxFps = config.maxBlurredFps;
            });
            window.addEventListener('focus', () => {
                this.bluredMaxFps = -1;
            });
        }

        if (!config.noAutostart) {
            this.startOrResumeMainloop();
        }
    }

    startOrResumeMainloop() {
        if (this._frameRequest != 0) {
            return;
        }
        switch (this.config.mainloopType) {
            default:
            case MainLoopType.Adjusted:
                this.runMainloopAdjusted();
                break;
            case MainLoopType.Render:
                this.runMainloopRender();
                break;
            case MainLoopType.Fixed:
                this.runMainloopFixed();
                break;
            // default:
            //     console.error("Incompatible mainloop type. Found:", this.config.mainloopType);
            //     break;
        }
    }

    pauseMainloop() {
        if (this._frameRequest !== 0) {
            cancelAnimationFrame(this._frameRequest);
            this._frameRequest = 0;
        }
    }

    private update(elapsed:number):boolean {
        if (this.starter.state === WorldStartState.Starting) {
            this.starter.update(elapsed);
            /** @ts-ignore */
            if (this.starter.state === WorldStartState.Issue) { // ???
                console.warn("Not all worlds started properly. The game will likely be unstable.");
            }
        }

        this.worldManager.update(elapsed);
        return false;
    }

    private draw(elapsed:number) {
        this.worldManager.render(elapsed);
    }

    private runMainloopFixed() {
        let lastTime:DOMHighResTimeStamp = null;
        const perfectFrameTime = 1 / (this.config.fixedMainloopFps||60);
        let remainTime:number = -perfectFrameTime*0.5;
        const render = (time:DOMHighResTimeStamp) => {
            const elapsed = (lastTime === null ? time : time - lastTime)/1000;

            if (this.bluredMaxFps > 0) {
                if (elapsed < 1 / this.bluredMaxFps) {
                    // skip this frame to match target FPS
                    this._frameRequest = requestAnimationFrame(render);
                    return;
                }
            }
            else {
                if (this.config.maxFps > 0) {
                    if (elapsed < 1 / this.config.maxFps) {
                        // skip this frame to match target FPS
                        this._frameRequest = requestAnimationFrame(render);
                        return;
                    }
                }
            }

            //
            //
            while(remainTime + perfectFrameTime <= elapsed) {
                // main loop
                this.update(perfectFrameTime);
                remainTime += perfectFrameTime;
            }
            remainTime -= elapsed;
            this.draw(elapsed);
            lastTime = time;
            this._frameRequest = requestAnimationFrame(render);
        }
        this._frameRequest = requestAnimationFrame(render);
    }

    private runMainloopRender() {
        let lastTime:DOMHighResTimeStamp = null;
        const render = (time:DOMHighResTimeStamp) => {
            const elapsed = (lastTime === null ? time : time - lastTime)/1000;

            if (this.bluredMaxFps > 0) {
                if (elapsed < 1 / this.bluredMaxFps) {
                    // skip this frame to match target FPS
                    this._frameRequest = requestAnimationFrame(render);
                    return;
                }
            }
            else {
                if (this.config.maxFps > 0) {
                    if (elapsed < 1 / this.config.maxFps) {
                        // skip this frame to match target FPS
                        this._frameRequest = requestAnimationFrame(render);
                        return;
                    }
                }
            }

            // main loop
            this.update(elapsed);
            this.draw(elapsed);

            lastTime = time;
            this._frameRequest = requestAnimationFrame(render);
        }
        this._frameRequest = requestAnimationFrame(render);
    }

    private runMainloopAdjusted() {
        let lastTime = null;
        const render = (now:DOMHighResTimeStamp) => {
            // context.clearRect(0,0, canvas.width, canvas.height);
            // const now = performance.now();
            // let elapsed = (now - lastTime)/1000.0;
            let elapsed = (lastTime === null ? now : now - lastTime)/1000;
            if (this.bluredMaxFps > 0) {
                if (elapsed < 1 / this.bluredMaxFps) {
                    // skip this frame to match target FPS
                    this._frameRequest = requestAnimationFrame(render);
                    return;
                }
            }
            else {
                if (this.config.maxFps > 0) {
                    if (elapsed < 1 / this.config.maxFps) {
                        // skip this frame to match target FPS
                        this._frameRequest = requestAnimationFrame(render);
                        return;
                    }
                }
            }

            if (elapsed > 1)
                elapsed = 1;
            const FPS = 1 / 55;
            const FPSPerfect = 1 / 60;
            if (elapsed > FPS) {
                let rest = elapsed
                while(rest > 0) {
                    let time = rest;
                    if (rest > FPSPerfect) {
                        time = FPSPerfect;
                        rest -= FPSPerfect;
                    }
                    else {
                        rest = 0;
                    }
                    const exit = this.update(time);
                    if (exit) {
                        console.error("Exit mainloop");
                        return;
                    }
                }
            }
            else {
                const exit = this.update(elapsed);
                if (exit) {
                    console.error("Exit mainloop");
                    return;
                }
            }
            this.draw(elapsed);
            lastTime = now;
            this.frame ++;
            this._frameRequest = requestAnimationFrame(render);
        }
        this._frameRequest = requestAnimationFrame(render);
    }

    getContext(): EngineContext {
        return this.engineContext;
    }

    setContext(ec:EngineContext) {
        this.engineContext = ec;
        this.worldManager.globals["engineContext"] = ec;
    }

    /**
     * One-Time thing to stop and free the active game
     */
    releaseAndQuitGame () {
        if (this.quit)
            return;
        this.quit = true;
        this.pauseMainloop();
        this.worldManager.resources.releaseAll();
    }
}

// ---------------------------------------------------------------------------------------------------------------------

const loader:any = {
    prefix: "",
    readAllText: (url, receiver) => {
        const finalUrl = loader.prefix ? `${loader.prefix}${url}` : url;
        getText(
            finalUrl,
            (txt, http) => {
                receiver(true, txt);
            },
            (err, http) => {
                receiver(false, `Failed to load ${url}. HTTP-Code: ${http}`);
            }
        );
    }
}

// ---------------------------------------------------------------------------------------------------------------------

enum WorldStartState {
    Starting,
    Issue,
    Done,
}

// ["w1", ["w2.1", "w2.2"], ["w3"]]
type PendingStart = string[];

class WorldStarter {

    private startWorlds:PendingStart[] = [];
    private pending:PendingStart[] = [];
    private currentPending:PendingStart = null;
    public state:WorldStartState = WorldStartState.Starting;
    public issue:string = "";

    constructor(
        private runner:GameRunner,
        private config:GameRunnerConfig
    ) {
        if (this.config.startWorlds) {
            if (typeof this.config.startWorlds === "string") {
                // startWorlds: "myWorld"
                this.pending.push([this.config.startWorlds])
            }
            else if (Array.isArray(this.config.startWorlds)) {
                for (const worldSetOrWorld of this.config.startWorlds) {
                    const set:PendingStart = [];
                    this.pending.push(set)
                    if (typeof worldSetOrWorld === "string") {
                        // startWorlds: [
                        //   ["w1.a", "w1.b"],
                        //   "w2"               << HERE!
                        // ]
                        set.push(worldSetOrWorld)
                    }
                    else if (Array.isArray(worldSetOrWorld)) {
                        // startWorlds: [
                        //   ["w1.a", "w1.b"],  << HERE
                        //   "w2"
                        // ]
                        for (const worldSet of worldSetOrWorld) {
                            if (typeof worldSet !== "string") {
                                this.issue = `Invalid type in 'startWorlds'. Expected string but found: ${typeof worldSet}. Please check 'startWorlds' in the config.`
                                this.state = WorldStartState.Issue;
                                console.error(this.issue);
                                return;
                            }
                            set.push(worldSet)
                        }
                    }
                }
            }
        }
        //
        // All worlds must exist!
        //
        for (const worldSet of this.pending) {
            for (const worldName of worldSet) {
                if (!this.runner.worldManager.getWorldByName(worldName)) {
                    this.issue = `Failed to start. Cannot find world: ${worldName}. Please check 'startWorlds' in the config.`;
                    this.state = WorldStartState.Issue;
                    console.error(this.issue);
                    return;
                }
            }
        }
        if (this.pending.length == 0) {
            this.issue = `Failed to start any world. Please check 'startWorlds' in the config.`;
            this.state = WorldStartState.Issue;
            console.error(this.issue);
            return;
        }

        this.startWorlds = [...this.pending];
        console.log(this.startWorlds)
        this.activateNext();
    }

    activateNext() {
        if (this.pending.length == 0) {
            this.state = WorldStartState.Done;
            console.log("All startWorlds loaded.");
            if (this.config.finishCallback) {
                this.config.finishCallback(this.runner);
            }
            return;
        }

        this.currentPending = this.pending.shift();
        for (const worldName of this.currentPending) {
            const world = this.runner.worldManager.getWorldByName(worldName);
            world.activate();
        }
    }

    update(elapsed:number) {
        let allLoaded = true;
        for (const worldName of this.currentPending) {
            const world = this.runner.worldManager.getWorldByName(worldName);
            switch (world.getState()) {
                case WorldState.Populated:
                    break;
                case WorldState.Error:
                    this.state = WorldStartState.Issue;
                    console.error(`Failed to run world ${worldName}.`);
                    this.issue = "World not loaded: " + worldName;
                    allLoaded = false;
                    break;
                default:
                    allLoaded = false;
                    break;
            }
        }

        if (allLoaded) {
            console.log("Worlds activated:", this.currentPending.join(','));
            this.activateNext();
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------

const empty = [];

export type ActivatorFactory = <T extends BaseEntityActivator>() => T;
export enum MainLoopType {
    /**
     * `update()` will be in full sync with the the fps of the game.
     */
    Render,
    /**
     * `update()` will be called every frame (like Render). However, if
     * a frame takes longer than 60 FPS it'll be called with 1/60 elapsed.
     *
     * This will cause update's elapse-value retains stable in situations
     * of low FPS.
     */
    Adjusted,
    /**
     * `update()` is called on a fixed fixed rate with a (mostly) fixed elapse-value.
     *
     * set `fixedMainloopFps` to control this.
     *
     * ```
     *             A
     *          [----]
     *          F    F          F
     *          v    v          v
     * -----|------------------------------------|---------------> t
     *      1sec     ^                           2sec
     *               |
     *            render()
     *
     * When render() is called the delta-time (A) is calculated.
     * Dependning on the fixedMainloopFps update() is called for all frames
     * that fit into (A).
     *
     * For example if (A) is 0.3sec and fixedMainloopFps is 60 it would mean that
     * update is called 0.3*60 => 18 times before the rendering is called. That way
     * the update calls will always have the same elapsed value.
     * ```
     */
    Fixed,
}

// ---------------------------------------------------------------------------------------------------------------------

export interface GameRunnerConfig extends SharedRunnerConfig {
    standardActivatorFactory?: ActivatorFactory,
    propertyParser?: PropertyParser[],
    resourceLoader?: ResourceLoader[],
    worlds: { name: string, edfPath: string, activatorFactory: ActivatorFactory | null }[],
    finishCallback?: (game: GameRunner) => void,
}


// ---------------------------------------------------------------------------------------------------------------------

export interface EngineContextProvider {
    getContext():EngineContext;
}