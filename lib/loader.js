var fs = 		require('fs');
var path = 	require('path');
var pathfinder = require("./pathfinder.js");

/**
 * batchLoad description
 * should solve includ use tplMap, instead of use fs read files again;
 * @param  {string} viewPath should be an abusolute path;
 */
exports.batchLoad = function batchLoad( folderPath, exts , callback ){
	var tplMap = {};
	pathfinder( folderPath, exts, function( pathes ){
		load( pathes, 0, callback );
	});
	// recursive load
	function load( pathes, index, cb ){
		var filePath = pathes[ index ];
		fs.readFile( filePath ,'utf-8',function( err , tpl){
			if(err) return cb(err)
			tplMap[ filePath.replace(folderPath+"/","") ] = tpl;
			if( pathes[ index+1] ){
				return load( pathes, index+1,cb );
			}
			return cb(null, tplMap );
		});
	};
}

exports.load = function( filepath ){
	return new Promise( (resolve,reject) => {
		fs.readFile( filepath,'utf-8',(err,tpl)=>{
			// if(/\.js/.test(filepath)) console.log(tpl);
			if(err) return reject('错误！无法找到模板'+ err );
			resolve(tpl);
		});
	})
}
