var messages = {
	en: {
		title: "Vladivostok imagery",
		menu: {
			extent: {
				title: "Extent",
				max: "Full extent",
				vl: "Vladivostok",
				heritage: {
					pospelov: "Fort Pospelova",
					fort_6: "Fort №6",
					voroshilov: "Artillery battery Voroshilov",
					nameless: "Artillery battery Nameless"
				}
			},
			_layers: {
				title: "Layers",
				add: "Add layer"
			},
			service: {
				title: "Service",
				express: "Quick analysis",
				change: "Change detection",
				filter: "Filter",
				statistics: "Statistics"
			},
			_export: {
				title: "Export",
				print: "Print"
			},
			info: {
				title: "Info",
				about: "About",
				contacts: "Contacts"
			},
			lang: {
				title: "Language",
				ru: "Russian",
				en: "English"
			},
			user: {
				login: "Login",
				logout: "Logout",
				default_username: "User"
			}
		},
		modal: {
			change: {
				title: "Change detection",
				_confirm: "Start"
			},
			express: {
				title: "Express analysis",
				_confirm: "Start"
			},
			filter: {
				title: "Apply filter",
				apply: "Apply"
			},
			statistics: {
				title: "Calculate statistics"
			},
			msg: {
				_close: "Close"
			},
			_layers: {
				title: "Add new layer",
				load: "Load",
				add: "Add"
			},
			auth: {
				title: "Login user",
				login: "Login",
				username: "Username",
				_password: "Password"
			},
			logout: {
				title: "Logout user",
				question: "Do you really want to logout user?",
				yes: "Yes"
			}
		},
		group: {
			basemap: "Basemap",
			imagery: "Imagery",
			overlay: "Overlay"
		},
		change: {
			no_layers: "No layers",
			_layer: {
				first: "First layer",
				second: "Second layer"
			},
			params: {
				output: {
					type: "Output",
					threshold: "By threshold",
					stretch: "Stretch colors"
				},
				threshold: "Threshold"
			},
			method: {
				title: "Change detection method",
				composite: "Multitemporal composite",
				difference: "Image difference",
				ratio: "Image ratio"
			}
		},
		express: {
			method: {
				title: "Analysis method",
				urban: "Detect changes in urban area"
			}
		},
		filter: {
			_layer: "Select layer",
			params: {
				size: "Window size"
			},
			type: {
				title: "Select filter",
				sharpen: "Sharpen",
				gaussian: "Gaussian blur",
				edge: "Edge detector",
				median: "Median filter"
			}
		},
		statistics: {
			_layer: "Select layer",
			max: "Maximum",
			min: "Minimum",
			mean: "Mean",
			standard_deviation: "Standard deviation"
		},
		error: {
			title: "Error",
			under_construction: "Under construction...",
			invalid_layer: "Invalid layer",
			layer_not_found: "Layer not found",
			server_returned_error: "Server returned an error",
			not_logged_in: "Oops, you are not authorized to access this resource! Try to login."
		}
	},
	ru: {
		title: "Ортофотомозаики Владивостока",
		menu: {
			extent: {
				title: "Масштаб",
				max: "Максимальный",
				vl: "Владивосток",
				heritage: {
					pospelov: "Форт Поспелова",
					fort_6: "Форт №6",
					voroshilov: "Батарея им. Ворошилова",
					nameless: "Батарея Безымянная"
				}
			},
			_layers: {
				title: "Слои",
				add: "Добавить слой"
			},
			service: {
				title: "Сервисы",
				express: "Экспресс-анализ",
				change: "Найти изменения",
				filter: "Фильтрация",
				statistics: "Статистика"
			},
			_export: {
				title: "Экспорт",
				print: "На печать"
			},
			info: {
				title: "Справка",
				about: "О программе",
				contacts: "Контакты"
			},
			lang: {
				title: "Язык",
				ru: "Русский",
				en: "Английский"
			},
			user: {
				login: "Войти",
				logout: "Выйти",
				default_username: "Пользователь"
			}
		},
		modal: {
			change: {
				title: "Найти изменения",
				_confirm: "Запуск"
			},
			express: {
				title: "Экспресс-анализ",
				_confirm: "Запуск"
			},
			filter: {
				title: "Применить фильтр",
				apply: "Применить"
			},
			statistics: {
				title: "Расчет статистических показателей"
			},
			msg: {
				_close: "Закрыть"
			},
			_layers: {
				title: "Добавить новый слой",
				load: "Загрузить",
				add: "Добавить"
			},
			auth: {
				title: "Войти в систему",
				login: "Войти",
				username: "Имя пользователя",
				_password: "Пароль"
			},
			logout: {
				title: "Выйти из системы",
				question: "Вы действительно хотите выйти?",
				yes: "Да"
			}
		},
		group: {
			basemap: "Подложка",
			imagery: "Космоснимки",
			overlay: "Дополнительно"
		},
		change: {
			no_layers: "Нет слоев",
			_layer: {
				first: "Первый слой",
				second: "Второй слой"
			},
			params: {
				output: {
					type: "На выходе",
					threshold: "Применить пороговый фильтр",
					stretch: "Растянуть цвета"
				},
				threshold: "Пороговое значение"
			},
			method: {
				title: "Метод определения изменений",
				composite: "Мультивременной композит",
				difference: "Попиксельная разность",
				ratio: "Попиксельное соотношение"
			}
		},
		express: {
			method: {
				title: "Метод анализа",
				urban: "Определить изменения в городской застройке"
			}
		},
		filter: {
			_layer: "Выберите слой",
			params: {
				size: "Размер окна"
			},
			type: {
				title: "Выберите тип фильтра",
				sharpen: "Увеличить резкость",
				gaussian: "Размытие по Гауссу",
				edge: "Детектор граней",
				median: "Медианный фильтр"
			}
		},
		statistics: {
			_layer: "Выберите слой",
			max: "Максимум",
			min: "Минимум",
			mean: "Среднее",
			standard_deviation: "Стандартное отклонение"
		},
		error: {
			title: "Ошибка",
			under_construction: "Пока не работает...",
			invalid_layer: "Неправильный слой",
			layer_not_found: "Слой не найден",
			server_returned_error: "Сервер вернул ошибку",
			not_logged_in: "У вас недостаточно прав для доступа к этому ресурсу. Попробуйте войти в систему."
		}
	}
};
var settings = {lang: 'ru'}; // russian by default