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

var path = require('path');

var loader = require('./lib/loader.js');

var defaultOpt = {
	varSign	: 				['{=','}'],
	varSignUnEscape: 	['{-','}'],
	evalSign: 				['{@','@}'],
	evalVarSign: 			['{=','=}'],
	includeSign: 			['@include',';'],
	useCache: 				process.env.NODE_ENV != 'development',
	viewPath:         path.normalize(__dirname + '/../../views')
}

var cacheCompiled = {};

class Cactus {
	constructor ( options ){
		if(!options ) options = {};

		this.varSignExp = this.parseSign( options.varSign || defaultOpt.varSign );
		this.varUnEscExp = this.parseSign(options.varSignUnEscape || defaultOpt.varSignUnEscape );
		this.evalSignExp = this.parseSign( options.evalSign || defaultOpt.evalSign );
		this.evalVarSignExp = this.parseSign( options.evalVarSign || defaultOpt.evalVarSign );

		this.useES6 = options.useES6;

		this.useCache = options.useCache;
		if( typeof options.useCache == 'undefined' )
			this.useCache = defaultOpt.useCache;

		this.viewPath = options.viewPath || defaultOpt.viewPath;
		if( this.useCache ){
			loader.batchLoad( this.viewPath )
				.then(map=> this.tplMap = map )
		}
		this.supportedExt = ['html','js','css','md','tpl'];
	}
	/**
	 * pares var sign to be a regular expression
	 * @param  {array} signs  
	 * @return {RegExp}       
	 */
	parseSign( signs ){
		// frist insert nessary "\"
		var regxs = signs.map( (sign) =>{
			return sign.replace(/[\{\}\^\[\]\$\(\)\\\|\+\?\<\>]/g,(match,code)=>{
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
		return string.replace(/&(?!\w+;)/g,'&amp;')
								 .replace(/</g,'&lt;')
								 .replace(/>/g,'&gt;')
								 .replace(/"/g,'&quot;')
	}

	/**
	 * compile string to a function
	 * @param  {string} str     [description]
	 * @param  {string} tplName [description]
	 * @return {function}       [description]
	 */
	compile ( str,tplName){
		if(this.useCache && cacheCompiled[ tplName ]) 
			return cacheCompiled[ tplName ]; 

		if(!tplName) tplName = 'tpl-'+Math.ceil(Math.random()*10000);
		cacheCompiled[ tplName ] = '错误！无法编译模板';

		var tpl = str.replace(/\n/g,'\\n').replace(/'/g,"\\'")
		.replace( this.varSignExp , (match,code)=>{
			return "'+ escape(data['"+code.trim()+"'])+'";
		})
		// replace unEscapted expressions
		.replace( this.varUnEscExp, (match,code)=>{
			return "'+ data['"+code.trim()+"']+'";
		})
		// replace eval Expression here;
		.replace( this.evalSignExp, (match,exp)=>{
			/**
			 * TODO
			 * check exp, only allow certen type of expression be evaled;
			 */
			return "';"+exp.replace(/\\n/g,'')+" tpl+='";
		})
		.replace( this.evalVarSignExp, (match,varname)=>{
			return "'+"+varname+"+'";
		});
		
		var functionbody = "var tpl='"+tpl+"';\nreturn tpl";
		try{
			cacheCompiled[ tplName ] = new Function( 'data','escape',functionbody )	
		}catch(e){
			console.log(e);
		}

		return cacheCompiled[ tplName ];
	}
	/**
	 * solve the file inclusion
	 * @param  {Function} cb [description]
	 * @return {cb}      
	 */
	solveInclude( cb ){

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
	parse(tpl,data){
		return this.compile( tpl, null )( data, this.escape )
	}
	/**
	 * [render description]
	 * @param  {string} tplName [description]
	 * @param  {string} data    [description]
	 * @return {string}         the compiled html;
	 */
	render ( tplName ,  data , cb ) {
		// the default file type should be html;
		if(path.extname(tplName) !=='.html') tplName += '.html';
		var self = this;

		var tpl;
		if( this.useCache ){
			tpl = this.tplMap[ tplName ];

			var result = this.compile( html , tplName )( data, this.escape );

			if(cb && typeof cb == 'function'){
				return cb( null,result );
			}else{
				return Promise.resolve( result )
			}

		} 
		var promise = loader.load( this.viewPath+'/'+tplName);
		if(cb && typeof cb == 'function'){
			promise.then( 
				html => cb( null, self.compile( html , tplName )( data, self.escape ) )	
			,	err=> cb(err) )
		}else{
			return new Promise(function(resolve,reject){
				promise.then( html=>resolve( null,self.compile( html , tplName )( data, self.escape ) ) 
				, err => reject( err ) )
			})
		}
	}

	contentType(file){
		var ext = path.extname(file).replace('.','');
		if( this.supportedExt.indexOf(ext)< 0 ){
			return 'html';
		}
		if(ext == 'js')  return 'javascript';
		return ext;
	}

	*response( ctx, tplName, data ){
		return new Promise( (resolve,reject)=>{
			this.render(tplName,data,(err,html) => {
				if(err) return reject( err );
				ctx.type = this.contentType( tplName );

				ctx.body =  html ;
				resolve();
			})
		})
	}
}

module.exports = function(opt){
	return new Cactus(opt);
}
