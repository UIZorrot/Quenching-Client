/**
 * 准确的计时器 , 原型方法可以被链式调用
 *
 * @format
 */

export const Timer = class {
	/*订阅函数列表*/
	#subscribeList = [];
	/*当前剩余毫秒数*/
	#currentTime = 0;
	/*计时器函数*/
	#interval;
	/*当前正在执行的settimeout clearID 用于停止计时器*/
	#currentTimeout;
	/*标记是否正在计时*/
	#status = false;
	
	/**
	 * @param remaining {number}
	 */
	constructor(){
		const interval = (first = true) => {
			this.#status = true;
			if( this.#currentTime >= 1000 ) {
				this.#currentTimeout = setTimeout(() => {
					this.#currentTime -= 1000;
					interval(false);
					this.#subscribeList.forEach(fn => {
						try {
							fn(this.#currentTime);
						} catch ( e ) {
							console.error(e , `Timer 订阅运行时错误: 当前执行函数名>${ fn.name }`);
						}
					});
				} , 1000);
			} else {
				/*当剩余时间小于1000 */
				this.#currentTimeout = setTimeout(() => {
					this.#currentTime = 0;
					this.#subscribeList.forEach(fn => {
						try {
							fn(this.#currentTime);
						} catch ( e ) {
							console.error(e , `Timer 订阅运行时错误: 当前执行函数名>${ fn.name }`);
						}
					});
				} , this.#currentTime);
				this.#status = false;
			}
			/*只要倒计时开始了就直接执行一次订阅*/
			first && this.#subscribeList.forEach(fn => {
				try {
					fn(this.#currentTime);
				} catch ( e ) {
					console.error(e , `Timer 订阅运行时错误: 当前执行函数名>${ fn.name }`);
				}
			});
		};
		this.#interval = interval;
	}
	
	start = time => {
		if( time <= 0 ) {
			return console.error('timer.start值是负数! :>' , time);
		}
		/*如果已经在计时中,则start无效*/
		if( this.#status === true ) {
			return;
		}
		this.#currentTime = time;
		this.#interval();
		return this;
	};
	
	/**
	 * 订阅的每过1s就执行一次函数[相同引用的函数只会订阅一次]
	 * @param callback {function(number):*}
	 */
	subscribe(callback){
		!this.#subscribeList.includes(callback) && this.#subscribeList.push(callback);
		return this;
	}
	
	unsubscribe(callback){
		this.#subscribeList.splice(this.#subscribeList.indexOf(callback) , 1);
		return this;
	}
	
	destroy(){
		//todo
	}
	
	stop(){
		clearTimeout(this.#currentTimeout);
		this.#currentTime = 0;
		this.#status = false;
		return this;
	}
};

/*@TEST CODE*/
/*
 t = new Timer();
 console.time('foo');
 t.subscribe((time) => {
 	console.log( time );
 }).start(1800);*/
