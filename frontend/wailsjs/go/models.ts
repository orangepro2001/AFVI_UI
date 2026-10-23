export namespace connector {
	
	export class Machine {
	    id: string;
	    path: string;
	    status: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new Machine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.path = source["path"];
	        this.status = source["status"];
	        this.message = source["message"];
	    }
	}
	export class Config {
	    machines: Machine[];
	    active: string;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.machines = this.convertValues(source["machines"], Machine);
	        this.active = source["active"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class MachinePath {
	    id: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new MachinePath(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.path = source["path"];
	    }
	}
	export class PathCheck {
	    ok: boolean;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new PathCheck(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ok = source["ok"];
	        this.message = source["message"];
	    }
	}
	export class SaveInput {
	    machines: MachinePath[];
	    active: string;
	
	    static createFrom(source: any = {}) {
	        return new SaveInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.machines = this.convertValues(source["machines"], MachinePath);
	        this.active = source["active"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace inventory {
	
	export class ActiveModel {
	    name: string;
	    base: string;
	    resolution: string;
	    surface: string;
	
	    static createFrom(source: any = {}) {
	        return new ActiveModel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.base = source["base"];
	        this.resolution = source["resolution"];
	        this.surface = source["surface"];
	    }
	}
	export class AlignImage {
	    url: string;
	    width: number;
	    height: number;
	
	    static createFrom(source: any = {}) {
	        return new AlignImage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.width = source["width"];
	        this.height = source["height"];
	    }
	}
	export class AlignLine {
	    light: number;
	    channel: string;
	
	    static createFrom(source: any = {}) {
	        return new AlignLine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.light = source["light"];
	        this.channel = source["channel"];
	    }
	}
	export class AlignRoi {
	    id: string;
	    x: number;
	    y: number;
	    w: number;
	    h: number;
	
	    static createFrom(source: any = {}) {
	        return new AlignRoi(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.w = source["w"];
	        this.h = source["h"];
	    }
	}
	export class PictureSize {
	    width: number;
	    height: number;
	
	    static createFrom(source: any = {}) {
	        return new PictureSize(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.width = source["width"];
	        this.height = source["height"];
	    }
	}
	export class AlignView {
	    image: AlignImage;
	    size: PictureSize;
	    state: string;
	    note?: string;
	    rois: AlignRoi[];
	    edited: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AlignView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.image = this.convertValues(source["image"], AlignImage);
	        this.size = this.convertValues(source["size"], PictureSize);
	        this.state = source["state"];
	        this.note = source["note"];
	        this.rois = this.convertValues(source["rois"], AlignRoi);
	        this.edited = source["edited"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GvBox {
	    x: number;
	    y: number;
	    w: number;
	    h: number;
	
	    static createFrom(source: any = {}) {
	        return new GvBox(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.w = source["w"];
	        this.h = source["h"];
	    }
	}
	export class GvRect {
	    x: number;
	    y: number;
	    w: number;
	    h: number;
	
	    static createFrom(source: any = {}) {
	        return new GvRect(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.w = source["w"];
	        this.h = source["h"];
	    }
	}
	export class GvStats {
	    box: GvRect;
	    pixels: number;
	    mean: number;
	    std: number;
	    min: number;
	    max: number;
	    saturatedHigh: number;
	    saturatedLow: number;
	
	    static createFrom(source: any = {}) {
	        return new GvStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.box = this.convertValues(source["box"], GvRect);
	        this.pixels = source["pixels"];
	        this.mean = source["mean"];
	        this.std = source["std"];
	        this.min = source["min"];
	        this.max = source["max"];
	        this.saturatedHigh = source["saturatedHigh"];
	        this.saturatedLow = source["saturatedLow"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MedianView {
	    light: number;
	    image: AlignImage;
	    size: PictureSize;
	    state: string;
	    note?: string;
	    file?: string;
	    lights: number[];
	
	    static createFrom(source: any = {}) {
	        return new MedianView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.light = source["light"];
	        this.image = this.convertValues(source["image"], AlignImage);
	        this.size = this.convertValues(source["size"], PictureSize);
	        this.state = source["state"];
	        this.note = source["note"];
	        this.file = source["file"];
	        this.lights = source["lights"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ModelEntry {
	    index: string;
	    created: string;
	    name: string;
	    state: string;
	    resolution: string;
	
	    static createFrom(source: any = {}) {
	        return new ModelEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.created = source["created"];
	        this.name = source["name"];
	        this.state = source["state"];
	        this.resolution = source["resolution"];
	    }
	}
	export class Overlay {
	    mk: boolean;
	    ac: boolean;
	    ic: boolean;
	    sk: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Overlay(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mk = source["mk"];
	        this.ac = source["ac"];
	        this.ic = source["ic"];
	        this.sk = source["sk"];
	    }
	}
	
	export class SpecNode {
	    id: string;
	    name: string;
	    tone: string;
	    checked?: boolean;
	    lightChecked?: boolean[];
	    align?: string;
	    children?: SpecNode[];
	
	    static createFrom(source: any = {}) {
	        return new SpecNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.tone = source["tone"];
	        this.checked = source["checked"];
	        this.lightChecked = source["lightChecked"];
	        this.align = source["align"];
	        this.children = this.convertValues(source["children"], SpecNode);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SpecSet {
	    globalAlign: AlignLine[];
	    srAlign: AlignLine[];
	    overlay: Overlay;
	    tree: SpecNode[];
	
	    static createFrom(source: any = {}) {
	        return new SpecSet(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.globalAlign = this.convertValues(source["globalAlign"], AlignLine);
	        this.srAlign = this.convertValues(source["srAlign"], AlignLine);
	        this.overlay = this.convertValues(source["overlay"], Overlay);
	        this.tree = this.convertValues(source["tree"], SpecNode);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TeachSpec {
	    unit: SpecSet;
	    dummy: SpecSet;
	
	    static createFrom(source: any = {}) {
	        return new TeachSpec(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.unit = this.convertValues(source["unit"], SpecSet);
	        this.dummy = this.convertValues(source["dummy"], SpecSet);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class AppInfo {
	    version: string;
	    platform: string;
	
	    static createFrom(source: any = {}) {
	        return new AppInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.platform = source["platform"];
	    }
	}

}

