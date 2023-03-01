/**
 * Copyright (c) 2013-2023 Christoph Schnackenberg <mail@xtoff.games>
 *
 * MIT license: https://github.com/typespritejs/typesprite-engine/blob/develop/LICENSE.MD
 */
import {Easing} from "@tsjs/engine/flignov/Easing";


// ---------------------------------------------------------------------------------------------------------------------

enum ProgressBehavior {
    Normal,
    /**
     * Makes sure that a call with the end-value is always performed.
     * This way it's ensured that the final states of a timeline are met.
     *
     * Standard for stepTimeline()
     */
    EnsureEnd,
}

type ApplyFunc = (...v:number[]) => void;
type TimePoint = number|string;
type TimeConst = number|number[];
function _a(v:TimeConst):number[] { return Array.isArray(v) ? v : [v] };

type EaseFunc = (t, b, c, d) => number;

interface TimeValue {
    value:TimeConst;
    start:TimePoint;
    applyFunc:ApplyFunc;

    end:TimePoint;
    endValue:TimeConst;
    ease: EaseFunc
}

interface EventcConfig {
    when:TimePoint,
    applyFunc: ApplyFunc,
}

interface TimeValuePrepared {
    start:number;
    value:number[];
    applyFunc:ApplyFunc;

    end:number;
    endValue:number[];
    ease: EaseFunc,
}

interface EventPrepared {
    when:number;
    applyFunc:ApplyFunc;
}

// ---------------------------------------------------------------------------------------------------------------------

export interface ITimelineBuilder {
    done(duration:number, loop:boolean):PreparedTimeline;
}

// ---------------------------------------------------------------------------------------------------------------------

export class TimelineBuilder implements ITimelineBuilder {

    private _name:string;
    private _duration:number = null;
    private _loop:boolean;
    private _result:PreparedTimeline = null;
    private _events:EventcConfig[] = [];
    private layer:BaseLayerBuilder[] = [];

    private marks:Map<string, number|string> = new Map<string, number|string>();


    private apply(time:number):void {
        for (let i=0; i<this.layer.length; i++) {
            (this.layer[i] as any).layerApply(time);
        }
    }

    public name(name:string):TimelineBuilder {
        this._name = name;
        return this;
    }

    public getName():string {
        return this._name;
    }

    public getDuration():number {
        return this._duration;
    }

    public getLoop():boolean {
        return this._loop;
    }

    public mark(markId:string, val:number|string):TimelineBuilder {
        this.marks.set(markId, val);
        return this;
    }

    public getMarkValue(markId:string):number|string|undefined {
        return this.marks.get(markId);
    }

    public prop(applyFunc:ApplyFunc, layerId:string=""):TimelineLayerBuilder {
        const out = new TimelineLayerBuilder(this, applyFunc, layerId);
        this.layer.push(out);
        return out;
    }

    public stepTimeline(layerId:string=""):StepTimelineLayerBuilder {
        const out = new StepTimelineLayerBuilder(this, layerId);
        this.layer.push(out);
        return out;
    }

    public done(duration:number, loop:boolean = false):PreparedTimeline {
        if (this._duration !== null)
            throw new Error("TimelineBuilder::done() can only be used once!");
        if (duration <= 0)
            throw new Error("TimelineBuilder::done() duration must not be less or equal 0");
        this._duration = duration;
        this._loop = loop;
        // this.prepare();
        return new PreparedTimeline(this);
    }

    private prepare(context:PreparedTimeline):[PreparedTimelineLayer[], EventPrepared[]] {
        const layer = this.layer.map(l => (l as any).prepare(context));
        const events = this.prepareEvents();
        return [layer, events]
    }

    private prepareEvents():EventPrepared[] {
        const events = this._events.map(e => {
            const when = prepareTimePoint(e.when, "event-when", this);
            const out = {
                when,
                applyFunc: e.applyFunc,
            } as EventPrepared;
            return out;
        }).sort((a, b) => a.when - b.when)
        return events;
    }

    public get result():PreparedTimeline {
        return this._result;
    }

    public at(when:TimePoint, applyFunc:ApplyFunc):TimelineBuilder {
        this._events.push({
            when,
            applyFunc
        });
        return this;
    }

}


// ---------------------------------------------------------------------------------------------------------------------

class BaseLayerBuilder implements ITimelineBuilder  {

    protected confElements:TimeValue[] = [];

    constructor(
        protected timeline:TimelineBuilder,
        /**
         * Die apply-Funktion gültig für den gesamten Layer
         */
        protected layerApplyFunc:ApplyFunc,
        protected layerId:string,
        protected progressBehavior:ProgressBehavior
    ) {
    }

    public prop(applyFunc:ApplyFunc, layerId:string=""):TimelineLayerBuilder {
        return this.timeline.prop(applyFunc, layerId);
    }

    public done(duration:number, loop:boolean = false):PreparedTimeline {
        return this.timeline.done(duration, loop);
    }

    public stepTimeline(layerId:string=""):StepTimelineLayerBuilder {
        return this.timeline.stepTimeline(layerId);
    }

    public get result():PreparedTimeline {
        return this.timeline.result;
    }

    private prepare(context:PreparedTimeline):PreparedTimelineLayer {
        let refValueNum = -1;
        const elements = this.confElements.map(e => {
            let start = 0;
            let end = 0;
            let v1 = _a(e.value);
            let v2 = null;
            let easing = null;

            start = prepareTimePoint(e.start, "start", this.timeline);
            if (start === null)
                return null;

            if (e.ease != null) {
                easing = e.ease;
                v2 = _a(e.endValue);
                end = prepareTimePoint(e.end, "end", this.timeline);
                if (end === null)
                    return null;

                if (start > end) {
                    console.error(`Timeline issue during prepare layer. start after end: "${e.end}". Timeline: ${this.timeline.getName()}, prop: ${this.layerId}.`, this);
                    return null;
                }

                if (v1.length != v2.length) {
                    console.error(`Timeline issue during prepare layer. number of values does not match between start/end: "${e.end}". Timeline: ${this.timeline.getName()}, prop: ${this.layerId}.`, this);
                    return null;
                }
            }

            if (refValueNum == -1) {
                refValueNum = v1.length;
            }
            else if (refValueNum != v1.length) {
                console.error(`Timeline issue during prepare layer. number of values does not match between values/easings: "${e.end}". Timeline: ${this.timeline.getName()}, prop: ${this.layerId}.`, this);
                return null;
            }

            return {
                start: start,
                value: v1,
                applyFunc: e.applyFunc || this.layerApplyFunc,

                end: end,
                endValue: v2,
                ease: easing,
            }
        }).filter(e => e != null)
            .sort((a, b) => a.start - b.start);

        const workNumber = new Array(refValueNum);
        for (let i=0; i<refValueNum; i++)
            workNumber[i] = 0;

        return new PreparedTimelineLayer(
            elements,
            workNumber,
            context,
            this.layerId,
            this.layerApplyFunc,
            this.progressBehavior
        );
    }
}

// ---------------------------------------------------------------------------------------------------------------------

class StepTimelineLayerBuilder extends BaseLayerBuilder {

    constructor(
        timeline:TimelineBuilder,
        layerId:string
    ) {
        super(timeline, null, layerId, ProgressBehavior.EnsureEnd)
    }

    public step(start:TimePoint, end:TimePoint, stepFunc:ApplyFunc):StepTimelineLayerBuilder {
        this.confElements.push({
            start: start,
            end: end,
            value: 0,
            endValue: 1,
            ease: Easing.Linear.easeIn,
            applyFunc: stepFunc
        })
        return this;
    }

    public at(when:TimePoint, applyFunc:ApplyFunc):StepTimelineLayerBuilder {
        this.timeline.at(when, applyFunc);
        return this;
    }

    public emptyStep(start:TimePoint, end:TimePoint):StepTimelineLayerBuilder {
        this.confElements.push({
            start: start,
            end: end,
            value: 0,
            endValue: 0,
            ease: null,
            applyFunc: null
        })
        return this;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

class TimelineLayerBuilder extends BaseLayerBuilder {

    constructor(
        timeline:TimelineBuilder,
        layerApplyFunc:ApplyFunc,
        layerId:string
    ) {
        super(timeline, layerApplyFunc, layerId, ProgressBehavior.Normal);
    }

    public value(start:TimePoint, value:TimeConst):TimelineLayerBuilder {
        this.confElements.push({start, value, ease: null, end: null, endValue:null, applyFunc: this.layerApplyFunc})
        return this;
    }

    public ease(start:TimePoint, end:TimePoint, startValue:TimeConst, endValue:TimeConst, ease:EaseFunc = null):TimelineLayerBuilder {
        this.confElements.push({start, value: startValue, end, endValue, ease: ease ? ease : Easing.Linear.easeIn, applyFunc: this.layerApplyFunc})
        return this;
    }

    public ease01(start:TimePoint, end:TimePoint, ease:EaseFunc = null):TimelineLayerBuilder {
        this.confElements.push({start, value: [0], end, endValue: [1], ease: ease ? ease : Easing.Linear.easeIn, applyFunc: this.layerApplyFunc})
        return this;
    }

    public ease10(start:TimePoint, end:TimePoint, ease:EaseFunc = null):TimelineLayerBuilder {
        this.confElements.push({start, value: [1], end, endValue: [0], ease: ease ? ease : Easing.Linear.easeIn, applyFunc: this.layerApplyFunc})
        return this;
    }

    public at(when:TimePoint, applyFunc:ApplyFunc):TimelineLayerBuilder {
        this.timeline.at(when, applyFunc);
        return this;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

class PreparedTimelineLayer {

    private lastElem:TimeValuePrepared = null;

    constructor(
        private elements:TimeValuePrepared[] = null,
        private workNumber:number[] = null,
        private timeline:PreparedTimeline,
        private propId:string,
        private layerApplyFunc:ApplyFunc,
        private progressBehavior:ProgressBehavior,
    ) {
    }

    public layerApply(time:number):void {
        const duration = this.timeline.duration
        const loop = this.timeline.loop;
        const modTime = loop ?  time % duration : Math.min(time, duration);
        let active:TimeValuePrepared = null;

        let applied = false;
        for (let i=this.elements.length-1; i>=0; i--) {
            const e = this.elements[i];

            if (e.start <= modTime) {
                if (e.ease) {

                    // Warum das Math.min gebraucht wird:
                    //
                    //           localDuration
                    //            |
                    //       ...........     localTime
                    //       v         v     v
                    //  ----[s]-------[e]-------------> t
                    //       ^         ^
                    //       e.start   |
                    //                 e.end
                    //                >^<
                    //                 usedTime
                    //
                    // Es ist durchaus möglich, dass localTime nach e.end
                    // steht. In dem Fall bleibt der e.end-Wert.
                    const localTime = modTime - e.start;
                    const localDuration = e.end - e.start;
                    const usedTime = Math.min(localTime, localDuration);

                    // Spezialfall: [s] == [e]
                    //
                    // Wenn localDuration 0 ist, heißt das [s] und [e] sind auf dem
                    // Selben Zeitpunkt. In dem Fall wollen immer den Wert von [e]
                    // haben da dieser Punkt nicht aktiv wäre wenn wir vor [s] wären
                    if (localDuration == 0) {
                        for (let n=0; n<this.workNumber.length; n++) {
                            this.workNumber[n] = e.endValue[n];
                        }
                    }
                    else {
                        const t = e.ease(usedTime/localDuration, 0, 1, 1);
                        for (let n=0; n<this.workNumber.length; n++) {
                            this.workNumber[n] = e.value[n] + (e.endValue[n] - e.value[n]) * t;
                        }
                    }
                    e.applyFunc(...this.workNumber);
                    active = e;
                }
                else {

                    if (e.applyFunc)
                        e.applyFunc(...e.value);
                    active = e;
                }
                applied = true;
                break;
            }
        }

        if (this.elements.length > 0) {
            if (!applied) {
                //
                //      first element
                //       |              last element
                //       v              v
                //  ----[x]-------[x]--[x]----------> t
                //    ^
                //    time
                //  .................
                //                  ^
                //                  Duration!
                //
                //
                // TODO dies kann optimiert werden im Loop-Falle: muh
                //
                // Im Falle einer Loop wird es hier kompliziert. Was soll passieren?
                // Das letzte Element nehmen? Geht nicht so einfach da wir im Prinzip
                // das letzte Element laut Duration nehmen müssten. Dann müsste man
                const e = this.elements[0];
                active = e;
                if (e.applyFunc)
                    e.applyFunc(...e.value);
            }
        }
        else {
            // Kein element? Dann applien wir immer die layer-func (wenn vorhanden)
            if (this.layerApplyFunc)
                this.layerApplyFunc();
        }

        if (active != this.lastElem && this.lastElem && this.lastElem.applyFunc != null) {
            if (this.progressBehavior == ProgressBehavior.EnsureEnd)
                this.lastElem.applyFunc(...this.lastElem.endValue);
        }


        //
        //   Start           End
        //    v               v
        // ---|---------------|-----> t
        //  ^
        //  Play
        //

        this.lastElem = active;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export class PreparedTimeline {

    // FIX: translate comments

    private readonly _layer:PreparedTimelineLayer[] = [];
    private readonly _duration:number = 0;
    private readonly _loop:boolean = false;
    private readonly _name:string = "";

    private lastEventTime:number = 0;
    private _events:EventPrepared[] = null;
    private _lastApplyTime:number = 0;

    constructor(
        timeline:TimelineBuilder,
    ) {
        this._duration = timeline.getDuration();
        this._loop = timeline.getLoop();
        this._name = timeline.getName();
        const [layer, events] = (timeline as any).prepare(this);
        this._layer = layer;
        this._events = events;
        (timeline as any)._result = this;
    }

    public apply(time:number):void {
        this._lastApplyTime = time;

        // EVENTS
        //
        // Events können grundsätzlich nur erkannt werden, wenn
        // ein fortschreiten der Zeit ermittelt wurde.
        if (this._events.length > 0 && time > this.lastEventTime) {
            let start = this.lastEventTime;
            let end = time;

            if (this._loop) {

                // Start            Duration (loop)
                // |                 |
                // |                 |   Gleiches Event nur eben im Überlauf
                // v                 v   v
                // |--[e]------------|--[e]--------...->
                //                 ........
                //                 ^      ^
                //                 start  end
                //
                const lastModTime = this.lastEventTime % this._duration;
                const modTime = time % this._duration;
                if (modTime < lastModTime) {
                    // Spezial Fall:
                    //
                    // Bereich         Bereich
                    //   (A)           (B)
                    // |--[e]------------|--[e]--------...->
                    // .....           ...
                    //     ^           ^
                    //  modTime        lastModTime
                    //
                    // Hier muss die Event-Liste 2 Mal geprüft werden:
                    // Einmal für Bereich A und einmal für bereich B.
                    // Unten die Schleife macht Bereich A und für Bereich
                    // B prüfen wir hier in einer Extrarunde.
                    //
                    // Dies ist so sinnvoll, da wir die untere Schleife bei kurzem
                    // end-Wert schnell breaken können.
                    start = lastModTime;
                    end = this._duration;
                    for (const e of this._events) {
                        if (e.when >= end) // Nicht >= sonst kann es zu Event-Dopplungen kommen
                            break;
                        if (e.when >= start) {
                            e.applyFunc();
                        }
                    }
                    //
                    // Für spätere Schleife
                    start = 0;
                    end = modTime;
                }
                else {
                    //
                    //
                    // |--[e]------------|--[e]--------...->
                    //         ^     ^
                    //         .......
                    //         start + ende innerhalb von Duration
                    //
                    start = lastModTime;
                    end = modTime
                }
            }

            //
            //                   start    end
            //                   v        v
            //                   ..........
            // ---[e]------[e]-----[e]-[e]---[e]---[e]------->
            //
            for (const e of this._events) {
                if (e.when >= end) // Nicht >= sonst kann es zu Event-Dopplungen kommen
                    break;
                if (e.when >= start) {
                    e.applyFunc();
                }
            }
            this.lastEventTime = time;
        }

        // LAYER
        for (const l of this._layer) {
            l.layerApply(time);
        }
    }

    public get duration():number {
        return this._duration;
    }

    public get loop():boolean {
        return this._loop;
    }

    public get name():string {
        return this._name;
    }

    public getLastApplyTime():number {
        return this._lastApplyTime;
    }
}


// ---------------------------------------------------------------------------------------------------------------------

function prepareTimePoint(tp:TimePoint, context:string, timeline:TimelineBuilder):number|null {
    if (typeof tp == "number") {
        return tp;
    }
    else {
        if (tp.endsWith("%")) {
            const factor = Number(tp.substr(0, tp.length-1)) / 100;
            if (!isNaN(factor)) {
                return factor*timeline.getDuration();
            }
            else {
                console.error(`Timeline issue during prepare layer. Invalid ${context}-value of "${tp}". Timeline: ${timeline.getName()}, prop: ${this.layerId}.`, this);
                return null;
            }
        }

        const val = timeline.getMarkValue(tp);
        if (val === undefined || val === null) {
            console.error(`Timeline issue during prepare layer. ${context}-mark not found: "${tp}". Timeline: ${timeline.getName()}, prop: ${this.layerId}.`, this);
            return null;
        }
        if (typeof val == "string") {
            if (val.endsWith("%")) {
                const factor = Number(val.substr(0, val.length-1)) / 100;
                if (!isNaN(factor)) {
                    return factor*timeline.getDuration();
                }
            }
            console.error(`Timeline issue during prepare layer. Invalid ${context}-value of mark "${tp}". Timeline: ${timeline.getName()}, prop: ${this.layerId}.`, this);
            return null;
        }
        else {
            return val;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * A "Timeline" modifies value of objects over time.
 *
 * Timeline
 *  -> Property (prop)
 *    -> Set Constant (value)
 *    -> Perform Transition (ease)
 *
 * To create the required objects we use a builder pattern like this:
 * ```js
 *
 * const inAnimation = timeline
 *  .mark("t1", 0)
 *  .mark("t2", "80%")
 *  .mark("end", 4)
 *  .prop(() => obj.transform.identity())   // << always called
 *  .prop((x, y) => obj.transform.scale(x, y), "scale")
 *     .value("t1", [0, 0])
 *     .value("t2", [1, 1])
 *     .ease("t2", "end", [1, 1], [4, 4], Easing.Elastic.easeIn)
 *  .prop(v => obj.mixColor.alpha = v, "alpha")
 *     .ease(0, "100%", 0, 1)
 *  .prop(count => obj.text = "" + Math.round(count), "count")
 *     .ease(0, "100%", 0, 10)
 *  .done(2) // << duration must be called to finish the timeline
 *
 * const fadeOut = timeline
 *   .read(inAnimation)
 *   .prop("alpha")
 *      .ease(0, 1, )
 *
 * ```
 *
 */
export function timeline(name:string=""):TimelineBuilder {
    const out = new TimelineBuilder();
    out.name(name)
    return out;
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Eine einfache Wrapper-Timeline welche die `other` timeline-lediglich von hinten nach vorn abspielt.
 * Wrapper to play a timeline reverse.
 */
export function  timelineReversed(other:PreparedTimeline, timeFactor:number=1):PreparedTimeline {
    const duration = other.duration;
    if (timeFactor == 0)
        throw new Error("timeFactor cannot be 0");

    return timeline(other.name + "Reversed")
        .prop(t => other.apply(t))
        .ease(0, duration/timeFactor, duration, 0)
        .done(duration/timeFactor);
}