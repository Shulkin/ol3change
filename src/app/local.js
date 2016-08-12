var messages = {
	en: {
		title: "Vladivostok imagery",
		menu: {
			extent: {
				title: "Extent",
				max: "Full extent",
				vl: "Vladivostok"
			},
			_layers: {
				title: "Layers",
				add: "Add layer"
			},
			service: {
				title: "Service",
				change: "Change detection"
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
			filter: {
				title: "Apply filter",
				_confirm: "Apply"
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
			method: {
				title: "Change detection method",
				composite: "Multitemporal composite",
				difference: "Image difference",
				ratio: "Image ratio"
			}
		},
		error: {
			title: "Error",
			under_construction: "Under construction...",
			invalid_layer: "Invalid layer",
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
				vl: "Владивосток"
			},
			_layers: {
				title: "Слои",
				add: "Добавить слой"
			},
			service: {
				title: "Сервисы",
				change: "Найти изменения"
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
			filter: {
				title: "Применить фильтр",
				_confirm: "Запуск"
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
			method: {
				title: "Метод определения изменений",
				composite: "Мультивременной композит",
				difference: "Попиксельная разность",
				ratio: "Попиксельное соотношение"
			}
		},
		error: {
			title: "Ошибка",
			under_construction: "Пока не работает...",
			invalid_layer: "Неправильный слой",
			server_returned_error: "Сервер вернул ошибку",
			not_logged_in: "У вас недостаточно прав для доступа к этому ресурсу. Попробуйте войти в систему."
		}
	}
};
var settings = {lang: 'ru'}; // russian by default