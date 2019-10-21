	                      __
	  ____ _____    _____/  |_ __ __  ______
	_/ ___\\__  \ _/ ___\   __\  |  \/  ___/
	\  \___ / __ \\  \___|  | |  |  /\___ \
	 \___  >____  /\___  >__| |____//____  >
	     \/     \/     \/                \/  js模板引擎
	-------------------------------------------------
### 简单粗暴的JS模板引擎（ES6编写，目前只支持Node）
为什么又造一个模板引擎？我们开发的很多项目都是用Angular或者React作为前端，所以后端只需要渲染出最基本的index.html，以及在index中嵌入初始的用户数据，这个时候用jade就是一种资源的浪费，我们并不需要如此庞大而慢的模板引擎，我们需要的是简单快速，甚至粗暴的能快速解决问题、渲染超快的模板引擎，于是cactus就诞生了；

#### TODO
 - 支持浏览器渲染
 - 分成纯ES6版和ES5两个版本；

#### JS
```javascript
//各种识别符可以自己定义，下面的这些都是默认值
var cactus = require('cactus')({
	viewPath: __dirname+'/views',
	varSign	: 				['{=','}'],
	varSignUnEscape: 	['{-','}'],
	evalSign: 				['{@','@}'],
	evalVarSign: 			['{=','=}'],
	useCache: 				process.env.NODE_ENV != 'development',
});

var user = {
	name:'Eisneim Terry',
	description:'<i>hello<i>, im a web developer and designer!',
	age: 24,
}

cactus.render('home', user ,function(err,html){
	//渲染完成, 因为要读取模板文件所以是callback,
	//如果不传递callback，则返回Promise;
	res.type('html')
	res.status(200).send(html)
})

//处理字符
var result = cactus.parse('<h1>{= name }</h1>',user )

```
#### 简单的变量处理
```html
	<h1>这是变量{= name }</h1>
	<p>{- description }</p>
```
#### 简单的表达式
```html
	<h1>{= '神奇的数字：'+Math.random()*2+(3/5) =}</h1>
```
#### if条件判断
```html
	{@ if(data.age>20){ @}
	<p>小伙子一枚</p>
	{@ }else{ @}
	<p>骚年一枚</p>
	{@ } @}
```
#### for循环
```html
	{@ for(var i=0; i<data.age; i++){ @}

		<p>循环了{= i =}次</p>

	{@ } @}
```
#### 定义函数，或者变量
```html
	{@
		function sum(a,b){
			return a + b;
		}

		var myPet = 'Sam';
	@}
	<p>调用定义的函数 {= sum(10,15) =}</p>

	{@ var block= @}
		<div>
			<p>定义一块可以复用的HTML</p>
		</div>
	{@ ; @}

	<!-- 使用这个块 -->
	{= block =}

```
#### 以及其他任何js代码
或许你已经发现，在cactus中可以像PHP一样嵌入任何代码，而且还可以自定义识别符，就是这么简单粗暴！


