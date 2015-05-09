// mocha --compilers js:babel/register index.test.js

var expect = require('chai').expect;
var path = require('path');

var options = {
	varSign	: 				['${','}'],
	varSignUnEscape: 	['#{','}'],
	evalSign: 				['{@','@}'],
	evalVarSign: 			['{=','=}'],
	useCache: 				false,
	viewPath:         path.normalize(__dirname+'/views'),
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
		cactus.render('basic',data, function(err,output){
			if(err) console.log(err)

			expect( /eisneim/.test(output) ).true;
			expect( /lt;/.test(output) ).true;
			done();
		});
	})

	it('should render for loop',function(done){
		cactus.render('loop',data, function(err,output){
			if(err) console.log(err)

			expect(/3/.test(output)).true;

			done();
		});
	})

	it('should render complex tempate with function or any javascript',
	function(done){
		cactus.render('complex',data, function(err,output){
			if(err) console.log(err)
			expect(/30/.test(output)).true;
			done();
		});
	});

	it('should render @include',function(done){
		cactus.render('if',data, function(err,output){
			if(err) console.log(err)

			expect( /adult/.test(output) ).true;
			expect( /home-title/.test(output) ).true;
			expect( /loop3/.test(output) ).true;

			done();

		});
	})

	it('should render css file',function(done){
		cactus.render('cssfile.css',data, function(err,output){
			if(err) console.log(err)
			// console.log(err);
			

			expect(/eisneim/.test(output)).true;

			done();
		});
	})


})