/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */


/**
 * Use this to resolve hirachical dependencies.
 *
 * a -> e
 * e -> c
 * a -> d
 * d -> f
 *
 * results in:
 *
 * f, c, e, d, a
 *
 * where -> means _requires_
 *
 */
export class DependencyChain
{
    private readonly chain:Record<string, Record<string, boolean>> = {};
    private readonly involvedElements:Record<string, boolean> = {};

    public connectAB(a:string, b:string):void {

        if (!this.chain[a]) {
            this.chain[a] = {};
        }
        this.chain[a][b] = true;
        this.involvedElements[a] = true;
        this.involvedElements[b] = true;
    }

    public resolveChainToList():string[] {
        const outList:string[] = [];
        const todoList:string[] = Object.keys(this.involvedElements);

        // now we need to work as long as the todolist is not empty
        let foundNone = 0;
        while (todoList.length > 0 && foundNone < 2)
        {
            let found = false;
            for (let i = 0; i < todoList.length; i++)
            {
                const el = todoList[i];
                let elRequiresNotYetResolvedDependencies = false;

                if (this.chain[el]) {
                    const dependencies = Object.keys(this.chain[el]);
                    for (let i2=0; i2<dependencies.length; i2++) {
                        const elDependsOn = dependencies[i2];

                        // search existing list
                        let found = false;
                        for (let i3=0; i3<outList.length; i3++) {
                            if (outList[i3] == elDependsOn) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            elRequiresNotYetResolvedDependencies = true;
                            break;
                        }

                    }
                }

                if (!elRequiresNotYetResolvedDependencies)
                {
                    todoList.splice(i, 1); // .RemoveAt(i);
                    outList.push(el);

                    // we know now that the element has no further
                    // dependencies. We can safly assume it works
                    found = true;
                    break;
                }
            }

            // if we cannot find a new dependency to resolve
            // we will eventually endup in a infinite loop.
            //
            // to avoid this we count foundNone and exit if it
            // gets bigger than 2
            if (!found)
                foundNone++;
        }

        if (foundNone >= 2)
        {
            // error: dependency loop found
            return null;
        }
        return outList;
    }
}