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

