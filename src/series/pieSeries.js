import jmRect from 'jmgraph/src/shapes/jmRect.js';
import jmArc from 'jmgraph/src/shapes/jmArc.js';
import jmHArc from 'jmgraph/src/shapes/jmHArc.js';
import jmSeries from './series.js';

/**
 * 饼图
 *
 * @class jmPieSeries
 * @module jmChart
 * @param {jmChart} chart 当前图表
 * @param {array} mappings 图形字段映射
 * @param {style} style 样式
 */

//构造函数
export default class jmPieSeries extends jmSeries {
	constructor(options) {
		super(options);

		this.xAxis.visible = false;
		this.yAxis.visible = false;
	}

	// 重新初始化图形
	init() {
	
		//总和
		this.totalValue = 0;
		//计算最大值和最小值
		if(this.data) {		
			for(const i in this.data) {
				const s = this.data[i];							
				const vy = s[this.field];	
				if(vy) {
					this.totalValue += Math.abs(vy);
				}	
			}		
		}

		const center = { 
			x: this.graph.chartArea.width / 2, 
			y: this.graph.chartArea.height / 2
		};
		
		const radius = Math.min(center.x - this.style.margin.left - 
			this.style.margin.right * this.graph.devicePixelRatio,
			center.y - this.style.margin.top * this.graph.devicePixelRatio - this.style.margin.bottom * this.graph.devicePixelRatio);
		

		//生成描点位
		// super.init会把参数透传给 createPoints
		const { points, dataChanged }  = super.init(center, radius);	

		// 是否正在动画中
		const isRunningAni = this.enableAnimate && (dataChanged || this.___animateCounter > 0 );

		// 在动画中，则一直刷新
		if(isRunningAni) {
			const aniCount = (this.style.aniCount || 20);
			let aniIsEnd = true;// 当次是否结束动画
			const len = points.length;
			for(let i=0; i<len; i++) {				

				const p = points[i];
				const step = (p.y - p.shape.startAngle) / aniCount;

				p.shape.endAngle = p.shape.startAngle + this.___animateCounter * step;

				if(p.shape.endAngle >= p.y) {
					p.shape.endAngle = p.y;
				}
				else {
					aniIsEnd = false;
				}
				// p.shape.points = arc.initPoints();
				// p.shape.points.push(center);			
				//绑定提示框
				//this.bindTooltip(p.shape, p);
			}
			// 所有动画都完成，则清空计数器
			if(aniIsEnd) {
				this.___animateCounter = 0;
			}
			else {
				this.___animateCounter ++;
				// next tick 再次刷新
				setTimeout(()=>{
					this.needUpdate = true;//需要刷新
				});
			}
		}
	}

	/**
	 * 生成序列图描点
	 *
	 * @method createPoints
	 */
	createPoints(center, radius) {		
		if(!this.data) return [];

		const points = [];
		let index = 0;
		
		let startAni = 0; // 总起始角度
		let cm = Math.PI * 2;

		for(var i=0;i< this.data.length;i++) {
			const s = this.data[i];
			
			const yv = s[this.field];

			//如果Y值不存在。则此点无效，不画图
			if(yv == null || typeof yv == 'undefined') {
				continue;
			}
			else {
				const p = {				
					data: s,
					yValue: yv,
					yLabel: yv,
					step: Math.abs(yv / this.totalValue),// 每个数值点比
					style: this.graph.utils.clone(this.style)
				};
				//p.style.color = this.graph.getColor(index);
				p.style.fill = this.graph.getColor(index);

				const start = startAni;// 上一个扇形的结束角度为当前的起始角度
				// 计算当前结束角度, 同时也是下一个的起始角度
				p.y = startAni + p.step * cm;
				startAni = p.y;

				if(center && radius) {
					
					p.shape = this.graph.createShape(this.style.isHollow? jmHArc : jmArc, {
						style: p.style,
						startAngle: start,
						endAngle: p.y,
						anticlockwise: true,
						isFan: true, // 表示画扇形
						center,
						radius,
						maxRadius: radius,
						minRadius: radius - (this.style.arcWidth || radius*0.2)
					});

					/**
					 * 因为jmgraph是按图形形状来计算所占区域和大小的， 这里我们把扇形占区域改为整个图圆。这样计算大小和渐变时才好闭合。
					 */
					p.shape.getLocation = function() {			
						const local = this.location = {
							left: 0,
							top: 0,
							width: 0,
							height: 0,
							center: this.center,
							radius: this.radius
						};

						local.left = this.center.x - this.radius;
						local.top = this.center.y - this.radius;
						local.width = local.height = this.radius * 2;
						
						return local;
					}
					p.shape.getBounds = function() {
						return this.getLocation();
					}

					this.shapes.add(p.shape);
					this.graph.chartArea.children.add(p.shape);
				}
				points.push(p);
				index++;				
			}			
		}
		
		return points;
	}
}



/**
 * 生成图例
 *
 * @method createLegend	 
 */
jmPieSeries.prototype.createLegend = function() {
	
	const points = this.createPoints();
	if(!points || !points.length) return;
	
	for(let k in points) {
		const p = points[k];
		if(!p) continue;

		//生成图例前的图标
		const style = this.graph.utils.clone(p.style);
		style.fill = style.fill;	
		//delete style.stroke;
		const shape = this.graph.createShape(jmRect,{
			style: style,
			position : {x: 0, y: 0}
		});
		//shape.targetShape = p.shape;
		//此处重写图例事件
		this.graph.legend.append(this, shape, {
			name: this.legendLabel, 
			hover: function() {	
				//var sp = this.children.get(0);
				//应用图的动态样式
				Object.assign(this.targetShape.style, this.targetShape.style.hover);	
				Object.assign(this.style, this.style.hover);
			},
			leave: function() {	
				//var sp = this.children.get(0);
				//应用图的普通样式
				Object.assign(this.targetShape.style, this.targetShape.style.normal);			
				Object.assign(this.style, this.style.normal);
			}, 
			data: this.data[k]
		});
	}	
}

