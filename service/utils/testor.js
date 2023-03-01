/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 * testor
 *
 * A simple test runner. Works best when combined with `expect(...)`.
 */
class Testor {

    constructor() {
        this.tests = [];
        this.alreadyRun = false;
        this.debug = false;
    }

    setDebugTest(debugFunc, ignore) {
        if (ignore)
            return;

        if (this.debug)
            throw new Error("Can only set one debug function");

        this.debug = [["debug", debugFunc]];
    }

    push(test) {
        if (this.alreadyRun)
            throw new Error("Cannot add test after run");

        if (!Array.isArray(test))
            throw new Error("TestRunner.push expects an array");

        this.tests.push(test);
    }

    run() {
        this.runAsync().catch(err => console.log("failed: ", err));
    }

    async runAsync() {
        if (this.alreadyRun)
            throw new Error("Cannot run more than one time");

        // run tests
        let success = 0;
        const usedTests = this.debug ? this.debug : this.tests;
        for (let i=0; i<usedTests.length; i++) {
            const t = usedTests[i];
            const name = t[0]
            const testFunc = t[1];
            try {
                const res = testFunc();
                if (isPromise(res)) {
                    await res;
                }
                success++;
                console.log(`✅ Run test [${i+1}]: ${name}...OK`);
            }
            catch (e) {
                console.log(`🔥 Run test [${i+1}]: ${name}...FAILED`);
                delete e.matcherResult;
                console.error(e);
                break;
            }
        };

        if (success == this.tests.length) {
            console.log("------------------\n✅ 100% passed");
        }
        else {
            console.log(`XXXXXXXXXXXXXXXXXX\n🔥 FAILED! ${success} passed`);
        }

        this.alreadyRun = true;
    }

}

function isPromise(p) {
    if (typeof p === 'object' && typeof p.then === 'function') {
        return true;
    }

    return false;
}

let testGroupIndex = 0;

/**
 *
 * ``` ts
 * // append tests
 * test("test1", () => {/** some test *\/})
 * test("test2", () => {/** some test *\/})
 * test("test3", async () => {/** some async test *\/})
 * // execute
 * test(); // execute all tests in queue
 * ```
 *
 * // group tests
 * beginTests()
 * finishTests();
 *
 *
 */
export function test(name, exec) {
    //
    // usage 1: execute queued tests
    if (name === undefined && exec === undefined) {
        if (testGroupIndex > 0) {
            return;
        }
        else {
            testrunner.run();
            return;
        }
    }
    //
    // usage 2: queue a test
    testrunner.push([name, exec])
}

export function beginTests() {
    testGroupIndex++;
}

export function finishTests() {
    testGroupIndex--;
    if (testGroupIndex === 0) {
        testrunner.run();
    }
    else {
        console.error("❌ finishTests() does not match beginTets()");
    }
}

export const testrunner = new Testor();


