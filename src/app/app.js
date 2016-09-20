/**
 * Add all your dependencies here.
 *
 * @require Popup.js
 * @require LayersTree.js
 * @require LayersControl.js
 * @require translate.js
 * @require local.js
 * @require modal.js
 * @require median.js
 * @require utils.js
 * @require kernel.js
 * @require statistics.js
 * @require lib.js
 * @require processing.js
 */

// ==== config ====
var url = '/geoserver/ows?';
var default_geoserver = "http://gis.dvo.ru:8080/geoserver/wms?";
// full extent
var center_max = [-10764594.758211, 4523072.3184791];
var zoom_max = 3;
// vladivostok
var center_vl = [14682657.95, 5329191.66]; // Zolotoy Bridge
var zoom_vl = 14;
// heritage sites, vladivostok fortress
var center_heritages = {
	"pospelov": [43.0498312, 131.8814921], // lat, lon
	"fort_6": [43.1927774, 131.9558805],
	"voroshilov": [42.9817365, 131.890617],
	"nameless": [43.1226548, 131.8766883]
};
var zoom_heritage = 18; // same for all heritage sites
// ================

// create a new popup with a close box
// the popup will draw itself in the popup div container
// autoPan means the popup will pan the map if it's not visible (at the edges of the map).
var popup = new app.Popup({
	element: document.getElementById('popup'),
	closeBox: true,
	autoPan: true
});

// create a vector layer to contain the feature to be highlighted
var highlight = new ol.layer.Vector({
	title: 'Подсветка',
	name: 'highlight', // no uid
	style: new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: '#00FFFF',
			width: 3
		})
	}),
	source: new ol.source.Vector()
});

// when the popup is closed, clear the highlight
$(popup).on('close', function() {
	highlight.getSource().clear();
});

// basemaps
var bing = new ol.layer.Tile({
	title: 'Bing Maps',
	name: 'bing', // don't add uid
	group: "background",
	visible: false,
	deletable: false,
	preload: Infinity,
	source: new ol.source.BingMaps({
		key: 'ArA0AiZoPTa6fIegopVHoXVsOp0z9YhZdAzXygyDyhwvpwM7ifEDWHlIRO90-_81',
		imagerySet: 'Aerial'
		// use maxZoom 19 to see stretched tiles instead of the BingMaps "no photos at this zoom level" tiles
		// maxZoom: 19
	})
});
var osm = new ol.layer.Tile({
	title: 'OpenStreetMap',
	name: 'osm', // also don't need uid
	group: "background",
	visible: true,
	deletable: false,
	source: new ol.source.OSM()
});
// cadastre overlay
var cadastre = new ol.layer.Tile({
	title: 'Кадастр',
	name: 'cadastre', // same here, no uid
	visible: false,
	deletable: false,
	source: new ol.source.TileWMS({
		url: 'http://pkk5.rosreestr.ru/arcgis/services/Cadastre/CadastreWMS/MapServer/WMSServer',
		params: {'LAYERS': '24,23,22,21,20,13,12,11,9,8,6,5,4,3,2,1,18,17,16,15', 'TILED': true},
		serverType: 'mapserver'
	})
});

// create the OpenLayers Map object
// we add a layer switcher to the map with two groups:
// 1. background, which will use radio buttons (exclusive: true)
// 2. default (satellite, overlays), which will use checkboxes
var map = new ol.Map({
	controls: ol.control.defaults().extend([
		new app.LayersControl({
			groups: {
				// basemaps
				background: {title: tr('group:basemap'), exclusive: true},
				// satellite imagery
				imagery: {title: tr('group:imagery')},
				// overlays
				'default': {title: tr('group:overlay')}
			}
		})
	]),
	// add the popup as a map overlay
	overlays: [popup],
	// render the map in the 'map' div
	target: document.getElementById('map'),
	// use the Canvas renderer
	renderer: 'canvas',
	// define layers
	layers: [
		bing, osm, // background
		cadastre, // overlay with open cadastre map
		highlight // highlight cadastre feature on select
	],
	// initial center and zoom of the map's view
	// in Vladivostok by default
	view: new ol.View({
		center: center_vl,
		zoom: zoom_vl
	})
});
initSatelliteMosaics();

// create parser and handler for GetFeatureInfo request
var parser = new ol.format.WMSGetFeatureInfo();
map.on('singleclick', function(evt) {
	if (cadastre.getVisible() && onMap(map, cadastre)) {
		var view = map.getView();
		// get data from cadastre overlay
		var url = cadastre.getSource().getGetFeatureInfoUrl(
			evt.coordinate, view.getResolution(), view.getProjection(),
			{'INFO_FORMAT': 'text/html'});
		$.ajax(url).then(function(response) {
			popup.setPosition(evt.coordinate);
			// simply put it in popup
			popup.setContent(response);
			popup.show();
			// highlight features on map
			var features = parser.readFeatures(response);
			highlight.getSource().clear();
			highlight.getSource().addFeatures(features);
		});
	}
});

// satellite imagery
function initSatelliteMosaics() {
	mosaics = [];
	pushMosaic(default_geoserver, "Mosaic1_ChangeDetection:Mosaic_20101230_part1_1m", "Владивосток 1м 2010_1", false);
	pushMosaic(default_geoserver, "Mosaic1_ChangeDetection:Mosaic_20110224_part2_1m", "Владивосток 1м 2010_2", false);
	pushMosaic(default_geoserver, "Mosaic2_ChangeDetection:Mosaic_201207161_1m", "Владивосток 1м 2012", false);
	pushMosaic(default_geoserver, "Mosaic3_Resurs_ChangeDetection:Mosaic_UTM521", "Владивосток 1м 2015", false);
	// HACK
	// move cadastre and highlight on top
	cadastre.setZIndex(9998);
	highlight.setZIndex(9999); // on top
}

function layers_list_div(title, id) {
	var div = $("<div>");
	var p = $("<p></p>").text(title);
	var list = $("<select id='" + id + "'>");
	var array = getAllLayers(map); // get all layers on map
	for (var i = 0; i < array.length; i++) {
		list.append("<option value=" + array[i].get("name") + ">" + array[i].get("title") + "</option>");
	}
	if (!(array.length > 0)) { // no layers
		list.append("<option value='" + null + "'>" + tr('change:no_layers') + "</option>");
	}
	list.append("</select>");
	div.append(p, list, "</div>");
	return div;
}

function span_div(text) {
	var div = $("<div>");
	var span = $("<span>" + text + "</span>");
	div.append(span, "</div>");
	return div;
}

function parameters_div(title, type, id, obj) {
	var div = $("<div>");
	var p = $("<p></p>").text(title);
	switch (type) {
		case "text":
			var elem = $("<input type='type' id='" + id + "'>");
			break;
		case "number":
			var elem = $("<input type='number' id='" + id +
				"' min='" + obj.min +
				"' max='" + obj.max +
				"' value='" + obj.value +
				"' step='" + obj.step + "'>");
			break;
		case "checkbox":
			var elem = $("<input type='checkbox' id='" + id + "' checked> " +
				"<label for='" + id + "'>" + title + "</label>");
			break;
		case "select":
			var elem = $("<select id='" + id + "'>");
			// obj is an array in this case!
			for (var i = 0; i < obj.length; i++) {
				elem.append("<option value='" + obj[i].value + "'>" + obj[i].title + "</option>");
			}
			elem.append("</select>");
			break;
	}
	if (type != "checkbox") {
		// for checkbox, title is on the right side of an element
		div.append(p);
	}
	div.append(elem, "</div>");
	return div;
}

function empty_div(id) {
	var div = $("<div id='" + id + "'>");
	div.append("</div>"); // close empty div
	return div;
}

function change_method_div() {
	var div = $("<div>");
	var p = $("<p></p>").text(tr('change:method:title'));
	var list = $("<select id='method'>");
	list.append("<option value=composite>" + tr('change:method:composite') + "</option>");
	list.append("<option value=difference>" + tr('change:method:difference') + "</option>");
	list.append("<option value=ratio>" + tr('change:method:ratio') + "</option>");
	list.append("</select>");
	div.append(p, list, "</div>");
	return div;
}

function express_method_div() {
	var div = $("<div>");
	var p = $("<p></p>").text(tr('express:method:title'));
	var list = $("<select id='express_method'>");
	list.append("<option value=urban>" + tr('express:method:urban') + "</option>");
	list.append("</select>");
	div.append(p, list, "</div>");
	return div;
}

function filter_type_div() {
	var div = $("<div>");
	var p = $("<p></p>").text(tr('filter:type:title'));
	var list = $("<select id='filter_type'>");
	list.append("<option value=sharpen>" + tr('filter:type:sharpen') + "</option>");
	list.append("<option value=gaussian>" + tr('filter:type:gaussian') + "</option>");
	list.append("<option value=edge>" + tr('filter:type:edge') + "</option>");
	list.append("<option value=median>" + tr('filter:type:median') + "</option>");
	list.append("</select>");
	div.append(p, list, "</div>");
	return div;
}

// handler on show change detection window
$('#confirm').on('shown.bs.modal', function() {
	var elem = $("#confirm > div > div.modal-content > div.modal-body");
	elem.html(""); // clear previous html
	elem.append(
		// detect changes between these layers
		layers_list_div(tr('change:_layer:first'), "layer_change_1"),
		layers_list_div(tr('change:_layer:second'), "layer_change_2"),
		change_method_div(), // method & corresponding change handler
		// additional parameters
		empty_div("change_params") // by default, none!
	);
	$('#method').on('change', function() {
		var value = $(this).val(); // selected method
		var div = $("#change_params");
		div.html(""); // clear params
		if (value === "difference" || value === "ratio") {
			// threshold or stretch?
			div.append(parameters_div(
				tr("change:params:output:type"),
				"select", "change_outputType",
				[{value: "threshold", title: tr("change:params:output:threshold")},
				{value: "stretch", title: tr("change:params:output:stretch")}]
			));
			// threshold method
			div.append(parameters_div(
				"Метод определения порогового значения",
				"select", "change_thresholdMethod",
				[{value: "manual", title: "Вручную"},
				{value: "percentile", title: "Метод перцентилей"},
				{value: "otsu", title: "Метод Отсу"},
				{value: "kapur", title: "Алгоритм Капура"}]
			));
			// threshold value with empirical default values
			/**
			* Important!
			* Empirical values for threshold are:
			* Difference = 65
			* Ratio = 160
			*/
			if (value === "difference") {
				div.append(parameters_div(
					tr("change:params:threshold"),
					"number", "change_thresholdValue",
					/**
					* Important!
					* Set threshold value for image pixels difference
					* 1-3 bands are [0..500] max after Abs, 4 band always 0
					* Vector length [0..866] => max is 900
					* Stretch to grayscale [0..255]
					* Default threshold = 65
					*/
					{min: 0, max: 255, step: 1, value: 65}
				));
			} else { // ratio
				div.append(parameters_div(
					tr("change:params:threshold"),
					"number", "change_thresholdValue",
					/**
					* Important!
					* Set threshold value for image pixels ratio
					* 1-3 bands are [-Pi/2..Pi/2] initially, [0..Pi/2 = 1,57] after Abs, 4 band always 0 (by force!)
					* Vector length [0..2,17] => max is 2.5
					* Stretch to grayscale [0..255]
					* Default threshold = 160
					*/
					{min: 0, max: 255, step: 1, value: 160}
				));
			}
		}
	});
});

// handler on show express analysis window
$('#express').on('shown.bs.modal', function() {
	var elem = $("#express > div > div.modal-content > div.modal-body");
	elem.html(""); // clear previous html
	elem.append(
		// analyse these data layers
		layers_list_div(tr('change:_layer:first'), "layer_express_1"),
		layers_list_div(tr('change:_layer:second'), "layer_express_2"),
		express_method_div() // express method
	);
});

// handler on show post processing window
$('#filter').on('shown.bs.modal', function() {
	var elem = $("#filter > div > div.modal-content > div.modal-body");
	elem.html(""); // clear previous html
	elem.append(
		// filtered layer
		layers_list_div(tr('filter:_layer'), "layer_filter"),
		filter_type_div(), // filter type
		// additional parameters
		empty_div("filter_params") // by default, none!
	);
	$('#filter_type').on('change', function() {
		var value = $(this).val(); // selected method
		var div = $("#filter_params");
		div.html(""); // clear params
		switch (value) {
			case "median":
				// size of the kernel for median filter
				div.append(parameters_div(
					tr("filter:params:size"),
					"number", "median_filter_size",
					{min: 3, max: 10, step: 1, value: 5}
				));
				break;
		}
	});
});

// handler on show statistics window
$('#statistics').on('shown.bs.modal', function() {
	var elem = $("#statistics > div > div.modal-content > div.modal-body");
	elem.html(""); // clear previous html
	elem.append(
		// calculate statistics for this layer
		layers_list_div(tr('statistics:_layer'), "layer_statistics"),
		// result of the calculation
		empty_div("statistics_result")
	);
	$('#layer_statistics').on('change', function() {
		var name = $(this).val(); // layers name
		if (name === 'null') {
			error(tr("error:invalid_layer"));
			return;
		}
		var layer = getLayerByName(map, name);
		if (layer === null) {
			error(tr("error:layer_not_found"));
			return;
		}
		var raster = new ol.source.Raster({
			sources: [layer.getSource()],
			operationType: 'image',
			operation: function(pixels, data) {
				var source = pixels[0];
				data.max = max(source.data);
				data.min = min(source.data);
				data.mean = mean(source.data);
				data.standard_deviation = standard_deviation(source.data);
				return {data: source.data, width: source.width, height: source.height}; // mandatory!
			},
			lib: {
				max: image_max,
				min: image_min,
				mean: image_mean,
				standard_deviation: image_standard_deviation
			}
		});
		raster.on('afteroperations', function(event) {
			var div = $("#statistics_result");
			div.html(""); // clear result
			div.append(
				span_div(tr("statistics:max") + ": " + event.data.max),
				span_div(tr("statistics:min") + ": " + event.data.min),
				span_div(tr("statistics:mean") + ": " + event.data.mean),
				span_div(tr("statistics:standard_deviation") + ": " + event.data.standard_deviation)
			);
			map.removeLayer(l);
		});
		var l = new ol.layer.Image({
			title: "blank",
			name: uid(),
			group: "imagery",
			deletable: true,
			source: raster
		});
		map.addLayer(l);
	});
});

// translate main menu
function trMenu() {
	$("span#m_extent").text(tr('menu:extent:title'));
	$("span#m_extent_max").text(tr('menu:extent:max'));
	$("span#m_extent_vl").text(tr('menu:extent:vl'));
	$("span#m_extent_pospelov").text(tr('menu:extent:heritage:pospelov'));
	$("span#m_extent_fort_6").text(tr('menu:extent:heritage:fort_6'));
	$("span#m_extent_voroshilov").text(tr('menu:extent:heritage:voroshilov'));
	$("span#m_extent_nameless").text(tr('menu:extent:heritage:nameless'));
	$("span#m_layers").text(tr('menu:_layers:title'));
	$("span#m_layers_add").text(tr('menu:_layers:add'));
	$("span#m_service").text(tr('menu:service:title'));
	$("span#m_service_express").text(tr('menu:service:express'));
	$("span#m_service_change").text(tr('menu:service:change'));
	$("span#m_service_filter").text(tr('menu:service:filter'));
	$("span#m_service_statistics").text(tr('menu:service:statistics'));
	$("span#m_export").text(tr('menu:_export:title'));
	$("span#m_export_print").text(tr('menu:_export:print'));
	$("span#m_info").text(tr('menu:info:title'));
	$("span#m_info_about").text(tr('menu:info:about'));
	$("span#m_info_contacts").text(tr('menu:info:contacts'));
	$("span#m_lang").text(tr('menu:lang:title'));
	$("span#m_lang_ru").text(tr('menu:lang:ru'));
	$("span#m_lang_en").text(tr('menu:lang:en'));
	$("span#m_user").text(tr('menu:user:login'));
	$("span#m_user_logout").text(tr('menu:user:logout'));
	$("span#m_user_username").text(tr('menu:user:default_username')); // just in case
}

// translate modal windows
function trModal() {
	$("span#md_express_title").text(tr('modal:express:title'));
	$("span#md_express_confirm").text(tr('modal:express:_confirm'));
	$("span#md_change_title").text(tr('modal:change:title'));
	$("span#md_change_confirm").text(tr('modal:change:_confirm'));
	$("span#md_filter_title").text(tr('modal:filter:title'));
	$("span#md_filter_apply").text(tr('modal:filter:apply'));
	$("span#md_statistics_title").text(tr('modal:statistics:title'));
	$("span#md_msg_close").text(tr('modal:msg:_close'));
	$("span#md_layers_title").text(tr('modal:_layers:title'));
	$("span#md_layers_load").text(tr('modal:_layers:load'));
	$("span#md_layers_add").text(tr('modal:_layers:add'));
	$("span#md_auth_title").text(tr('modal:auth:title'));
	$("span#md_auth_login").text(tr('modal:auth:login'));
	$("span#md_auth_username").text(tr('modal:auth:username'));
	$("span#md_auth_password").text(tr('modal:auth:_password'));
	$("span#md_logout_title").text(tr('modal:logout:title'));
	$("span#md_logout_question").text(tr('modal:logout:question'));
	$("span#md_logout_yes").text(tr('modal:logout:yes'));
}

// translate document title
function trTitle() {
	document.title = tr("title");
}

function translate() {
	trMenu();
	trModal();
	trTitle();
}

// url params
function getParams() {
	var params = {};
	if (location.search) {
		var parts = location.search.substring(1).split('&');
		for (var i = 0; i < parts.length; i++) {
			var nv = parts[i].split('=');
			if (!nv[0]) continue;
			params[nv[0]] = nv[1] || true;
		}
	}
	return params;
}

// if url param is not undefined, null, etc.
function validParam(obj) {
	return ((obj != undefined) && (obj != null) && (obj != ""));
}

function changeLanguage(code) {
	// force reload page
	// remove previous params and links, leave only base url
	var href = location.href.split("?")[0].split("#")[0];
	location.href = href + "?lang=" + code;
}

function setLanguageFromULR() {
	var params = getParams();
	var param1 = params.lang;
	if (validParam(param1)) {
		settings.lang = param1;
	}
}

function login(user, password) {
	$("span#m_user_username").text(user);
	// UGLY
	$("#menu_login_user").hide();
	$("#menu_logout_user").show();
	sessionStorage['username'] = user;
	sessionStorage['password'] = password;
}

function logout() {
	$("span#m_user_username").text(tr('menu:user:default_username')); // just in case
	// UGLY
	$("#menu_login_user").show();
	$("#menu_logout_user").hide();
	clearSession();
}

function loginFromSession() {
	// kinda UGLY code
	// also, SECURITY issues!
	var user = sessionStorage['username'];
	var password = sessionStorage['password'];
	if (!anonymous(user, password)) {
		// user in active session is present
		login(user, password);
	} else {
		logout(); // just in case
	}
}

function clearSession() {
	sessionStorage['username'] = undefined;
	sessionStorage['password'] = undefined;
}

function getUsername() {
	return sessionStorage['username'];
}

function getPassword() {
	return sessionStorage['password'];
}

$(document).ready(function() {
	// set settings.lang
	setLanguageFromULR();
	// perform DOM localization
	translate();
	loginFromSession();
});