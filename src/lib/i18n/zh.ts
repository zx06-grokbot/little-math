/** 中文文本 */
export const zh = {
	appName: '小小数学家',
	appSubtitle: '一起来做数学题吧',

	// 配置面板
	config: {
		gradePreset: '几年级',
		operations: '做什么题',
		range: '数字多大',
		rangeMin: '最小',
		rangeMax: '最大',
		blankPosition: '空格放哪儿',
		blankFirst: '前面',
		blankSecond: '中间',
		blankResult: '答案',
		exerciseType: '怎么写',
		horizontal: '横着写（横式）',
		vertical: '竖着写（竖式）',
		columns: '一行几道',
		columns2: '2 道（字大）',
		columns3: '3 道（字小）',
		countPerPage: '一张几道',
		totalCount: '一共几道',
		showAnswerPage: '加一张答案',
		customTitle: '卷子名字',
		studentName: '小朋友名字',
		showDate: '写上日期',
		savePreset: '保存预设',
		presetName: '预设名称',
		problemMode: '玩什么',
		normalMode: '算一算',
		makeTargetMode: '凑一凑',
		makeTargetValue: '凑成几',
		chainMode: '连着算',
		chainLength: '几个数',
		chainLength3: '3个数',
		chainLength4: '4个数',
		compareMode: '比大小',
		remainderMode: '分一分（有余数）',
		remainderBlank: '空格放哪儿',
		remainderBlankQuotient: '商',
		remainderBlankRemainder: '余数',
		remainderBlankBoth: '商和余数都空'
	},

	// 按钮
	buttons: {
		generate: '换一套',
		print: '打印',
		exportPdf: '存成 PDF',
		savePreset: '保存当前配置'
	},

	// 打印
	print: {
		exerciseTitle: '数学练习',
		answerTitle: '答案',
		name: '名字',
		date: '日期',
		score: '得分'
	}
};

export type Locale = typeof zh;
