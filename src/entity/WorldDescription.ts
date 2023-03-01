/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {BaseEntityActivator} from "@tsjs/entity/BaseEntityActivator";


export class WorldDescription {


    public name:string="";

    public edfPath:string="";
    public activatorFactory:()=>BaseEntityActivator;


    constructor() {
    }


    setEDFFilePath(edfPath:string):WorldDescription {
        this.edfPath = edfPath;
        return this;
    }

    setActivatorFactory(activatorCreator:()=>BaseEntityActivator):WorldDescription {
        this.activatorFactory = activatorCreator;
        return this;
    }

    setName(name:string):WorldDescription {
        this.name = name;
        return this;
    }

}

