// mocha --compilers js:babel/register index.test.js

var expect = require('chai').expect;
var path = require('path');

var options = {
	varSign	: 				['${','}'],
	varSignUnEscape: 	['#{','}'],
	evalSign: 				['{@','@}'],
	evalVarSign: 			['{=','=}'],
	useCache: 				false,
	viewPath:         path.normalize(__dirname),
};

var data = {
	name:'eisneim <i>terry</i>',
	age: 23,
}

describe('tempate file',function(){
	var cactus = require('../index.js')( options );

	it('should parse raw string',function(){
		var escaped = cactus.parse('<h1>${name}</h1>',{name:'<i>eisniem</i>'});
		var result = cactus.parse('<h1>#{name}</h1>',{name:'<i>eisniem</i>'});

		expect( /lt;/.test(escaped) ).true;
		expect( /<i>/.test(result) ).true;
	})

	it('should render basic template',function(done){
		cactus.render('basic',data, function(output){

			expect( /eisneim/.test(output) ).true;
			expect( /lt;/.test(output) ).true;
			done();
		});
	})

	it('should render for loop',function(done){
		cactus.render('loop',data, function(output){
			expect(/3/.test(output)).true;

			done();
		});
	})

	it('should render complex tempate with function or any javascript',
	function(done){
		cactus.render('complex',data, function(output){
			expect(/30/.test(output)).true;
			done();
		});
	});

	it('should render if',function(done){
		cactus.render('if',data, function(output){
			expect(/adult/.test(output)).true;
			done();
		});
	})

	


})