var fs = 		require('fs');
var path = 	require('path');

var baseFolderPath;// the base path of all templates

/**
 * [batchLoad description]
 * @param  {string} viewPath should be an abusolute path;
 */
exports.batchLoad = function batchLoad( folderPath ){
	var ext = '.html';
	var tplMap = {};
	baseFolderPath = folderPath;

 	// read folder and get all filename
 	return new Promise(function(resolve,reject){
	 	fs.readdir( folderPath , function( err,files ){
	 		if( err  ) return reject(err)

	 		var index = 0;
	 		var next = function(done){
	 			index++;
	 			
	 			if( index < files.length ){
	 				load( files[ index ] ,done );
	 			}else{
	 				done( );
	 			}
	 			
	 		}

	 		var load = function( file , done ){
	 			console.log(path.extname( file ));

	 			if( path.extname( file ) !== '.html' ) 
	 				return next(done);

	 			fs.readFile( baseFolderPath +'/'+file ,'utf-8',(err , tpl )=>{
	 				tplMap[ file ] = tpl;

	 				next(done);
	 			});
	 		}

	 		load(files[0],()=> resolve( tplMap ) );

	 	});
 	})

}

exports.load = function( filepath ){
	return new Promise( (resolve,reject) => {
		fs.readFile( filepath,'utf-8',(err,tpl)=>{
			if(err) return reject(err)
			resolve(tpl);

		});
	})
}
