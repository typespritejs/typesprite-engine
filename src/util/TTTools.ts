/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */

/**
 * Loads text via HTTP(S). Uses XMLHttpRequest
 *
 * @param url what to load
 * @param ok optional callback in success case
 * @param failed optional callback in error case
 * @param timeout when it should fail (defaults to 5secs)
 */
export function getText(
    url:string,
    ok?:(txt:string, httpStatus?:number)=>void,
    failed?:(errInfo:string, httpStatus?:number)=>void,
    timeout:number=50000
) {
    const client = new XMLHttpRequest();
    let resultResolved = false;

    client.open('GET', url);
    client.timeout = timeout;
    client.onload = function() {
        if (resultResolved)
            return;
        if (client.status >= 200 && client.status <= 299) {
            if (ok)
                ok(client.responseText, client.status);
        }
        else {
            if (failed) {
                let res = "";
                if (typeof client.responseText === "string") {
                    const MAX_MSG_LEN = 100;
                    const trimRes = client.responseText.trim();
                    if (!trimRes.startsWith("<!")) {
                        res = ` With response: ${trimRes.length >= MAX_MSG_LEN ? trimRes.substring(0, MAX_MSG_LEN-3) + "..." : trimRes}`;
                    }
                }
                failed(`Error while loading: ${url}. Status: ${client.status}.${res}`, client.status);
            }
        }
        resultResolved = true;
    };

    client.onerror = function() {
        if (!resultResolved && failed) {
            failed(`Error while loading: ${url}. With status: ${client.status}`, client.status);
        }
        resultResolved = true;
    };

    client.onabort = function() {
        if (!resultResolved && failed)
            failed(`Abort while loading: ${url}`, client.status);
        resultResolved = true;
    };

    client.ontimeout = function() {
        if (!resultResolved && failed)
            failed(`Timeout while loading: ${url}`, client.status);
        resultResolved = true;
    };
    client.send();
}

/**
 * Loads text via HTTP(S), expects it to be json and converts it to an object. Uses XMLHttpRequest.
 *
 * @param url
 * @param ok
 * @param failed
 * @param timeout
 */
export function getJson(
    url:string,
    ok?:(json:object, httpStatus?:number)=>void,
    failed?:(errInfo:string, httpStatus?:number)=>void,
    timeout:number=50000
) {
    getText(url, (jsonStr, hs) => {
        let jsonObj = null;
        try {
            jsonObj = JSON.parse(jsonStr);
            if (jsonObj === null || jsonObj === undefined) {
                failed(`Unexpected json from request response. Object is: ${jsonObj}`, hs);
                return;
            }
        }
        catch(err) {
            if (failed)
                failed(`Failed to convert request response to json. Error: ${err}`, 0);
            return;
        }

        if (ok) {
            ok(jsonObj, hs);
            return;
        }
    }, failed, timeout);
}


/**
 * Sends json to the server as POST request and expects text in return
 *
 * @param url
 * @param bodyData
 * @param ok
 * @param failed
 * @param timeout
 */
export function postJson(
    url:string,
    bodyData:object,
    ok?:(txt:string, httpStatus?:number, serverTime?:Date)=>void,
    failed?:(errInfo:string, httpStatus?:number, serverTime?:Date)=>void,
    timeout:number=50*1000
) {
    const client = new XMLHttpRequest();
    let resultResolved = false;

    client.open('POST', url);
    client.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    client.timeout = timeout;
    client.onload = function() {
        if (resultResolved)
            return;
        let serverTimeString = null;
        try {
            serverTimeString = client.getResponseHeader("Date");
        }
        catch(err) {
        }
        const serverTime = serverTimeString ? new Date(serverTimeString) : null;
        if (client.status >= 200 && client.status <= 299) {
            if (ok)
                ok(client.responseText, client.status, serverTime);
        }
        else {
            if (failed)
                failed(`Error while loading: ${url}. Status: ${client.status}`, client.status, serverTime);
        }
        resultResolved = true;
    };

    client.onerror = function() {
        if (!resultResolved && failed)
            failed(`Error while loading: ${url}. With status: ${client.status}`, client.status);
        resultResolved = true;
    };

    client.onabort = function() {
        if (!resultResolved && failed)
            failed(`Abort while loading: ${url}`, client.status);
        resultResolved = true;
    };

    client.ontimeout = function() {
        if (!resultResolved && failed)
            failed(`Timeout while loading: ${url}`, client.status);
        resultResolved = true;
    };

    let jsonStr = "";
    try {
        jsonStr = JSON.stringify(bodyData);
    }
    catch(err) {
        setTimeout(() => {
            if (failed) {
                failed(`Cannot convert object to json`, 0);
            }
        }, 0);
        return;
    }

    client.send(jsonStr);
}

/**
 * Tries to return the name of the class of the given object.
 */
export function getObjectClassName(obj:any):string {
    if (obj && obj.constructor && obj.constructor.toString)
    {
        var arr = obj.constructor.toString().match(/function\s*(\w+)/);
        if (arr && arr.length === 2)
        {
            return arr[1];
        }
    }
    return undefined;
}

/**
 * Performs a flat combination of two data maps (objects)
 **/
export function combineObjects(a, b) {
    return {
        ...a,
        ...b
    };
}





