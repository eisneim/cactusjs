/*
                      __                
  ____ _____    _____/  |_ __ __  ______
_/ ___\\__  \ _/ ___\   __\  |  \/  ___/
\  \___ / __ \\  \___|  | |  |  /\___ \ 
 \___  >____  /\___  >__| |____//____  >
     \/     \/     \/                \/   
-------------------------------------------
yet another template engine built for speed and simplicity

author: eisneim<eisneim1@sina.com>

*/
var debug = require("debug")("cactus");
var path = require('path');

var loader = require('./lib/loader.js');

var defaultOpt = {
	varSign	: 				['{=','}'],
	varSignUnEscape: 	['{-','}'],
	evalSign: 				['{@','@}'],
	evalVarSign: 			['{#','}'],
	includeSign: 			['@include',';'],
	useCache: 				process.env.NODE_ENV == 'production',
	viewPath:         path.normalize(__dirname + '/../../views')
}

var cacheCompiled = {};

class Cactus {
	constructor ( options ){
		if(!options ) options = {};
		var self = this;

		this.varSignExp = this.parseSign( options.varSign || defaultOpt.varSign );
		this.varUnEscExp = this.parseSign(options.varSignUnEscape || defaultOpt.varSignUnEscape );
		this.evalSignExp = this.parseSign( options.evalSign || defaultOpt.evalSign );
		this.evalVarSignExp = this.parseSign( options.evalVarSign || defaultOpt.evalVarSign );
		this.includeSignExp = this.parseSign( options.includeSign || defaultOpt.includeSign );

		this.useES6 = options.useES6;

		this.useCache = options.useCache;
		if( typeof options.useCache == 'undefined' )
			this.useCache = defaultOpt.useCache;

		this.viewPath = options.viewPath || defaultOpt.viewPath;
		this.supportedExt = options.exts || ['.html','.js','.css','.md','.tpl'];
		/**
		 * if use cache, in the first run, load all template and solve include
		 */
		if( this.useCache ){
			loader.batchLoad( this.viewPath, this.supportedExt, function(err,map){
				self.tplMap = map;
				console.log( "all template cache loaded!" )
			})
		}

	}

	extCheck( tplName ){
		var extName = path.extname( tplName );
		if( extName == '' || this.supportedExt.indexOf( extName ) == -1) 
			return tplName+'.html';

		return tplName;
	}
	/**
	 * pares var sign to be a regular expression
	 * @param  {array} signs  
	 * @return {RegExp}       
	 */
	parseSign( signs ){
		// frist insert nessary "\"
		var regxs = signs.map( (sign) =>{
			return sign.replace(/[\{\}\^\[\]\$\(\)\\\|\+\?\<\>\n]/g,(match,code)=>{
				return '\\'+match;
			});
		});

		var regxString = regxs.join('([\\s\\S]+?)');

		return new RegExp(regxString, 'g' );
	}
	/**
	 * escape html entities to prevent XSS attack
	 * @param  {string} string  
	 * @return {string}         
	 */
	escape ( string ){
		if(!string ) return '';
		if(typeof string != "string") return string;
		return string.replace(/&(?!\w+;)/g,'&amp;')
								 .replace(/</g,'&lt;')
								 .replace(/>/g,'&gt;')
								 .replace(/"/g,'&quot;')
	}

	/**
	 * compile string to a function
	 * @param  {string} str     [description]
	 * @param  {string} identify [description]
	 * @return {function}       [description]
	 */
	compile ( str,identify){
		if(this.useCache && cacheCompiled[ identify ]) 
			return cacheCompiled[ identify ]; 

		if(!identify) identify = 'tpl-'+Math.ceil(Math.random()*10000);
		cacheCompiled[ identify ] = '错误！无法编译模板';

		var tpl = str
		// remove comments inside of <script></script>
		.replace( /^\/\/([\s\S]+?)\n/g,"")
		.replace( /\/\*([\s\S\n]+?)\*\//g,"")// remove /* */ comments;
		.replace(/\n/g,'') // repace new line 
		.replace(/'/g,"\\'") // escape single quote
		.replace( this.varSignExp , (match,code)=>{
			return "\'+ escape(data[\'"+code.trim()+"\'])+\'";
		})
		// replace unEscapted expressions
		.replace( this.varUnEscExp, (match,code)=>{
			return "\'+ data[\'"+code.trim()+"\']+\'";
		})
		// replace eval Expression here;
		.replace( this.evalSignExp, (match,exp)=>{
			/**
			 * TODO
			 * check exp, only allow certen type of expression be evaled;
			 */
			return "\';"+exp.replace(/\\n/g,'')+"; tpl+=\'";
		})
		.replace( this.evalVarSignExp, (match,varname)=>{
			return "\'+"+varname+"+\'"
		});


		var functionbody = "var tpl=\'"+tpl +"\'; return tpl;";
		debug('the function body:\n',functionbody);
		
		cacheCompiled[ identify ] = new Function( 'data','escape',functionbody )	
		
		// be caution here!!, when execute the function ,i might not throw error...
		return cacheCompiled[ identify ];
	}
	/**
	 * solve the file inclusion
	 * @param  {Function} cb [description]
	 * @return {cb}      
	 */
	solveInclude( tpl, cb ){
		var pathes = [];
		var self = this;

		tpl = tpl.replace( this.includeSignExp, (match,tplPath) => {
			tplPath = tplPath.trim();
			pathes.push( tplPath );
			return '__'+ tplPath +'__';
		});

		if(pathes.length<=0) return cb(null,tpl );
		// recursive load
		function load( pathes, index ){
			var partialPath = self.extCheck(  pathes[index] );
			var partial = self.tplMap ? self.tplMap[ partialPath ] : null;
			// we need to load this file;
			if( !partial ){
				// console.log("no partial found!!", tpl.length )
				loader.load( self.viewPath+'/'+ partialPath,function( err, html ){
					if(err) return cb(err)
					tpl = tpl.replace('__'+ pathes[index] +'__',html );
					// console.log("inclued: ",tpl.length );
					return pathes[index+1]? load( pathes, index+1 ) : cb(null, tpl );
				})
			}else{
				tpl = tpl.replace('__'+ pathes[index] +'__',partial );
				return pathes[index+1]? load( pathes, index+1 ) : cb(null, tpl );
			}
		}
		load( pathes, 0 );
		
	}
	/**
	 * comple tempate string to be a es6 tempalte
	 * @param  {string} str template string
	 * @return {string}     [description]
	 */
	compile6( str ){

	}
	/**
	 * parse just a string
	 * @param  {string} tpl  
	 * @param  {object} data 
	 * @return {string}      
	 */
	parse(tpl,data,tplName){
		try{
			var output = this.compile( tpl, tplName )( data, this.escape );
			return output;
		}catch (e){
			console.log('========模板语法错误！！=========')
			// console.log(" {= expression =} 中expression记得要加分号';'")
			console.trace(e);
			throw e;
		}
		
	}
	/**
	 * [render description]
	 * @param  {string} tplName [description]
	 * @param  {string} data    [description]
	 * @return {string}         the compiled html;
	 */
	render ( tplName ,  data , cb ) {
		var self = this;
		if(!cb && typeof cb == 'function' ) throw new Error("Cactus.render 需要一个callback")
		// the default file type should be html;
		// console.log("check ext ", tplName )
		tplName = this.extCheck( tplName );
		// use callbakc
		if( this.useCache){
			var cachedTpl = this.tplMap[ tplName ] || "no template found in cache!!";
			
			self.solveInclude( cachedTpl,function(err, inclueded ){
				if(err) return cb(err);
				return cb( null, self.parse( inclueded ,data, tplName ) );
			});
			
		} 

		loader.load( this.viewPath+'/'+tplName, function( err,html){
			if(err) return cb(err);
			// console.log("got html:",html.length )
			self.solveInclude( html,function(err,inclueded){
				if(err) return cb(err);
				// console.log("all include solved:", inclueded.length );
				cb( null, self.parse( inclueded ,data, tplName) )
			});
		})

	}//end of render

	contentType(file){
		var ext = path.extname(file);
		if( this.supportedExt.indexOf(ext)< 0 ){
			return 'html';
		}
		if(ext == 'js')  return 'javascript';
		return ext;
	}

	*response( ctx, tplName, data ){
		// console.log(" this is response function ")
		var self = this;
		return new Promise( (resolve,reject)=>{
			self.render(tplName,data,(err,html) => {
				if(err) return reject( err );
				ctx.type = self.contentType( tplName );
				
				ctx.body =  html ;
				resolve( true );
			})
		})

	}
}

module.exports = function(opt){
	return new Cactus(opt);
}
