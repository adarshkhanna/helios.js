//var g = createGraph(jsonData)  
//graph.v(1).out().as('step').where('same',['keys','lang','name']).back('step')._().value()
//graph.v(1).out().aggregate('step').where('same',['keys','lang','name']).except('step')._().value()
//graph.v(1).out().aggregate('step').out().except('step')._().value()
//graph.v(1).out().aggregate('step').out().where('inclAny',['keys','lang']).except('step')._().value()
;(function (window, undefined) {
    'use strict';

    /** Detect free variable 'exports' */
    var freeExports = typeof exports == 'object' && exports &&
            (typeof global == 'object' && global && global == global.global && (window = global), exports);

    var toString = Object.prototype.toString,
        ArrayProto = Array.prototype,
        push = ArrayProto.push,
        pop = ArrayProto.pop,
        slice = ArrayProto.slice,
        shift = ArrayProto.shift,
        indexOf = ArrayProto.indexOf,
        concat = ArrayProto.concat,
        __env,// = Helios.ENV;
        graph = {'vertices': {}, 'edges': {}, 'v_idx': {}, 'e_idx': {}} ,
        graphUtils = {},
        fn = {},
        comparable = {},
        utils = {},
        pipeline,
        pipedObjects = [],
        unpipedFuncs = ['label', 'id', 'value', 'stringify', 'map', 'clone', 'path'];

    //pipeline = pipelinePrototype;
    Function.prototype.pipe = function () {
        var that = this;
        return function () {
            var pipedArgs = [],
            isStep = !fn.include(['as', 'back', 'loop', 'countBy', 'groupBy', 'groupSum', 'store'], that.name);

            push.call(pipedArgs, pipedObjects);
            push.apply(pipedArgs, arguments);
            
            if(isStep){
                pipeline.steps[pipeline.steps.currentStep += 1] = { 'pipedInArgs': pipedArgs, 'func': that, 'pipedOutArgs':[] };
            }
            //New piped Objects to be passed to the next step
            pipedObjects = that.apply(this, pipedArgs);
            if(isStep && pipeline.steps.currentStep !== 0){
                  push.call(pipeline.steps[pipeline.steps.currentStep].pipedOutArgs, pipedObjects);
            }
            return this;
        };
    };

    //pipe enable all Helios functions except end of pipe functions
    function pipe() {
        var func;
        for (func in this) {
            if (typeof this[func] == "function" && !fn.include(unpipedFuncs, func)) {
                this[func] = this[func].pipe();
            }
        }
        return this;
    }

    //Object constructor
    function Helios () {
        utils.resetPipe();
        return pipe.call(this);
    }

    /**
       * The 'helios' function.
       *
       * @name helios
       * @constructor
       * @param 
       * @returns {Object} Returns a 'Helios' instance.
       */
    // function helios() {
    //  	// allow invoking 'Helios' without the 'new' operator
    //  	return new Helios();
    //  }

    Helios.toString = function() { return "Helios"; };

    Helios.VERSION = '0.0.1';
    Helios.ENV = {
        'id': '_id',
        'label': '_label',
        'type': '_type',
        'outEid': '_outE',
        'inEid': '_inE',
        'outVid': '_outV',
        'inVid': '_inV'
    };

    

    /***************************************************************************************************

        Used to create a reference to Helios
        @name       Helios.newGraph
        @param      {JSON|optional} jsonGraph   The graph data to add to database. Needs to be in GraphSON
                                                format, otherwise Helios.ENV needs to be configured.
        @param      {JSON|optional} conf        Object to set Helios.ENV parameters. All ENV args are optional.
        @returns    {Helios}                    Returns an instance of Helios.
        
        @example

            var config = {
                'id':'@rid',
                'label': '@label',
                'type':'@type',
                'outEid': '@outE',
                'inEid': '@inE',
                'outVid': '@outV',
                'inVid': '@inV'
            };

            var someData = {
                "vertices":[
                    {"name":"marko","age":29,"@rid":10,"@type":"vertex"},
                    {"name":"vadas","age":27,"@rid":20,"@type":"vertex"},
                    {"name":"lop","lang":"java","@rid":30,"@type":"vertex"},
                    {"name":"josh","age":32,"@rid":40,"@type":"vertex"},
                    {"name":"ripple","lang":"java","@rid":50,"@type":"vertex"},
                    {"name":"peter","age":35,"@rid":60,"@type":"vertex"}
                    ],
                "edges":[
                    {"weight":0.5,"@rid":70,"@type":"edge","@outV":10,"@inV":20,"@label":"knows"},
                    {"weight":1.0,"@rid":80,"@type":"edge","@outV":10,"@inV":40,"@label":"knows"},
                    {"weight":0.4,"@rid":90,"@type":"edge","@outV":10,"@inV":30,"@label":"created"},
                    {"weight":1.0,"@rid":100,"@type":"edge","@outV":40,"@inV":50,"@label":"created"},
                    {"weight":0.4,"@rid":110,"@type":"edge","@outV":40,"@inV":30,"@label":"created"},
                    {"weight":0.2,"@rid":120,"@type":"edge","@outV":60,"@inV":30,"@label":"created"}
                ]
            };

            var g = Helios.newGraph(someData, config);

            >>>>> N.B. All examples will use the 'g' variable to demonstrate how to use Helios <<<<<

    ***************************************************************************************************/
    Helios.newGraph = function(jsonGraph, conf){

        if(!!jsonGraph && !(jsonGraph.hasOwnProperty('vertices') || jsonGraph.hasOwnProperty('edges'))){
            conf = jsonGraph;
            jsonGraph = false;
        }        

        if(!!conf){
            for(var key in conf){
                Helios.ENV[key] = conf[key];
            }
        }

        if(!!jsonGraph){
    	   graphUtils.loadGraphSON(jsonGraph);
        }
    	return new Helios();
    };

    /***************************************************************************************************

        Graph Utils: Used to load data into Helios. Reloading the same data will replace/update existing records.
                     Called fro Helios object used graph.
        @name       graph.loadGraphSON
        @param      {JSON|required} jsonData    The graph data to add to database. Needs to be in GraphSON
                                                format, otherwise Helios.ENV needs to be configured.
        @returns    {Helios}                    Returns the instance of Helios.

        @example

            var someData = {
                "vertices":[
                    {"name":"marko","age":29,"@rid":10,"@type":"vertex"},
                    {"name":"vadas","age":27,"@rid":20,"@type":"vertex"},
                    {"name":"lop","lang":"java","@rid":30,"@type":"vertex"},
                    {"name":"josh","age":32,"@rid":40,"@type":"vertex"},
                    {"name":"ripple","lang":"java","@rid":50,"@type":"vertex"},
                    {"name":"peter","age":35,"@rid":60,"@type":"vertex"}
                    ],
                "edges":[
                    {"weight":0.5,"@rid":70,"@type":"edge","@outV":10,"@inV":20,"@label":"knows"},
                    {"weight":1.0,"@rid":80,"@type":"edge","@outV":10,"@inV":40,"@label":"knows"},
                    {"weight":0.4,"@rid":90,"@type":"edge","@outV":10,"@inV":30,"@label":"created"},
                    {"weight":1.0,"@rid":100,"@type":"edge","@outV":40,"@inV":50,"@label":"created"},
                    {"weight":0.4,"@rid":110,"@type":"edge","@outV":40,"@inV":30,"@label":"created"},
                    {"weight":0.2,"@rid":120,"@type":"edge","@outV":60,"@inV":30,"@label":"created"}
                ]
            };

            var g= Helios.newGraph();
            g.graph.loadGraphSON(someData);

    ***************************************************************************************************/
    graphUtils.loadGraphSON = function(jsonData){
    		
    	var i, l, rows = [], vertex = {}, edge = {};

        __env = Helios.ENV;

		if(utils.isUndefined(jsonData)) return;
		if(utils.isString(jsonData)){
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.onreadystatechange = function() {
			        if(xmlhttp.readyState == 4){
			        	jsonData = JSON.parse(xmlhttp.response);
			        }
			};
			xmlhttp.open("GET",jsonData,false);
			xmlhttp.send(null);
		}

		//process vertices
		if(jsonData.vertices){
			rows = jsonData.vertices;
			l = rows.length; 

			for(i=0; i<l;i+=1) {
				graph.vertices[rows[i][__env.id]] = { 'obj': rows[i], 'type': 'vertex', 'outE': {}, 'inE': {} };
			}
		}
		
		//process edges
		if(jsonData.edges){
			rows = jsonData.edges;
			l = rows.length; 

			for(i=0; i<l;i+=1) {

				edge = { 'obj': rows[i], 'type': 'edge', 'outV': {}, 'inV': {} };
				graph.edges[edge.obj[__env.id]] = edge;

				if(!graph.vertices[edge.obj[__env.outVid]]){
					graph.vertices[edge.obj[__env.outVid]] = { 'obj': {}, 'type': 'vertex', 'outE': {}, 'inE': {} };
					
				}
				vertex = graph.vertices[edge.obj[__env.outVid]];
				if(!vertex.outE[edge.obj[__env.label]]){
					vertex.outE[edge.obj[__env.label]] = [];
				}
				edge.outV = vertex;
				push.call(vertex.outE[edge.obj[__env.label]], edge);

				if(!graph.vertices[edge.obj[__env.inVid]]){
					graph.vertices[edge.obj[__env.inVid]] = { 'obj': {}, 'type': 'vertex', 'outE': {}, 'inE': {} };
					
				}
				vertex = graph.vertices[edge.obj[__env.inVid]];
				if(!vertex.inE[edge.obj[__env.label]]){
					vertex.inE[edge.obj[__env.label]] = [];
				}
				vertex = graph.vertices[edge.obj[__env.inVid]];
				edge.inV = vertex;
				push.call(vertex.inE[edge.obj[__env.label]], edge);
			}
		}
		return Helios;
    };

    /***************************************************************************************************

        Clear and reset the graph.

        @name       graph.close()
        @returns    {Helios}                    Returns the instance of Helios.

        @example

            g.graph.close();

    ***************************************************************************************************/
    graphUtils.close = function(){
        graph = {'vertices': {}, 'edges': {}, 'v_idx': {}, 'e_idx': {}};
        return Helios;
    }

    //utils are internal utility functions
    utils.resetPipe = function (){
    	pipedObjects = [];
        pipeline = {
            'steps': {
                'currentStep': 0
            },
            'namedStep': {}            
        };
    }

    utils.toArray = function(o){
        var k, r = [];
        for(k in o) {
            r.push(o[k]);
        }
        return r;        
    }
    
    utils.isArray = function(o){
        return toString.call(o) === '[object Array]';
    }

    utils.isString = function(o){
        return toString.call(o) === '[object String]';
    }
    utils.isNumber = function(o){
        return toString.call(o) === '[object Number]';
    }
    
    utils.isDate = function(o){
        return toString.call(o) === '[object Date]';
    }
    
    utils.isEmpty = function(o){
        for(var key in o){
            return !o[key];
        }
    }

    utils.isFunction = function(o){
        return toString.call(o) === '[object Function]';    
    }
    utils.isNull = function(o){
        return toString.call(o) === '[object Null]';
    }

    utils.isUndefined = function(o){
        return toString.call(o) === '[object Undefined]';
    }
    
    fn.intersection = function (arr1, arr2, isObj){
        var r = [], o = {}, i, comp;
        for (i = 0; i < arr2.length; i++) {
            !!isObj ? o[arr2[i].obj[__env.id]] = true : o[arr2[i]] = true;
        }
        
        for (i = 0; i < arr1.length; i++) {
            comp = !!isObj ? arr1[i].obj[__env.id] : arr1[i];
            if (!!o[comp]) {
                r.push(arr1[i]);
            }
        }
        return r;
    }

    //fn are internal Functions
    fn.difference = function(arr1, arr2, isObj){
        var r = [], o = {}, i, comp;
        for (i = 0; i < arr2.length; i++) {
            !!isObj ? o[arr2[i].obj[__env.id]] = true : o[arr2[i]] = true;
        }
        
        for (i = 0; i < arr1.length; i++) {
            comp = !!isObj ? arr1[i].obj[__env.id] : arr1[i];
            if (!o[comp]) {
                r.push(arr1[i]);
            }
        }
        return r;
    }

    fn.unique = function(array){

        var o = {}, i, l = array.length, r = [];
        for(i=0; i<l;i+=1) o[array[i]] = array[i];
        for(i in o) r.push(o[i]);
        return r;

    }
    fn.uniqueObject = function(array){

        var o = {}, i, l = array.length, r = [];
        for(i=0; i<l;i+=1) o[array[i].obj[__env.id]] = array[i];
        for(i in o) r.push(o[i]);
        return r;

    }
    
    fn.countBy = function(array, o, props){

        var retVal = arguments[0],
            i, j, 
            l = array.length, 
            element = {},
            propsLen;

        if(!props){
            props = o;
            o = {};
            retVal = o;
        }
        propsLen = props.length;
        for(i=0; i<l;i+=1) {
            element = array[i].obj;
            for(j=0; j < propsLen; j++){
                !o[props[j]] ? o[props[j]] = 1  : o[props[j]] += 1 ;
            }
        }
        return retVal;

    }
    fn.sumBy = function(array, o, props){
        //TODO: Need to cater for CURRENCIES

        var retVal = arguments[0],
            i, j, 
            l = array.length, 
            element = {},
            propsLen;

        if(!props){
            props = o;
            o = {};
            retVal = o;
        }
        propsLen = props.length;
        for(i=0; i<l;i+=1) {
            element = array[i].obj;
            for(j=0; j < propsLen; j++){
                !o[props[j]] ? o[props[j]] = element[props[j]] : o[props[j]] += element[props[j]];
            }
        }
        return retVal;

    }

    fn.groupBy = function(arr, o, props){

        var retVal = arguments[0],
            i, j,
            array = dedup(arr),
            l = array.length,
            element = {},
            propsLen,
            group;

        if(!props){
            props = o;
            o = {};
            retVal = o;
        }
        propsLen = props.length;
        for(i=0; i<l; i+=1) {
            element = array[i].obj;
            group = o;
            for(j=0; j < propsLen; j++){
                if(j === propsLen - 1){
                    !group[element[props[j]]] ? group[element[props[j]]] = [element]: push.call(group[element[props[j]]],element);
                }else {
                    if(!group[element[props[j]]]) {
                        group[element[props[j]]] = {};
                    }                    
                }
                group = group[element[props[j]]];
            }
        }
        return retVal;
    }

    fn.groupCount = function(arr, o, props){

        var retVal = arguments[0],
            i, j,
            array = dedup(arr),
            l = array.length,
            element = {},
            propsLen,
            group;

        if(!props){
            props = o;
            o = {};
            retVal = o;
        }
        propsLen = props.length;
        for(i=0; i<l; i+=1) {
            element = array[i].obj;
            group = o;
            for(j=0; j < propsLen; j++){

                if(j === propsLen - 1){
                    !group[element[props[j]]] ? group[element[props[j]]] = [element]: push.call(group[element[props[j]]],element);
                }else{
                    if(!group[element[props[j]]]) {
                        group[element[props[j]]] = {};
                    }
                }
                group = group[element[props[j]]];
                !group.count ? group.count = 1  : group.count += 1;
            }
        }
        return retVal;
    }

    fn.clone = function(o){
        return JSON.parse(JSON.stringify(o));
    }

    fn.include = function(array, i){
        return indexOf.call(array, i) === -1 ? false : true;
    }
    fn.keys = function(o){
        var k, r = [];
        for(k in o) {
            r.push(k);
        }
        return r;  
    }
    fn.values = function(o){
        return utils.toArray(o);
    }
    
    fn.pick = function(o){

        var prop,
        props = concat.apply(ArrayProto, arguments),
        i = props.length,
        result = {};

        while (i--) {
          prop = props[i];
          if (prop in o) {
            result[prop] = o[prop];
          }
        }
        return result;

    }
    fn.flatten = function(array, shallow){

        var result = [];
        if (!array) {
          return result;
        }
        var value,
            index = -1,
            length = array.length;

        while (++index < length) {
          value = array[index];
          if (utils.isArray(value)) {
            push.apply(result, shallow ? value : fn.flatten(value));
          } else {
            result.push(value);
          }
        }
        return result;

    }

    fn.map = function(array, func){

        var len = array.length, val, retVal = [];
        
        if (!utils.isFunction(func))
          throw new TypeError();
        
        for (var i = 0; i < len; i++)
        {
            val = array[i]; // in case func mutates this
            retVal.push(func.call(null, val));
        }
              
        return retVal;

    }

    fn.filter = function(array, func){

        var len = array.length, val, retVal = [];
        
        if (!utils.isFunction(func))
          throw new TypeError();
        
        for (var i = 0; i < len; i++)
        {
            val = array[i]; // in case func mutates this
            if (func.call(null, val))
              retVal.push(val);
        }
              
        return retVal;

    }

    fn.each = function(array, func){

        var len = array.length, val, retVal = [];
        
        if (!utils.isFunction(func))
          throw new TypeError();
        
        for (var i = 0; i < len; i++)
        {
            val = array[i]; // in case func mutates this
            func.call(null, val);
        }
    }


    /***************************************************************************************************

        API: N.B. All examples will use the 'g' variable to demonstrate how to use Helios and uses the
                sample data where necessary to describe output
        
        @sample data

            var config = {
                'id':'@rid',
                'label': '@label',
                'type':'@type',
                'outEid': '@outE',
                'inEid': '@inE',
                'outVid': '@outV',
                'inVid': '@inV'
            };

            var someData = {
                "vertices":[
                    {"name":"marko","age":29,"@rid":10,"@type":"vertex"},
                    {"name":"vadas","age":27,"@rid":20,"@type":"vertex"},
                    {"name":"lop","lang":"java","@rid":30,"@type":"vertex"},
                    {"name":"josh","age":32,"@rid":40,"@type":"vertex"},
                    {"name":"ripple","lang":"java","@rid":50,"@type":"vertex"},
                    {"name":"peter","age":35,"@rid":60,"@type":"vertex"}
                    ],
                "edges":[
                    {"weight":0.5,"@rid":70,"@type":"edge","@outV":10,"@inV":20,"@label":"knows"},
                    {"weight":1.0,"@rid":80,"@type":"edge","@outV":10,"@inV":40,"@label":"knows"},
                    {"weight":0.4,"@rid":90,"@type":"edge","@outV":10,"@inV":30,"@label":"created"},
                    {"weight":1.0,"@rid":100,"@type":"edge","@outV":40,"@inV":50,"@label":"created"},
                    {"weight":0.4,"@rid":110,"@type":"edge","@outV":40,"@inV":30,"@label":"created"},
                    {"weight":0.2,"@rid":120,"@type":"edge","@outV":60,"@inV":30,"@label":"created"}
                ]
            };

            var g = Helios.newGraph(someData, config);

    ***************************************************************************************************/
    /***************************************************************************************************

        Called to emit the result from traversing the graph.

        @name       pipedValue()        Not to be called directly
        @alias      value()             callable
        @returns    {Object Array}      Returns a Referenced Object Array to emitted Vertices or Edges.
        
        @example
            
            var result = g.V().value();

    ***************************************************************************************************/
    function pipedValue(){
    	var retVal = pipedObjects;
    	utils.resetPipe();
    	return retVal;
    }

    /***************************************************************************************************

        Called to emit the stringified result from traversing the graph.

        @name       stringify()             callable
        @param      {String*|String Array}   Comma delimited string or string array of keys to be mapped to emit.
        @returns    {String}                Returns a string.
        
        @example
            
            var result = g.V().stringify();
            var result = g.V().stringify('name','age');

    ***************************************************************************************************/
    function stringify(){
        var retVal = [], args = arguments;
        if(!!pipedObjects[0] && !!pipedObjects[0].obj){
    		return JSON.stringify(map.apply(null, args));
    	}
    	retVal = pipedObjects;
    	utils.resetPipe();
    	return JSON.stringify(retVal);
    }

    /***************************************************************************************************

        Called to emit the traversal path.

        @name       path()
        @returns    {String[0] & Object Array} Returns the Path string in position 0, and an emitted Objects
                                               in subsequent positions of Array.
        
        @example
            
            var result = g.v(10).out().path();

            result >> ["{"step 1":["v[10]"],"step 2":["v[20]","v[40]","v[30]"]}", Object, Object, Object]


    ***************************************************************************************************/
    function path() {


        var retVal = [], 
            stepPaths, 
            stepsObj = pipeline.steps, 
            retVal = [], 
            o={}, 
            edge, 
            edgeStr, i, j, stepRecs, len;

        for(i = 1; i <= stepsObj.currentStep; i++){
            stepRecs = stepsObj[i].pipedOutArgs[0];
            stepPaths = o['step '+i] = [];
            for(j=0, len = stepRecs.length; j<len;j++){
                if(stepRecs[j].type === 'vertex'){
                    push.call(stepPaths,'v['+stepRecs[j].obj[__env.id]+']');
                } else {
                    edge = stepRecs[j].obj;
                    edgeStr = 'v['+ edge[__env.outVid] + '], e[' + edge[__env.id] + '][' + 
                                edge[__env.outVid] + '-' + edge[__env.label] + '->' + 
                                edge[__env.inVid] + '], v[' + edge[__env.inVid] +']';
                    push.call(stepPaths,edgeStr);
                }
            }
        }
        push.call(retVal,JSON.stringify(o));
        push.apply(retVal, pipedObjects);
        utils.resetPipe();
        return retVal;
    }

    /***************************************************************************************************

        Called to obtain root vertices to begin traversal.

        @name       v()
        @param      {Mixed*}        Pass in comma separated list or array of ids
        @returns    {Object Array}  emits Vertices.
        
        @example
            
            var result = g.v(10).value();

    ***************************************************************************************************/
    function v() {

        var retVal = [], 
        args = fn.flatten(slice.call(arguments, 1)),
        length = args.length;
        while(length){
        	length--;
            push.call(retVal, graph.vertices[args[length]]);
        }
         
        return retVal;

    }

    /***************************************************************************************************

        Called to obtain root edges to begin traversal.

        @name       e()
        @param      {Mixed*}        Pass in comma separated list or array of ids
        @returns    {Object Array}  emits Edges.
        
        @example
            
            var result = g.e(70).value();

    ***************************************************************************************************/
    function e() {
        var retVal = [], length, args = fn.flatten(slice.call(arguments, 1));
        length = args.length;
        while(length){
            length--;
            push.call(retVal, graph.edges[args[length]]);
        }
         
        return retVal;
    }

    /***************************************************************************************************

        @name       id()
        @returns    {Array}  emits object ids.
        
        @example
            
            var result = g.e(70).id(); >> [70]

    ***************************************************************************************************/
    function id() {
        var retVal = [];

        retVal = fn.map(pipedObjects, function(element, key, list) {
            return element.obj[__env.id];
        });
        
        utils.resetPipe();
        return retVal;
    }

    /***************************************************************************************************

        @name       label()
        @returns    {Array}  emits edge labels.
        
        @example
            
            var result = g.e(70).label(); >> ["knows"]

    ***************************************************************************************************/
    function label() {

        var retVal = [];

        retVal = fn.map(pipedObjects, function(element, key, list) {
            return element.obj[__env.label];
        });

        utils.resetPipe(); 
        return retVal;
    }

    /***************************************************************************************************

        @name       out()
        @param      {String*|Array} Comma separated list or array of labels.
        @returns    {Object Array}  emits Out adjacent Vertices to the vertex.
        @example
            
            var result = g.v(10).out().value();
            var result = g.v(10).out('knows').value();

    ***************************************************************************************************/
    function out() {

        var retVal = [],
            args = slice.call(arguments, 1);

        fn.each(arguments[0], function(vertex, key, list) {
            if (!utils.isEmpty(vertex.outE)) {
                var value = !!args.length ? fn.pick(vertex.outE, args) : vertex.outE;
                fn.each(fn.flatten(fn.values(value)), function(edge) {
                    push.call(retVal, edge.inV);
                });
            }
        });
         
        return retVal;
    }

    /***************************************************************************************************

        @name       outV()
        @returns    {Object Array}  emits the outgoing tail vertex of the edge.
        @example
            
            var result = g.v(40).inE().outV().value();

    ***************************************************************************************************/
    function outV(){
        var retVal = fn.map(arguments[0], function(edge, key, list) {
        	return edge.outV;
        });
         
        return retVal;
    }

     function _in () {

        var retVal = [],
            args = slice.call(arguments, 1);

        fn.each(arguments[0], function(vertex, key, list) {
            if (!utils.isEmpty(vertex.inE)) {
                var value = !!args.length ? fn.pick(vertex.inE, args) : vertex.inE;
                fn.each(fn.flatten(fn.values(value)), function(edge) {
                    push.call(retVal, edge.outV);
                });
            }
        });
        return retVal;
    }

    /***************************************************************************************************

        @name       inV()
        @returns    {Object Array}  emits the incoming head vertex of the edge.
        @example
            
            var result = g.v(40).outE().inV().value();

    ***************************************************************************************************/
    function inV(){
        var retVal = fn.map(arguments[0], function(edge, key, list) {
            return edge.inV;
        });
         
        return retVal;
    }


    /***************************************************************************************************

        @name       both()
        @param      {String*|Array} Comma separated list or array of labels.
        @returns    {Object Array}  emits both adjacent Vertices of the vertex.
        @example
            
            var result = g.v(10).both().value();
            var result = g.v(10).both('knows').value();

    ***************************************************************************************************/
    function both() {

        var retVal = [],
            args = slice.call(arguments, 1);

        fn.each(arguments[0], function(vertex, key, list) {
            if (!utils.isEmpty(vertex.outE)) {
                var value = !!args.length ? fn.pick(vertex.outE, args) : vertex.outE;
                fn.each(fn.flatten(fn.values(value)), function(edge) {
                    push.call(retVal, edge.inV);
                });
            }
            if (!utils.isEmpty(vertex.inE)) {
                var value = !!args.length ? fn.pick(vertex.inE, args) : vertex.inE;
                fn.each(fn.flatten(fn.values(value)), function(edge) {
                    push.call(retVal, edge.outV);
                });
            }
        });
    	
         
        return retVal;
    }

    /***************************************************************************************************

        @name       bothV()
        @returns    {Object Array}  emits both incoming and outgoing vertices of the edge.
        @example
            
            var result = g.e(70).bothV().value();

    ***************************************************************************************************/
    function bothV() {
        var retVal = [];

        fn.each(arguments[0], function(edge, key, list) {
            push.call(retVal, edge.inV);
            push.call(retVal, edge.outV);
       });
       return retVal;
    }

    /***************************************************************************************************

        @name       outE()
        @param      {String*|Array} Comma separated list or array of labels.
        @returns    {Object Array}  emits the outgoing edges of the vertex.
        @example
            
            var result = g.v(10).outE().outV().value();
            var result = g.v(10).outE('knows').value();

    ***************************************************************************************************/
    function outE() {

        var retVal = [],
            args = slice.call(arguments, 1);

        fn.each(arguments[0], function(vertex, key, list) {
            if (!utils.isEmpty(vertex.outE)) {
                var value = !!args.length ? fn.pick(vertex.outE, args) : vertex.outE;
                fn.each(fn.flatten(fn.values(value)), function(edge) {
                    push.call(retVal, edge);
                });
            }
        });
        return retVal;
    }

    /***************************************************************************************************

        @name       inE()
        @param      {String*|Array} Comma separated list or array of labels.
        @returns    {Object Array}  emits the incoming edges of the vertex.
        @example
            
            var result = g.v(10).inE().value();
            var result = g.v(10).inE('knows').value();

    ***************************************************************************************************/
    function inE() {

        var retVal = [],
            args = slice.call(arguments, 1);

        fn.each(arguments[0], function(vertex, key, list) {
            if (!utils.isEmpty(vertex.inE)) {
                var value = !!args.length ? fn.pick(vertex.inE, args) : vertex.inE;
                fn.each(fn.flatten(fn.values(value)), function(edge) {
                    push.call(retVal, edge);
                });
            }
        });

         
        return retVal;
    }

    /***************************************************************************************************

        @name       bothE()
        @param      {String*|Array} Comma separated list or array of labels.
        @returns    {Object Array}  emits both incoming and outgoing edges of the vertex.
        @example
            
            var result = g.v(10).bothE().value();
            var result = g.v(10).bothE('knows').value();

    ***************************************************************************************************/
    function bothE() {

    	var retVal = [],
            args = slice.call(arguments, 1);

        fn.each(arguments[0], function(vertex, key, list) {
        	
            if (!utils.isEmpty(vertex.outE)) {
                var value = !!args.length ? fn.pick(vertex.outE, args) : vertex.outE;
                fn.each(fn.flatten(fn.values(value)), function(edge) {
                    push.call(retVal, edge);
                });
            }
            if (!utils.isEmpty(vertex.inE)) {
                var value = !!args.length ? fn.pick(vertex.inE, args) : vertex.inE;
                fn.each(fn.flatten(fn.values(value)), function(edge) {
                    push.call(retVal, edge);
                });
            }
        });

         
        return retVal;
    }

    /***************************************************************************************************

        @name       V()
        @returns    {Object Array}  emits all graph vertices.
        @example
            
            var result = g.V().value();

    ***************************************************************************************************/
    function V() {
        return utils.toArray(graph.vertices);
    }

    /***************************************************************************************************

        @name       E()
        @returns    {Object Array}  emits all graph edges.
        @example
            
            var result = g.E().value();

    ***************************************************************************************************/
    function E() {
        return utils.toArray(graph.edges);
    }

    /***************************************************************************************************

        @name       store()             callable
        @alias      as()                callable
        @param      !{String*|Array}    Comma separated list or array of labels.
        @param      {Function}          User Defined.
        @param      {Mixed|Array}       Values to be passed to Function. Order of arguments should match paramaters
        @returns    {Object Array}      Returns the objects after apply the Function (if defined). If an Array is 
                                        passed the object will also be stored in that Array after applying the Function.
        @examples
            
            var result = g.v(10).outE().inV().store().value();

            results = g.v(10).out().as('x').in().back('x').value();
            results = g.v(10).out().store('x').in().back('x').value();

            var x = [];
            results = g.v(10).outE().inV().store(x).value();


            x = [];
            results = g.v(10).out('knows').store(x, function(incAge){
                                                        var retVal = [];
                                                        fn.each(this, function(element){
                                                          element.obj.age += incAge;
                                                          retVal.push(element);
                                                        });
                                                    return retVal;}, 10).value();

    ***************************************************************************************************/
    function store(){
        var retVal = arguments[0],
            args = slice.call(arguments, 1), func, funcArgs = [];

            if(!!args.length){
                //if pass in Array, populate it, else store as a named pipe 
                utils.isArray(args[0]) ? push.apply(args[0],arguments[0]) : pipeline.namedStep[args[0]] = pipeline.steps.currentStep;

                if(utils.isFunction(args[1])){
                    func = args[1];
                    args.shift();
                    funcArgs = fn.flatten(slice.call(args, 1));
                    retVal = func.apply(arguments[0] ,funcArgs);
                }           
            }
        return retVal;
    }

    /***************************************************************************************************
        Go back to the results from n-steps ago.
        @name       back()                  callable
        @param      !{Number|String|Array}  If a Number is passed, Helios will go back the results n steps ago.
                                            If a String is passed, Helios will use results from a previously stored step.
                                            If an Array is passed, Helios will use those results.
        @returns    {Object Array}          emits an Object Array
        @examples
            
            results = g.v(10).out().in().back(2).value();
            results = g.v(10).out().as('x').in().back('x').value();
            results = g.v(10).out().store('x').in().back('x').value();
            
            var arr = [];
            results = g.v(10).out().store(arr).in().back(arr).value();

    ***************************************************************************************************/
    function back(){
        var backSteps = arguments[1],
            stepBackTo;
            
            if(utils.isArray(backSteps)){
                return backSteps;
            }

            if(utils.isString(backSteps)){
                if(utils.isUndefined(pipeline.namedStep[backSteps])){
                    return;
                }
                stepBackTo = pipeline.namedStep[backSteps];
            } else {
                stepBackTo = pipeline.steps.currentStep - backSteps;
                
            }

        return pipeline.steps[stepBackTo].pipedOutArgs[0];
    }

    
    /***************************************************************************************************
        Allow everything to pass except what is in collection
        @name       except()            callable
        @param      !{String|Array}     If a String is passed, Helios will use results from a previously stored step.
                                        If an Array is passed, Helios will use those results.
        @returns    {Object Array}      emits an Object Array
        @example
            
            g.v(10).out().store('x').out().except('x').value();
            
            var arr = [];
            results = g.v(10).out().store(arr).out().except(arr).value();

    ***************************************************************************************************/
    function except(){

        var arg = arguments[1], dSet, diff, retVal = [];
        dSet = utils.isArray(arg) ? arg : pipeline.steps[pipeline.namedStep[arg]].pipedOutArgs[0];
        retVal = fn.difference(arguments[0],dSet, true);
         
        return retVal;
    }

    /***************************************************************************************************
        Allow Objects to pass that meet specified criteria
        @name       filter()            callable
        @alias      andFilter()         callable only after filter() has been called
        @param      {Function}          User defined. 'this' is a single outgoing object
        @param      {Mixed|Array}       Comma separtated or Array of Values to be passed to Function.
                                        Order of arguments should match paramaters
        OR

        @param      {Comparable String} 'eq' = equal to,
                                        'neq' = not equal to,
                                        'lt' = less than,
                                        'lte' = less than or equal to,
                                        'gt' = greater than,
                                        'gte' = greater than or equal to,
                                        'btwn' = between,
                                        'has' = has all,
                                        'hasNot' = does not have all,
                                        'hasAny' = has any,
                                        'hasNotAny' = does not have any
        @param      {Array}             Comma separtated or Array of Key/Values pairs or Keys oe Values to be compared.

        @returns    {Object Array}      Returns the objects after apply the Function (if defined). If an Array is 
                                        passed the object will also be stored in that Array after applying the Function.
        @examples
            
            var results = g.v(10).filter(function(name) {  return this.obj.name === name; },'marko').value();

            g.v(10).out().filter('eq',['name','vadas']).value();
            g.v(10).out().filter('eq',['name','vadas']).value();
            g.v(10).out().filter('neq',['name','vadas']).value();
            g.v(10).out().filter('lt',['age',30]).value();
            g.v(10).out().filter('lte',['age',27]).value();
            g.v(10).out().filter('gt',['age',30]).value();
            g.v(10).out().filter('gte',['age',32]).value();
            g.v(10).out().filter('btwn',['age',30, 33]).value();
            
            *********************************************************************************************
            * has, hasNot, hasAny & hasNotAny take 'keys' or 'values' as the first value in array.      *
            *********************************************************************************************
            g.v(10).out().filter('has',['keys','name', 'age']).value();
            g.v(10).out().filter('hasAny',['keys', 'age', 'lang']).value();
            g.v(10).out().filter('hasAny',['values', 'josh', 'lop']).value();
            
            *********************************************************************************************
            * passing in more Comparables are treated as logical 'AND' ie. name === vadas & age > 25    *
            * but can also be used with the andFilter()                                                 *
            *********************************************************************************************            
            g.v(10).out().filter('eq',['name','vadas'], 'gt', ['age', 25]).value();
            g.v(10).out().filter('eq',['name','vadas']).andFilter('gt', ['age', 25]).value();

            *********************************************************************************************
            * passing in more Key/Value pairs are treated as logical 'OR' ie. name === 'vadas' ||       *
            * age === 32 but you can also use the orFilter()                                            *
            *********************************************************************************************            
            g.v(10).out().filter('eq',['name','vadas', 'age', 32]).value();
            g.v(10).out().filter('eq',['name','vadas']).orFilter('gt', ['age', 25]).value();
            g.v(10).out().filter('eq',['name','vadas']).orFilter('gt', ['age', 25]).orFilter('eq', ['name', 'lop']).value();

    ***************************************************************************************************/
    function filter(){

        var     retVal = [],
                records = arguments[0],
                args = slice.call(arguments, 1),
                func,
                funcArgs = [],
                argLen = args.length;

        if(utils.isFunction(args[0])){
            
            func = args[0];
            funcArgs = fn.flatten(slice.call(args, 1),true);

            fn.each(records, function(element){
                if(func.apply(element, funcArgs)) {
                    push.call(retVal, element);
                }
            });

        } else {

            while(argLen){
                argLen -= 2;
                retVal = fn.filter(records, comparable[args[argLen]](args[argLen + 1]));
            }
        }
        
        pipeline.namedStep.filter = pipeline.steps.currentStep;    
         
        return retVal;
    }
    /***************************************************************************************************
        Allow Objects to pass that meet specified criteria
        @name       orFilter()          callable only after filter() has been called
        @param      {Function}          User defined. 'this' is a single outgoing object
        @param      {Mixed|Array}       Comma separtated or Array of Values to be passed to Function.
                                        Order of arguments should match paramaters
        OR

        @param      {Comparable String} 'eq' = equal to,
                                        'neq' = not equal to,
                                        'lt' = less than,
                                        'lte' = less than or equal to,
                                        'gt' = greater than,
                                        'gte' = greater than or equal to,
                                        'btwn' = between,
                                        'has' = has all,
                                        'hasNot' = does not have all,
                                        'hasAny' = has any,
                                        'hasNotAny' = does not have any
        @param      {Array}             Comma separtated or Array of Key/Values pairs or Keys oe Values to be compared.

        @returns    {Object Array}      Returns the objects after apply the Function (if defined). If an Array is 
                                        passed the object will also be stored in that Array after applying the Function.
        @examples
            g.v(10).out().filter('eq',['name','vadas']).orFilter('gt', ['age', 25]).value();
            g.v(10).out().filter('eq',['name','vadas']).orFilter('gt', ['age', 25]).orFilter('eq', ['name', 'lop']).value();

    ***************************************************************************************************/
    function orFilter() {
        var  retVal = []
            ,prevRecords = arguments[0]
            ,args = slice.call(arguments, 1)
            ,records = pipeline.steps[pipeline.namedStep.filter].pipedInArgs[0]
            ,func
            ,funcArgs = []
            ,argLen
            ,ids = [];

        if(utils.isFunction(args[0])){
            func = args[0];
            funcArgs = fn.flatten(slice.call(args, 1),true);

            fn.each(records, function(element){
                if(func.apply(element, funcArgs)) {
                    push.call(retVal, element);
                }
            });


        } else {

            argLen = args.length;
            while(argLen){
                argLen -= 2;
                retVal = fn.filter(records, comparable[args[argLen]](args[argLen + 1]));
            }

        }

        for (var i = 0, len = retVal.length; i < len; i++){
            push.call(ids,retVal[i].obj[__env.id]);
        }
        ids = fn.unique(ids);

        for (var i = 0, len = prevRecords.length; i < len; i++){
            if(!fn.include(ids, prevRecords[i].obj[__env.id])){
                push.call(retVal, prevRecords[i]);
            }
        }
         
        return retVal;    
    }

    /***************************************************************************************************
        Output the property map
        @name       map()               callable
        @param      {String|Array}      Optional comma separated String or Array of properties to map.
        @returns    {Object Array}      emits an Object Array
        @example
            
            g.v(10).map();
            g.v(10).map('name', 'age');
            g.v(10).map(['name', 'age']);

    ***************************************************************************************************/
    function map(){
        var retVal, params = [], args = arguments;
        //if args passed need to do fn.pick()
        !!args.length ? 
            retVal = fn.map(pipedObjects, function(element){
                 params = [];
                 push.call(params, element.obj);
                 push.apply(params, args);
                return fn.pick.apply(this, params);
            }) :
            retVal = fn.map(pipedObjects, function(element){
                return element.obj;
            })

        utils.resetPipe();
        return retVal;
    }

    /***************************************************************************************************
        Allow nothing to pass but retain what is include in the collection
        @name       include()            callable
        @param      !{String|Array}     If a String is passed, Helios will use results from a previously stored step.
                                        If an Array is passed, Helios will use those results.
        @returns    {Object Array}      emits an Object Array
        @examples

            g.v(10).out().store('x').out().retain('x').value();
            
            var arr = [];
            results = g.v(10).out().store(arr).out().retain(arr).value();

    ***************************************************************************************************/
    function retain(){

        var arg = arguments[1], dSet, diff, retVal = [];

        dSet = utils.isArray(arg) ? arg : pipeline.steps[pipeline.namedStep[arg]].pipedOutArgs[0];
        retVal = fn.intersection(arguments[0],dSet, true);
         
        return retVal;
    }

    /***************************************************************************************************
        Generic Step
        @name       step()              callable
        @alias      transform()         callable
        @alias      sideEffect()        callable
        @param      !{Function}         User defined. 'this' is the array of outgoing objects.
        @returns    {Object Array}      emits an Object Array
        @examples

            g.v(10).out().step(function(){ 
                                var arr = []; 
                                _.each(this, function(element){
                                  arr.push(element.obj.name)}); 
                                return arr; }).value();

    ***************************************************************************************************/
    function step() {
        var  retVal
            ,args = slice.call(arguments, 1)
            ,func
            ,funcArgs = [];

        if(utils.isFunction(args[0])){
            func = args[0];
            funcArgs = fn.flatten(slice.call(args, 1),true);
            retVal = func.apply(arguments[0] ,funcArgs)
        } else {
            retVal = "Invalid function";
        }
        return retVal;    

    }

    /***************************************************************************************************
        Count by property
        @name       countBy()           callable
        @param      {Object}            Optional Object variable to store output. If an Object variable is passed
                                        in the output will be stored in that variable and processing will
                                        proceed as normal, otherwise the modified object is returned and
                                        is not chainable
        @param      !{String|Array}     Comma separated String or Array of properties.
        @returns    {Object}            emits an Object
        @example

        g.v(1).out('knows').countBy(['salary','age']).value()
        g.v(1).out('knows').countBy('salary','age').value()

        var t = {};
        g.v(1).out('knows').countBy(t,['salary','age']).value()
        
        *****************************************************************************************
        * To aggregate call this function multiple times passing in same variable               *
        *****************************************************************************************
        var t = {};
        g.v(1).out('knows').countBy(t,['salary','age']).in.countBy(t,['salary','age']).value()

    ***************************************************************************************************/
    function countBy() {
        var args = fn.flatten(slice.call(arguments,1)),
            objVar= args[0], params;
        
        utils.isString(args[0]) ? objVar = slice.call(args) : params = slice.call(args,1);

        return fn.countBy(arguments[0], objVar, params);
    }


    /***************************************************************************************************
        Sum by property
        @name       groupSum()          callable
        @param      {Object}            Optional Object variable to store output. If an Object variable is passed
                                        in the output will be stored in that variable and processing will
                                        proceed as normal, otherwise the modified object is returned and
                                        is not chainable
        @param      !{String|Array}     Comma separated String or Array of properties.
        @returns    {Object}            emits an Object
        @example

        g.v(1).out('knows').groupSum(['salary','age']).value()
        g.v(1).out('knows').groupSum('salary','age').value()

        var t = {};
        g.v(1).out('knows').groupSum(t,['salary','age']).value()
        to aggregate call this function multiple times passing in same variable
        
        *****************************************************************************************
        * To aggregate call this function multiple times passing in same variable               *
        *****************************************************************************************
        var t = {};
        g.v(1).out('knows').countBy(t,['salary','age']).in.groupSum(t,['salary','age']).value()

    ***************************************************************************************************/
    function groupSum() {
        var args = fn.flatten(slice.call(arguments,1)),
            objVar= args[0], params;
        
        utils.isString(args[0]) ? objVar = slice.call(args) : params = slice.call(args,1);

        return fn.sumBy(arguments[0], objVar, params);
    }


    /***************************************************************************************************
        Group by property
        @name       groupSum()          callable
        @param      {Object}            Optional Object variable to store output. If an Object variable is passed
                                        in the output will be stored in that variable and processing will
                                        proceed as normal, otherwise the modified object is returned and
                                        is not chainable
        @param      !{String|Array}     Comma separated String or Array of properties.
        @returns    {Object}            emits an Object
        @example

        g.v(1).out('knows').groupBy(['salary','age']).value()
        g.v(1).out('knows').groupBy('salary','age').value()
        g.V().outE().inV().groupBy(['age','name']).stringify();

        var t = {};
        g.v(1).out('knows').groupBy(t,['salary','age']).value()

    ***************************************************************************************************/
    function groupBy() {
        var args = fn.flatten(slice.call(arguments,1)),
            objVar= args[0], params;
        
        utils.isString(args[0]) ? objVar = slice.call(args) : params = slice.call(args,1);

        return fn.groupBy(arguments[0], objVar, params);        
    }


    /***************************************************************************************************
        Group by and Count by property
        @name       groupSum()          callable
        @param      {Object}            Optional Object variable to store output. If an Object variable is passed
                                        in the output will be stored in that variable and processing will
                                        proceed as normal, otherwise the modified object is returned and
                                        is not chainable
        @param      !{String|Array}     Comma separated String or Array of properties.
        @returns    {Object}            emits an Object
        @example

        var t = {};
        g.v(1).out('knows').groupCount(t,['salary','age']).value()

    ***************************************************************************************************/
    function groupCount() {
        var args = fn.flatten(slice.call(arguments,1)),
            objVar= args[0], params;
        
        utils.isString(args[0]) ? objVar = slice.call(args) : params = slice.call(args,1);

        return fn.groupCount(arguments[0], objVar, params);        
    }

    /***************************************************************************************************
        Iterate over a specified region of the path
        @name       loop()              callable
        @param      !{Number|String}    Number of back steps or stored position
        @param      !{Number}           Number of iterations i.e. how many times to traverse those steps
        @returns    {Object}            emits an Object
        @examples

        g.v(40).out().in().loop(2, 3).value();
        g.v(40).out().as('x').in().loop('x', 3).value();

    ***************************************************************************************************/
    function loop() {

        var backSteps = arguments[1],
            iterations = arguments[2] - 1, //Reduce the iterations because one has already been done
            func,
            funcName,
            fromStep,
            toStep;

            if(utils.isString(backSteps)){
                backSteps = pipeline.steps.currentStep + 1 - pipeline.namedStep[backSteps];
            }
        
            while(iterations--){
                fromStep = pipeline.steps.currentStep + 1 - backSteps; //Need to add one to allow for loop step which is not counted
                toStep = pipeline.steps.currentStep;
                for(var j=fromStep; j<=toStep; j++){
                    func = pipeline.steps[j].func;
                    funcName = func.name === '_in'? 'in' : func.name;
                    this[funcName].apply(pipeline.steps[j].pipedInArgs[0], slice.call(pipeline.steps[j].pipedInArgs, 1));
                }
                
            }

        return pipeline.steps[pipeline.steps.currentStep].pipedOutArgs[0];        

    }
    
    /***************************************************************************************************
        Remove duplicate objects
        @name       dedup()             callable
        @returns    {Object Array}            emits an Object Array
        @example

        g.v(10).out().in().dedup().value();

    ***************************************************************************************************/    
    function dedup() {
        var  retVal = fn.uniqueObject(arguments[0]);
        return retVal;  
    }

    /***************************************************************************************************
        Clone output objects
        @name       clone()                 callable
        @returns    {Object Array}          emits an Object Array
        @example

        g.v(10).out().clone();

    ***************************************************************************************************/    
    function clone() {
        return JSON.parse(stringify());
    }

    //comparables
    comparable.eq = function(atts){
        return function(x){

            var length = atts.length;
            while(length){
                length -= 2;
                if(x.obj[atts[length]] === atts[length + 1]){
                    return true;
                }
            }
            return false;
        }
    },

    comparable.neq = function (atts){
        return function(x){
            var length = atts.length;
            while(length){
                length -= 2;
                if(x.obj[atts[length]] !== atts[length + 1]){
                    return true;
                }
            }
            return false;
        }
    },

    comparable.lt = function (atts){

        return function(x){
            var length = atts.length;
            while(length){
                length -= 2;
                if(x.obj[atts[length]] < atts[length + 1]){
                    return true;
                }
            }
            return false;
        }
    },

    comparable.lte = function (atts){
        return function(x){
            var length = atts.length;
            while(length){
                length -= 2;
                if(x.obj[atts[length]] <= atts[length + 1]){
                    return true;
                }
            }
            return false;
        }
    },

    comparable.gt = function (atts){
        return function(x){
            var length = atts.length;
            while(length){
                length -= 2;
                if(x.obj[atts[length]] > atts[length + 1]){
                    return true;
                }
            }
            return false;
        }
    },

    comparable.gte = function (atts){
        return function(x){
            var length = atts.length;
            while(length){
                length -= 2;
                if(x.obj[atts[length]] >= atts[length + 1]){
                    return true;
                }
            }
            return false;
        }
    },

    //Extras
    comparable.btwn = function (atts){
        return function(x){
            var length = atts.length;
            while(length){
                length -= 3;
                if(x.obj[atts[length]] > atts[length + 1] && x.obj[atts[length]] < atts[length + 2]){
                    return true;
                }
            }
            return false;
        }
    },
    //args[0] -> 'keys','values'
    //TODO: Accept RegEx and Embedded Object Referencing
    //TODO: Test how dates would work
    //has All the listed properties
    comparable.has = function (atts){
        return function(x){
            var args = slice.call(atts, 1);
            return fn.intersection(fn[atts[0]](x.obj),args).length === args.length;
        }
    },
    //exclude All
    comparable.hasNot = function (atts){//not all
        return function(x){
            var args = slice.call(atts, 1);
            return fn.intersection(fn[atts[0]](x.obj),args).length !== args.length;
        }
    },
    //include Any
    comparable.hasAny = function (atts){//any
        return function(x){
            return !!fn.intersection(fn[atts[0]](x.obj),slice.call(atts, 1)).length;
        }
    },
    //exclude Any
    comparable.hasNotAny = function (atts){//not any
        return function(x){
            return !fn.intersection(fn[atts[0]](x.obj),slice.call(atts, 1)).length;
        }
    },


    //Generic Step
    Helios.prototype.step = step;

    //Transform-Based Steps
    Helios.prototype.transform = step;
    Helios.prototype.map = map;
    Helios.prototype.id = id;
    Helios.prototype.label = label;

    Helios.prototype.V = V;
    Helios.prototype.E = E;
    Helios.prototype.out = out;
    Helios.prototype.in = _in;
    Helios.prototype.outV = outV;
    Helios.prototype.outE = outE;
    Helios.prototype.inV = inV;
    Helios.prototype.inE = inE;
    Helios.prototype.both = both;
    Helios.prototype.bothV = bothV;
    Helios.prototype.bothE = bothE;
    Helios.prototype.path = path;
    Helios.prototype.stringify = stringify;
    Helios.prototype.value = pipedValue;

    //Filter-Based Steps
    Helios.prototype.filter = filter;
    Helios.prototype.andFilter = filter;
    Helios.prototype.orFilter = orFilter;
    Helios.prototype.back = back;
    Helios.prototype.except = except;
    Helios.prototype.retain = retain;
    Helios.prototype.dedup = dedup;

    //SideEffect-Based Steps
    Helios.prototype.sideEffect = step;
    Helios.prototype.as = store;
    //Helios.prototype.aggregate = aggregate;
    Helios.prototype.store = store;
    Helios.prototype.countBy = countBy;
    Helios.prototype.groupBy = groupBy;
    Helios.prototype.groupCount = groupCount;
    Helios.prototype.groupSum = groupSum;

    //Branch-Based Steps
    Helios.prototype.loop = loop;
    //Helios.prototype.ifThenElse = ifThenElse;

    //Methods
    Helios.prototype.v = v;
    Helios.prototype.e = e;
    Helios.prototype.graph = graphUtils;

    //Misc
    Helios.prototype.clone = clone;

    // expose Helios
    // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    	// Expose Helios to the global object even when an AMD loader is present in
    	// case Helios was injected by a third-party script and not intended to be
    	// loaded as a module..
    	window.Helios = Helios;

    	// define as an anonymous module so, through path mapping, it can be
    	// referenced.
    	define(function() {
    	  return Helios;
    	});
    }
    // check for `exports` after `define` in case a build optimizer adds an `exports` object
    else if (freeExports) {
        // in Node.js or RingoJS v0.8.0+
        if (typeof module == 'object' && module && module.exports == freeExports) {
          (module.exports = Helios).Helios = Helios;
        }
        // in Narwhal or RingoJS v0.7.0-
        else {
            freeExports.Helios = Helios;
        }
    }
    else {
        // in a browser or Rhino
        window.Helios = Helios;
    }


}(this));

