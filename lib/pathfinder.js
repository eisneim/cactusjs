var fs = 		require('fs');
var path = 	require('path');

module.exports = function findPath(folderPath, extensions , callback ){
	var pathes = [];
	var folders = [];
	if( folderPath.substr(-1) == "/" ) folderPath = folderPath.substr(0, folderPath.length-1)

	function readdir( folder ){
		fs.readdir( folder , function( err,files ){
			// check if this one is a folder:
			for (var ii=0; ii< files.length; ii++ ){
				var filePath = files[ii];
				var ext = path.extname( filePath )
				var stat = fs.statSync( folder+"/"+filePath );

				// this one is a folder,
				if( stat.isDirectory() ){
					folders.push( folder+"/"+ filePath );
				}else if( extensions.indexOf( ext ) != -1 ){
					// this file is what we looking for
					pathes.push( folder+"/"+ filePath );
				}
			}
			// now remove this folder in folders array;
			var index = folders.indexOf( folder );
			if( index >= 0 ) folders.splice( index,1 );
			if( folders.length > 0 ){
				return readdir( folders[0] );
			}
			callback( pathes );
		}); //
	} //end of readdir

	readdir( folderPath );
}