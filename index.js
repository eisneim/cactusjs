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
		this.includeSignExp = this.parseSign( options.includeSign || defaultOpt.includeSign );

		this.useES6 = options.useES6;

		this.useCache = options.useCache;
		if( typeof options.useCache == 'undefined' )
			this.useCache = defaultOpt.useCache;

		this.viewPath = options.viewPath || defaultOpt.viewPath;
		/**
		 * if use cache, in the first run, load all template and solve include
		 */
		if( this.useCache ){
			// TODO
			// solve include;
			loader.batchLoad( this.viewPath, this )
				.then(map=> this.tplMap = map )
		}
		this.supportedExt = ['html','js','css','md','tpl'];
	}

	extCheck( tplName ){
		var extName = path.extname( tplName ).replace('.','');
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
		if(!string) return '';
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

		var tpl = str.replace(/\n/g,'').replace(/'/g,"\\'")
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
			return "\';"+exp.replace(/\\n/g,'')+" tpl+=\'";
		})
		.replace( this.evalVarSignExp, (match,varname)=>{
			return "\'+"+varname+"+\'"
		});


		var functionbody = "var tpl=\'"+tpl +"\'; return tpl;";
// console.log('the function body:-==========\n',functionbody);
	
		cacheCompiled[ identify ] = new Function( 'data','escape',functionbody )	
		
		// be caution here!!, when execute the function ,i might not throw error...
		return cacheCompiled[ identify ];
	}
	/**
	 * solve the file inclusion
	 * @param  {Function} cb [description]
	 * @return {cb}      
	 */
	solveInclude( tpl ){
		var pathes = [];
		var self = this;

		tpl = tpl.replace( this.includeSignExp, (match,tplPath) => {
			tplPath = tplPath.trim();
			pathes.push( tplPath );
			return '__'+ tplPath +'__';
		});
		if(pathes.length<=0) return Promise.resolve( tpl );

		return new Promise((resolve,reject)=> {
			var index = 0, error=null;
			function load( tplPath ){
				var tplPath = self.extCheck(tplPath);
				loader.load( self.viewPath+'/'+ tplPath)
				.then( html=> {

					tpl = tpl.replace('__'+ pathes[index] +'__',html );
					index++;
					next();
				}, err => reject(err) )
			}

			function next(){
				if(error) return;
				if( index< pathes.length ){
					load( pathes[ index ] );
				}else{
					resolve( tpl )
				}
			}
			next();

		})
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
			console.log(e);
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
		// the default file type should be html;
		tplName = this.extCheck( tplName );

		var self = this;
		if( this.useCache){

			var cachedTpl = this.tplMap[ tplName ];
			var result = this.parse( cachedTpl ,data, tplName );

			if(cb && typeof cb == 'function'){
				return cb( null,result );
			}else{
				return Promise.resolve( result )
			}

		} 

		var promise = loader.load( this.viewPath+'/'+tplName);
		// use callbakc
		if(cb && typeof cb == 'function'){
			promise.then( 
				html => {
					self.solveInclude( html ).then( inclueded =>{

						cb( null, self.parse( inclueded ,data, tplName) )

					}, err=>cb(err));

					cb( null,  output)
				}	
			,	err=>{ cb(err)} )
		// use promise
		}else{
			return new Promise(function(resolve,reject){
				promise.then( html=>{
					self.solveInclude( html ).then(inclueded =>{
						resolve( self.parse( inclueded ,data, tplName) )

					},err=>cb(err) );
				}
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
