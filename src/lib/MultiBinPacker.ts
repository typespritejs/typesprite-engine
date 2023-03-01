/**
 * MIT License
 *
 * Copyright (c) 2016 tvolodimir
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * ---
 *
 * SOURCE: https://github.com/image-org/js-packer
 */


export interface ISize {
    width: number,
    height: number,
}

export interface IRect {
    x: number;
    y: number;
    width: number;
    height: number,
    data: ISize;
}

export interface INode {
    x: number;
    y: number;
    width: number;
    height: number,
    children?: INode[]
}

export class MultiBinPacker {
    public readonly maxWidth: number;
    public readonly maxHeight: number;
    public readonly padding?: number;
    public readonly bins: BinaryTreeBin[] = [];
    public readonly oversizedElements: ISize[] = [];

    constructor(maxWidth: number, maxHeight: number, padding?: number) {
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.padding = padding;
    }

    public add(data: ISize) {
        if (data.width > this.maxWidth || data.height > this.maxHeight) {
            this.oversizedElements.push(data);
        } else {
            const added = this.bins.find(bin => !!bin.add(data));
            if (!added) {
                const bin = new BinaryTreeBin(this.maxWidth, this.maxHeight, this.padding);
                bin.add(data);
                this.bins.push(bin);
            }
        }
    }

    private sort(rects: ISize[]) {
        return rects.slice().sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    }

    public addArray(rects: ISize[]) {
        this.sort(rects).forEach(rect => this.add(rect));
    }
}

export class BinaryTreeBin {

    private maxWidth: number;
    private maxHeight: number;
    private padding: number;
    private rootNode: INode;

    public width: number;
    public height: number;
    public rects: IRect[];

    constructor(maxWidth: number, maxHeight: number, padding?: number) {
        this.width = 0;
        this.height = 0;
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.padding = padding || 0;
        this.rootNode = {x: 0, y: 0, width: maxWidth + this.padding, height: maxHeight + this.padding};
        this.rects = [];
    }

    public add(data: ISize): IRect | undefined {
        const node = this.findNode(this.rootNode, data.width + this.padding, data.height + this.padding);
        if (node) {
            node.children = this.createChildren(node, data.width + this.padding, data.height + this.padding);
            this.width = Math.max(this.width, node.x + data.width);
            this.height = Math.max(this.height, node.y + data.height);
            const rect: IRect = {width: data.width, height: data.height, x: node.x, y: node.y, data};
            this.rects.push(rect);
            return rect;
        }
        return undefined;
    }

    private findNode(node: INode, width: number, height: number): INode | undefined {
        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
                const found = this.findNode(node.children[i], width, height);
                if (found) {
                    return found;
                }
            }
            return undefined;
        }
        if ((width <= node.width) && (height <= node.height)) {
            return node;
        }
        return undefined;
    }

    private createChildren(node: INode, width: number, height: number): INode[] {
        const children = [];

        if (node.height - height > 0 && node.x < this.maxWidth) {
            children.push({
                x: node.x,
                y: node.y + height,
                width: node.width,
                height: node.height - height
            });
        }

        if (node.width - width > 0 && node.y < this.maxHeight) {
            children.push({
                x: node.x + width,
                y: node.y,
                width: node.width - width,
                height: height
            });
        }

        return children;
    }
}
