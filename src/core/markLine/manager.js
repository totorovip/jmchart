
import jmMarkLine from './markLine';

/**
 * 轴
 *
 * @class jmMarkLineManager
 * @module jmChart
 * @param {jmChart} chart 当前图表
 * @param {string} [type] 轴类型(x/y/radar),默认为x
 * @param {string} [dataType] 当前轴的数据类型(number/date/string),默认为 number
 * @param {object} [style] 样式
 */

export default class jmMarkLineManager {
	constructor(chart) {
        this.chart = chart;
        this.init(chart);
    }
    
    // 初始化
    init(chart) {
        const graph = chart.touchGraph || chart;

        graph.on('beginDraw', () => {
            // 重置标线，会处理小圆圈问题
            this.xMarkLine && this.xMarkLine.init();
            this.yMarkLine && this.yMarkLine.init();
        });

		if(chart.style.markLine)  {
			// 生成标线，可以跟随鼠标或手指滑动
			if(chart.style.markLine && chart.style.markLine.x) {
				this.xMarkLine = graph.createShape(jmMarkLine, {
					type: 'x',
					style: chart.style.markLine
				});
				const area = graph.chartArea || graph;
				area.children.add(this.xMarkLine);
			}

			if(chart.style.markLine && chart.style.markLine.y) {
				this.yMarkLine = graph.createShape(jmMarkLine, {
					type: 'y',
					style: chart.style.markLine
				});
				const area = graph.chartArea || graph;
				area.children.add(this.yMarkLine);
			}

			let longtap = 0;// 是否有长按, 0 未开始，1已按下，2识别为长按
			let longtapHandler = 0;
			let touchStartPos = {
				x: 0,
				y: 0
			};
			graph.on('mousedown touchstart', (args) => {
				// 如果长按才启用
				if(chart.style.markLine.longtap) {
					longtap = 1;
					longtapHandler &&  graph.utils.cancelAnimationFrame(longtapHandler);
					let tapStartTime = Date.now();
					const reqFun = ()=>{
						const elapsed = Date.now() - tapStartTime;
						if(longtap === 1 || longtap === 2) {
							// 如果还未过一定时间，则继续等待
							if(elapsed < 500) {
								longtapHandler = graph.utils.requestAnimationFrame(reqFun);
								return;
							}
							longtap = 2;
							this.startMove(args);
							chart.emit('marklinelongtapstart', args);
						}
					};
					// 如果一定时间后还没有取消，则表示长按了
					longtapHandler = graph.utils.requestAnimationFrame(reqFun);

					//args.event.stopPropagation();
					args.event.preventDefault();// 阻止默认行为	
				}
				else {
					this.startMove(args);
				}	
				args.longtap = longtap;	
				touchStartPos = args.position;
			});
			// 移动标线
			graph.on('mousemove touchmove', (args) => {
				const ox = args.position.x - touchStartPos.x;
				const oy = args.position.y - touchStartPos.y;
				const offpos = Math.sqrt(ox * ox + oy * oy);
				if(longtap === 1 && offpos > 15) longtap = 0; // 如果移动了，则取消长按

				args.longtap = longtap;
				this.move(args);				
			});
			// 取消移动
			graph.on('mouseup touchend touchcancel touchleave', (args) => {
				longtap = 0;

				this.endMove(args);
			});
		}
    }

    // 开始移动标线
    startMove(args, markLineType = 'xy') {
        if(this.xMarkLine && markLineType.includes('x')) {
            this.xMarkLine.visible = true;
            this.xMarkLine.move(args);
        }
        if(this.yMarkLine && markLineType.includes('y')) {
            this.yMarkLine.visible = true;
            this.yMarkLine.move(args);
        }

        if(!args.cancel) this.chart.emit('marklinestartmove', args);
    }

    // 移动标线
    move(args) {
        let moved = false;
        if(this.xMarkLine && this.xMarkLine.visible) {
            this.xMarkLine.move(args);
            moved = true;
        }
        if(this.yMarkLine && this.yMarkLine.visible) {
            this.yMarkLine.move(args);
            moved = true;
        }
        if(moved) {
            args.event.stopPropagation();
			args.event.preventDefault();// 阻止默认行为	

            if(!args.cancel) this.chart.emit('marklinemove', args);
        }        
    }
    // 终止动移
    endMove(args) {
        if(this.xMarkLine && this.xMarkLine.visible) {
            this.xMarkLine.cancel(args);
        }
        if(this.yMarkLine && this.yMarkLine.visible) {
            this.yMarkLine.cancel(args);
        }
        if(!args.cancel) this.chart.emit('marklineendmove', args);
    }
}
	


