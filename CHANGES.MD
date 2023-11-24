# TypeSpriteJS Game Engine - Changes

## v0.2.13, v0.2.14

  - `GraphicsEngine` component allows the configuration of which world shall receive ui events (see property: uiEventWorlds)
  - Changed how the ResourceManager interacts with the WorldManager (internal). This changes the way ResourceLoader get access to the global EngineContext.
  - Introduced a CLI-Parser which improves communication when working with commands
  - Add support for `npx typesprite dev --experiemental-reload`. Early attempt to automatically reload the dev-server when typesprite.config has been modified.
  - Removed `canvasType` type from `TypeSpriteServiceConfig`. `canvasSelector` should be enough now.
  - Improved reporting if resources take (very) long to load. This helps when working with custom Resource Loader
  - Process-code is not 0 when `npx typesrpite build` fails 
  - _Fixed_ missing call to `engineContext.releasePool.resolve()`. Resources should unload properly now.
  - _Fixed_ issue with `TypeSpriteServiceConfig`. Code-completion in `typesprite.config.mjs` was incorrect.
  - _Fixed_ missing issue with PropertyParser registration
  - Typos, docs


## <= v0.2.12

  - ✨first public version(s)