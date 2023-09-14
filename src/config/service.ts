/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {MainLoopType} from "@tsjs/runtime/GameRunner";

export enum CanvasType {
    Create,
    SearchSelector,
}


export interface TypeSpriteServiceConfig {
    /** Port for the dev-server */
    servePort?:number,
    /** WIP, not sure yet */
    builds?:Record<string, any>,
    /** Path to the aspeprite executeable used for sprite sheet generation */
    asepritePath?:string,
    /**
     * Local paths that may contain assets and game code e.g.: `game/` or `assets/`. 
     * All files in there are considered to be part of the game (including subdirectories).
     * 
     * Files and folders start with `_` or end with `_` will be ignored.
     * 
     * Simply put the directories (no `*`).
     * 
     * default: `game/`, `assets/`
     */
    assetPaths?:string[],
    /**
     * You have two options to run a TypeSprite game:
     *
     * 1. set a `RunConfig` and start an `*.edf`
     * 2. set a custom main-file and do everything on your own
     *
     * ## 1) RunConfig (recommended)
     * A minimal `RunConfig` is just this:
     * ```
     * {
     *     startWorlds: ["myworld"]
     * }
     * ```
     * It'll search for a `myworld.edf` in the given `assetPaths` and
     * allows quick and **full feature access** to the TypeSprite.
     *
     * _
     *
     * ## 2) main.js/main.ts (for edge cases)
     *
     * If the reasonable defaults are not suitable it's possible
     * to write a custom main file and initialize the engine by hand.
     */
    run:RunConfig|string,
    /**
     * FIX: remove?
     *
     * Should be analoge to tsconfig.path.
     *
     * Simply put the directories (no '*').
     *
     * `{"@game": "./some/path"}`
     */
    pathAlias?:Record<string, string>,
    /**
     * Per default TypeSprite exports the game in an: iife.
     *
     * So it can be used like this:
     * ```html
     * <script src="game.js"></script>
     * <!-- The game is running now -->
     * ```
     *
     * If you like/need to load it in a more modern fashion
     * and get more control when the engine starts and
     * you also like to have access to the running instance
     * one can set this value to true.
     *
     * ```html
     * <script type="module">
     *     import runGame from 'path/to/game.js';
     *     const gameInstance = runGame();
     * </script>
     * ```
     *
     * @see https://esbuild.github.io/api/#format
     */
    bundleAsESMRun?:boolean,

}

export interface TypeSpriteServiceConfigProps {
    command:string,
}

export function defineConfig(config:TypeSpriteServiceConfig|((props:TypeSpriteServiceConfigProps)=>TypeSpriteServiceConfig)) {
    return config;
}

export interface SharedRunnerConfig {
    /**
     * [OPTIONAL] Define any flags that helps to run your game.
     *
     * Suggestions: "ios", "nativ", "desktop", or "demo" :-)
     */
    flags?:string[],
    /**
     * Name or list of names the start world.
     *
     * For a very simple case one can simply set a string.
     *
     * However, for certain patterns it's useful to start
     * more than one world and in a controlled order.
     *
     * Example 1: start two worlds at the same time
     * ```
     * startWorlds: ["world1", "world2"]
     * ```
     *
     * Example 2: start 3 worlds in a controlled order
     * ```
     * startWorlds: [["world1"], ["world2", "world3"]]
     * ```
     * when world1 is active, world2 and world3 get activated.
     */
    startWorlds:string|string[]|string[][],
    /**
     * It's possible to have different mainloop behavior
     * and controlls how update() is called.
     */
    mainloopType?:MainLoopType,
    /**
     * Only valid if `mainloopType` is `MainLoopType.Fixed`.
     */
    fixedMainloopFps?: number,
    /**
     * Means built-in property-parser won't be set automatically.
     * You can add them by yourself
     *
     * @note advanced
     */
    noStandardPropertyParser?:boolean,
    /**
     * Means built-in resourceloader won't be set automatically.
     *
     * @note advanced
     */
    noStandardResourceLoader?:boolean,
    /**
     * Means the mainloop won't start automatically. This has
     * to be done by hand.
     */
    noAutostart?:boolean,
    noEngineContext?:boolean,
    /**
     * when > 0 it will cap the FPS to the given value.
     */
    maxFps?:number,
    /**
     * when > 0 it will cap the FPS to the given value if the window has lost the fosus.
     * This is useful during development when your laptop starts to scream at you
     * while working on a game.
     */
    maxBlurredFps?:number,
    /**
     * "create" => a new canvas is created and attached to the canvas selector object
     * "selector" => it is expected that the canvas selector points to a canvas
     */
    canvasType?:CanvasType,
    /**
     * depends on canvas Type
     */
    canvasSelector?:string,
    /**
     * A global path-prefix used for all resources loaded using the ResourceManager.
     *
     * This is useful when deploying the game into a environment where the
     * paths of the executed javascript code does not match the dev-environment.
     */
    resourcePathPrefix?:string,
}

export interface RunConfig extends SharedRunnerConfig {
    /**
     * Use this to optimize activation/deactivation behavior
     * for entities in a world.
     *
     * Example:
     * ```
     * {
     *     "level": "game/camera/CameraRectActivator",
     *     "menu": "default",
     * }
     * ```
     *
     * It's possible to overwrite activator that meet the specific
     * needs of a world.
     *
     * _
     *
     * Example 1: Imagine having a world that represents a auto-runner-level
     * that only scrolls from left to right. In that case one could
     * have a list of objects, sorted by their x-axis.
     *
     * _
     *
     * Example 2: Imagine a top-down-RPG where you like to only have
     * objects active around the camera. Other objects (like NPCs far away)
     * shall be deactive. You could implement an Activator which
     * handles this using a QuadTree and quickly checks bounding boxes
     * against the camera.
     *
     * @see defaultActivator for format details
     *
     *
     */
    activator?: Record<string, string>,
    /**
     * Set the path to the activator-path for all worlds.
     *
     * Example: path to a local class
     * ```
     * "path/to/ActivatorClass"
     * ```
     *
     * Example: package class (node)
     * ```
     * "package/dist:ActivatorClass"
     * ```
     *
     * Set it to `default` (or not at all) to set it to TypeSprite's ManualActivator.
     *
     * @note activator overwrites this value
     */
    defaultActivator?: string,
    /**
     *
     */
    resourceLoader?:string[],
}
