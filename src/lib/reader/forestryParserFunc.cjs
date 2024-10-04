const forestryTitleMasks = {
	examination: {
		samples: ['ООО ', 'АО ', 'ЗАО ', 'ПАО '],
		mask: '{%1}.*',
	},
	examinationYear: {
		samples: ['по состоянию на'],
		mask: '(\\d+\\.?)+',
	},
	forestryMain: {
		samples: ['Лесничество: '],
		isColon: true,
		mask: '.*лесничество',
	},
	forestryDistrict: {
		samples: ['Участковое лесничество: '],
		isColon: true,
		isContinues: true,
	},
	kvartalRange: {
		samples: ['Кварталы: '],
		isContinues: true,
		isColon: true,
		isRange: true,
	},
	partyChief: {
		samples: ['Начальник.*партии: '],
		mask: '{%1}',
		isColon: true,
		isContinues: true,
	},
	partyIngineer: {
		samples: ['Инженер.*: '],
		mask: '{%1}',
		isColon: true,
		isContinues: true,
	},
};

const forestryZoneMasks = {
	protectZone: {
		samples: ['Категория защитности: '],
		mask: '(?<={%1}).*(?=Квартал )',
	},
};

const searchStep = {
	stepTitle: 'TITLE',
	stepKvartal: 'KVARTAL',
};

const featureType = {
	main: 'MAIN_FEATURE',
	detailed: 'DETAILED_FEATURE',
	summary: 'SUMMARY',
	header: 'HEADER',
};

const compositionInfo = {
	forestItem: [
		'единичные деревья',
		'лесные культуры',
		'культуры под пологом',
		'насаждение из подроста',
		'несомкнувшиеся культуры',
		'насаждение с породами искуств. происхождения',
		'HАСАЖД.ПОГИБШЕЕ',
		'ПРОГАЛИHА',
	],
	objectItem: [
		'ГРАHИЦЫ ОKРУЖHЫЕ',
		'ЛИHИЯ ЭЛЕKТРОПЕРЕДАЧ',
		'ДОРОГА АВТОМ.ГРУHТОВАЯ',
		'РУЧЕЙ',
		'РЕКА',
		'БОЛОТО',
		'ПРОСЕKИ KВАРТАЛЬHЫЕ',
		'ПРОЧИЕ ЗЕМЛИ',
		'ПРОЧИЕ ТРАССЫ',
		'РЕМИЗЫ',
		'ЗЕМЛИ,ЗАHЯТ.ПОСЕЛKАМИ',
		'ПАСТБИЩЕ,ВЫГОH',
		'СЕHОКОС',
		'KАРЬЕР ДЕЙСТВУЮЩ.',
	],
};

const compositionDetailedDescription = [
	{ name: 'underGrowth', value: 'подлесок:' },
	{ name: 'growth', value: 'подрост:' },
	{
		name: 'selectionValue',
		value: 'селекционная оценка:',
	},
	{
		name: 'ozu',
		value: 'озу:',
	},
	{
		name: 'cultures',
		value: 'культуры-',
	},
	{
		name: 'cultures2',
		value: 'культуры ',
	},
	{
		name: 'damage',
		value: 'повреждение',
	},
	{ name: 'maket1', value: 'СОСТАВ' },
	{ name: 'maket2', value: 'ПОЛHОТА' },
	{ name: 'maket3', value: 'РЕКОМЕНД.К' },
	{ name: 'maket4', value: 'HАСАЖДЕHИЕ' },
	{ name: 'maket5', value: 'ВЫСОТА' },
	{ name: 'maket6', value: 'БОHИТЕТ' },
	{ name: 'maket7', value: 'ТЛУ' },
];

const tryParseForestryData = (data) => {
	let hasTitle = (hasHeader = false);
	let currentKvartal = null;
	let currentLot = null;
	let currentComposition = null;
	let currentDetailed = null;
	let currentProtectZone = null;

	let currentStep = searchStep.stepTitle;

	let forestryTitleValues = {};
	Object.keys(forestryTitleMasks).map((key) =>
		Object.assign(forestryTitleValues, { [key]: { value: null, hasValue: false } })
	);

	let forestryZoneValues = {};
	Object.keys(forestryZoneMasks).map((key) =>
		Object.assign(forestryZoneValues, { [key]: { value: null, hasValue: false } })
	);

	let forestryHeaderValues = []; //Array.from({ length: 23 }, (v, i) => {return { start: 0, end: 0 };});

	let kvartalsForestCompose = {};
	let kvartalContent = {
		lotIndex: 0,
		lotArea: 0,
		lotName: '',
		lotComposition: '',
		lotActivities: [],
		lotForestType: [],
		lotProtectZone: '',
		lotTier: {},
		compositionContent: {},
	};

	let compositionDescription = {
		composeAge: 0,
		composeHeight: 0,
		composeDiameter: 0,
		composeAgeClass: 0,
		composeAgeBound: 0,
		composeQuality: 0,
		composeCompleteArea: 0,
		composeAreaStock: 0,
		composeCommonStock: 0,
		composeUnitStock: 0,
		composeMarketClass: 0,
		composeLotAreaStock: 0,
		composeLotCommonStock: 0,
		composeLotCommonClutterStock: 0,
		composeLotClutterStock: 0,
		additionDetailed: [],
	};

	// Функция форматирования чисел с плавающей запятой по количеству целой и дробной частей
	const formatNumber = (value, intSize, floatSize) => {
		return Number(value)
			.toFixed(floatSize)
			.toString()
			.padStart(intSize + floatSize + 1, 0);
	};

	// Функция по добавлению нового элемента леса в перечень пород выдела
	const addCompositionToLotInfo = (textItem, composeValue, isAdditional = false) => {
		let currentCompose = null;

		if (!isAdditional) {
			if (kvartalsForestCompose[currentKvartal]?.[currentLot]?.['compositionContent']) {
				kvartalsForestCompose[currentKvartal][currentLot]['compositionContent'][composeValue] = {
					...compositionDescription,
				};
				currentCompose = kvartalsForestCompose[currentKvartal][currentLot]['compositionContent'][composeValue];
			}
		} else if (kvartalsForestCompose[currentKvartal]?.[currentLot]?.['subFeatureContent']) {
			kvartalsForestCompose[currentKvartal][currentLot]['subFeatureContent'][composeValue] = {
				...compositionDescription,
			};
			currentCompose = kvartalsForestCompose[currentKvartal][currentLot]['subFeatureContent'][composeValue];
		}

		with (currentCompose) {
			composeAge = getColumnHeaderValue(textItem, [6]);
			composeHeight = getColumnHeaderValue(textItem, [7]);
			composeDiameter = getColumnHeaderValue(textItem, [8]);
			composeAgeClass = getColumnHeaderValue(textItem, [9]);
			composeAgeBound = getColumnHeaderValue(textItem, [10]);
			composeQuality = getColumnHeaderValue(textItem, [11]);
			composeCompleteArea = getColumnHeaderValue(textItem, [13]);
			composeAreaStock = getColumnHeaderValue(textItem, [14]);
			composeCommonStock = getColumnHeaderValue(textItem, [15]);
			composeUnitStock = getColumnHeaderValue(textItem, [16]);
			composeMarketClass = getColumnHeaderValue(textItem, [17]);
			composeLotAreaStock = getColumnHeaderValue(textItem, [18]);
			composeLotCommonStock = getColumnHeaderValue(textItem, [19]);
			composeLotUnitStock = getColumnHeaderValue(textItem, [20]);
			composeLotCommonClutterStock = getColumnHeaderValue(textItem, [21]);
			composeLotClutterStock = getColumnHeaderValue(textItem, [22]);
		}
	};

	// Функция валидации номера квартала, чтобы он попадал в диапазон указанных на титуле значений
	const validateForestryKvartal = (kvartal) => {
		return (
			forestryTitleValues['kvartalRange'].value?.findIndex((item) => {
				return item.indexOf('-') > -1
					? Number(item.split('-')[0]) <= Number(kvartal) && Number(item.split('-')[1]) >= Number(kvartal)
					: Number(item) === Number(kvartal);
			}) > -1
		);
	};

	// Функция получения значения колонок из строки с разбивкой согласно заголовку таблицы
	const getColumnHeaderValue = (textItem, colIndexs, splitSymbol = ';', captureAll = false) => {
		if (hasHeader && colIndexs.length > 0) {
			return colIndexs.reduce((accumulator, index) => {
				// console.log(
				// 	forestryHeaderValues[index],
				// 	captureAll,
				// 	textItem.slice(forestryHeaderValues[1].start, forestryHeaderValues[1].end).trim(),
				// 	'CURRENT INDEX'
				// );
				if (Number(index) > -1) {
					return (
						accumulator +
						(captureAll
							? textItem.slice(forestryHeaderValues[index].start).trim()
							: textItem.slice(forestryHeaderValues[index].start, forestryHeaderValues[index].end + 1).trim()) +
						splitSymbol
					);
				} else {
					for (let i = Number(index.split('-')[0]); i <= Number(index.split('-')[1]); i++) {
						accumulator = accumulator + getColumnHeaderValue(textItem, [i]) + splitSymbol;
					}
					return accumulator;
				}
			}, '');
		}
	};

	// Функция по проверке соответствия кандидата в текущее насаждение принадлежности классификатору compositionInfo - { forestItem -  вид древесины; objectItem -  элемент леса, не относящийся к деревьям}
	const isFeatureMainComposition = (textItem) => {
		const kandidate = getColumnHeaderValue(textItem, [2 - 23], '', true).trim();
		let isForest = (isObject = false);
		let lotCompositionName = '';
 
		if (
			compositionInfo.forestItem.findIndex((item) => {
				if (kandidate.search(item) == 0 > -1) lotCompositionName = item;
				return kandidate.search(item) == 0 > -1;
			})
		) {
			isForest = true;
			if (
				compositionInfo.objectItem.findIndex((item) => {
					if (kandidate.search(item) == 0 > -1) lotCompositionName = item;
					return kandidate.search(item) == 0 > -1;
				})
			) {
				isObject = true;
			}
		} else {
			if (
				compositionInfo.objectItem.findIndex((item) => {
					if (kandidate.search(item) == 0 > -1) lotCompositionName = item;
					return kandidate.search(item) == 0;
				}) > -1
			) {
				isObject = true;
			}
		}

		return { isForest, isObject, lotCompositionName };
	};

	// Функция по проверке соответствия кандидата в дополнительное описание к насаждению
	const isFeatureDetailedDescription = (textItem) => {
		const kandidate = getColumnHeaderValue(textItem, [2 - 23], '', true).trim();
		let isDetailed = false;
		let nameDetailed = '';

		if (
			compositionDetailedDescription.findIndex((item) => {
				if (kandidate.search(item.value) == 0) nameDetailed = item.name;
				return kandidate.search(item.value) == 0 > -1;
			})
		) {
			isDetailed = true;
		}
		return { isDetailed, nameDetailed };
	};

	// Функция для проверки соответствия текущей строки началу данных для различных элементов выдела и лесного квартала в целом
	const checkForFeatureType = (textItem, fType) => {
		switch (fType) {
			case featureType.header:
				return (!currentFeature || featureType.summary) && textItem.trim() && textItem.replace(/-/g, '').trim() === '';
			case featureType.main:
				return (
					currentKvartal &&
					(isFeatureMainComposition(textItem).isForest ||
						isFeatureMainComposition(textItem).isObject ||
						Number(getColumnHeaderValue(textItem, [0], '')) > 0)
				);
			case featureType.detailed:
				return (
					currentFeature === featureType.main &&
					currentLot &&
					currentKvartal &&
					kvartalsForestCompose[currentKvartal]?.[currentLot]?.lotComposition &&
					isFeatureDetailedDescription(textItem).isDetailed
				);
			case featureType.summary:
				return textItem.search(/Итого по категории/gi) > -1 || textItem.search(/Итого по кварталу/gi) > -1;
		}

		return false;
	};

	try {
		const parseItems = data.split('\n').slice(1, 150);
		//console.log(parseItems, 'Парсинг таксационной карточки');

		if (Array.isArray(parseItems) && parseItems.length > 0) {
			// Начинаем парсить данные еаксационной карты

			for (const textItem of parseItems) {
				console.log(
					textItem.charCodeAt(0),
					textItem.charCodeAt(1),
					textItem.charCodeAt(2),
					textItem.charCodeAt(3),
					textItem.charCodeAt(4),
					getColumnHeaderValue(textItem, ['0 - 7']),
					'Get header columns'
				);
				// Определяем текущий шаг парсинга ---> Титул => Квартал => Заголовок таблицы выделов => Составляющие лесные выделы => Баланс выделов в квартале
				if (!hasTitle) currentStep = searchStep.stepTitle;
				if (hasTitle && !currentKvartal) currentStep = searchStep.stepKvartal;
				//if (hasTitle && currentKvartal && !hasHeader) currentStep = searchStep.stepFeature;
				// Парсим титульный лист
				if (currentStep === searchStep.stepTitle) {
					if (
						Object.keys(forestryTitleValues).filter(
							(key) => forestryTitleValues[key].value && forestryTitleValues[key].hasValue
						).length == Object.keys(forestryTitleMasks).length
					) {
						hasTitle = true;
					} else {
						for (const [titleKeyItem, titleItem] of Object.entries(forestryTitleValues)) {
							let currentTitleItem = forestryTitleMasks[titleKeyItem];
							if (!titleItem.hasValue) {
								if (!titleItem.value) {
									for (const sampleIndex in currentTitleItem.samples) {
										const sample = currentTitleItem.samples[sampleIndex];
										const samplePattern = new RegExp(
											currentTitleItem.mask ? currentTitleItem.mask.replace('{%1}', sample) : sample,
											'g'
										);
										const patternValue = textItem.match(samplePattern) ? textItem.match(samplePattern)[0] : null;
										if (patternValue) {
											if (currentTitleItem.isColon) {
												titleItem.value = textItem.split(':').slice(-1)[0].trim();
											} else {
												titleItem.value = patternValue.trim();
											}
											if (!currentTitleItem.isContinues) titleItem.hasValue = true;
										}
									}
								} else if (currentTitleItem.isContinues && textItem.trim() && textItem.trim().lastIndexOf(':') < 0) {
									titleItem.value += textItem.trim();
								} else {
									titleItem.hasValue = true;
								}
								// Если искомое значение показателя получено, то приводим его в соответствие, если это должен быть массив
								if (titleItem.hasValue && currentTitleItem.isRange) {
									titleItem.value = titleItem.value.split(',').map((rangeItem) => rangeItem.trim());
								}
							}
						}
					}
				}

				// Парсим квартал и защитные зоны
				if (currentStep === searchStep.stepKvartal) {
					// Проверяем на нахождение строку с номером квартала
					if (textItem.indexOf(forestryTitleValues['forestryDistrict'].value) > -1) {
						for (const [zoneKeyItem, zoneItem] of Object.entries(forestryZoneValues)) {
							let currentZoneItem = forestryZoneMasks[zoneKeyItem];
							//if (!zoneItem.hasValue) {
							//	if (!zoneItem.value) {
							for (const sampleIndex in currentZoneItem.samples) {
								const sample = currentZoneItem.samples[sampleIndex];
								const samplePattern = new RegExp(
									currentZoneItem.mask ? currentZoneItem.mask.replace('{%1}', sample) : sample,
									'g'
								);
								const patternValue = textItem.match(samplePattern) ? textItem.match(samplePattern)[0] : null;

								// Ищем новое значение наименования защитной зоны
								if (patternValue) {
									if (currentZoneItem.isColon) {
										currentProtectZone = textItem.split(':').slice(-1)[0].trim();
									} else {
										currentProtectZone = patternValue.trim();
									}
									//if (!currentZoneItem.isContinues) zoneItem.hasValue = true;
								}
							}
							console.log(textItem.match(new RegExp('(?<=Квартал )[ 0-9]*', 'g')).filter(Number)[0], 'PARSE KVARTAL');
							// Проверяем на появление нового квартала для распарсивания
							if (textItem.match(new RegExp('(?<=Квартал )[ 0-9]*', 'g')).filter(Number)[0] !== currentKvartal) {
								currentKvartal = textItem.match(new RegExp('(?<=Квартал )[ 0-9]*', 'g')).filter(Number)[0];
							}
							//if (zoneItem.value && zoneKeyItem === 'protectZone') {

							//if (validateForestryKvartal(currentKvartal, ))
							// } else if (currentZoneItem.isContinues && textItem.trim() && textItem.trim().lastIndexOf(':') < 0) {
							// 	zoneItem.value += textItem.trim();
							// } else {
							// 	zoneItem.hasValue = true;
							// }
							// Если искомое значение показателя получено, то приводим его в соответствие, если это должен быть массив
							// if (zoneItem.hasValue && currentZoneItem.isRange) {
							// 	zoneItem.value = zoneItem.value.split(',').map((rangeItem) => rangeItem.trim());
							// }
						}
					} else {
						//Проверяем строку на наличие заголовка таблицы, выделов (основных и дополнительных) и статистики по выделам
						if (checkForFeatureType(textItem, featureType.header)) {
							// Попали в заголовок таблицы
							if (currentFeature !== featureType.header) currentFeature = featureType.header;
						} //Проверяем появление нового выдела и его основной части
						else if (checkForFeatureType(textItem, featureType.main)) {
							if (currentFeature !== featureType.main) currentFeature = featureType.main;
							//console.log(getColumnHeaderValue(textItem, [0, 1, 2, 3, '4-7']), 'Get columns');
						} //Проверяем наличие дополнительной части выделам
						else if (checkForFeatureType(textItem, featureType.detailed)) {
							if (currentFeature !== featureType.sub) currentFeature = featureType.detailed;
							// if (getColumnHeaderValue(textItem, [0], '') === '') {

							// } else {
							// 	console.log(
							// 		`Ошибка парсинга выдела ${getColumnHeaderValue(textItem, [0], '')} в квартале ${currentKvartal}`
							// 	);
							// }
						} //Проверяем наличие статистической части по кварталу
						else if (checkForFeatureType(textItem, featureType.summary)) {
							if (currentFeature !== featureType.summary) currentFeature = featureType.summary;
						} else {
							if (textItem.trim() !== '') {
								console.log(`Вероятно ошибка парсинга выдела ${textItem} в квартале ${currentKvartal}`);
							}
						}

						//console.log(checkForFeatureType(textItem, featureType.main), 'CHECK FOR START FEATURE');

						switch (currentFeature) {
							case featureType.header:
								// Если найден, но не распарсен заголовок таблицы - парсим его (разбор по колонкам с установкой начального и конечного символов каждой из колонок)
								if (!hasHeader && textItem.split(':')?.length > 22) {
									const columnObj = { start: 0, end: 0 };
									textItem
										.split(':')
										.slice(1, -1)
										.map((item, i) => {
											if (i > 0) {
												//forestryHeaderValues[i].start = forestryHeaderValues[i - 1].end + 1;
												columnObj.start = columnObj.end + 1;
											}
											columnObj.end = columnObj.start + item.length;
											forestryHeaderValues.push({ ...columnObj });
											//forestryHeaderValues[i].end = forestryHeaderValues[i].start + item.length;
										});
									hasHeader = true;
								}
								break;
							case featureType.main:
								// Добавляем новый квартал в итоговый отчет, если его там не было
								if (!kvartalsForestCompose[currentKvartal]) kvartalsForestCompose[currentKvartal] = {};
								if (
									Number(getColumnHeaderValue(textItem, [0], '')) > 0 &&
									!kvartalsForestCompose[currentKvartal][Number(getColumnHeaderValue(textItem, [0], ''))]
								) {
									// Если выдел отсутствует в квартале добавляем его
									currentLot = Number(getColumnHeaderValue(textItem, [0], ''));
									kvartalsForestCompose[currentKvartal][currentLot] = { ...kvartalContent };
									with (kvartalsForestCompose[currentKvartal][currentLot]) {
										lotIndex = currentLot;
										lotArea = getColumnHeaderValue(textItem, [1], '');
										if (
											getColumnHeaderValue(textItem, [2], '').match(new RegExp('[\\d|\\+]+[^0-9+]+', 'g'))?.length > 0
										) {
											lotComposition = getColumnHeaderValue(textItem, [2], '');
											getColumnHeaderValue(textItem, [2], '')
												.match(new RegExp('[\\d|\\+]+[^0-9+]+', 'g'))
												.map((composeItem) => {
													compositionDescription[composeItem.match('[^0-9+]+')[0]] = {
														composeKoeff:
															composeItem.match('[0-9+]+')[0] !== '+' ? Number(composeItem.match('[0-9+]+')[0]) : 0,
													};
												});
											//console.log(compositionDescription, 'Описание коэффициента состава древисины');
										} else {
											lotName = getColumnHeaderValue(textItem, [2], '');
										}
										lotProtectZone = currentProtectZone;
									}
								}

								break;
							case featureType.detailed:
								break;
						}
					}
				}
			}

			console.log(
				forestryTitleValues,
				currentKvartal,
				currentStep,
				forestryHeaderValues,
				JSON.stringify(kvartalsForestCompose),
				'Распарсенный титульный лист'
			);
			//console.log(Object.entries(global.forestryTitleMasks));
			//console.log(parseItems.length, 'Количество строк');
			//'(по состоянию на 2016 год)'.match(/-?\d+\.?\d+/g).map(Number);
		} else {
			return { isEmpty: true, message: 'Нет данных для анализа!' };
		}
	} catch (error) {
		console.log(error, 'Error was occured by parse title Forestry');
		return { isError: true, message: error.message };
	}
};

module.exports = { forestryTitleMasks, tryParseForestryData };
