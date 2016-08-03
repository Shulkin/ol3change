/**
 * Add all your dependencies here.
 *
 * @require Popup.js
 * @require LayersTree.js
 * @require LayersControl.js
 * @require translate.js
 * @require local.js
 * @require utils.js
 * @require lib.js
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
	group: "background",
	visible: true,
	deletable: false,
	source: new ol.source.OSM()
});
// cadastre overlay
var cadastre = new ol.layer.Tile({
	title: 'Кадастр',
	visible: false,
	deletable: false,
	source: new ol.source.TileWMS({
		url: 'http://maps.rosreestr.ru/arcgis/services/Cadastre/CadastreWMS/MapServer/WMSServer',
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
}

function l_div(title, id) {
	var div = $("<div>");
	var p = $("<p></p>").text(title);
	var list = $("<select id='" + id + "'>");
	var count = 0;
	for (var i = 0; i < mosaics.length; i++) {
		// only add layers which is currently on map?
		if (onMap(map, mosaics[i])) { // maybe inefficiently
			count++;
			list.append("<option value=" + i + ">" + mosaics[i].get("title") + "</option>");
		}
	}
	if (!(count > 0)) { // no layers
		list.append("<option value='" + null + "'>" + tr('change:no_layers') + "</option>");
	}
	list.append("</select>");
	div.append(p, list, "</div>");
	return div;
}

function m_div() {
	var div = $("<div>");
	var p = $("<p></p>").text(tr('change:method:title'));
	var list = $("<select id='method'>");
	list.append("<option value=0>" + tr('change:method:comp') + "</option>");
	list.append("<option value=1>" + tr('change:method:diff') + "</option>");
	list.append("</select>");
	div.append(p, list, "</div>");
	return div;
}

// handler on show confirm window
$('#confirm').on('shown.bs.modal', function() {
	var elem = $("#confirm > div > div.modal-content > div.modal-body");
	elem.html(""); // clear previous html
	elem.append(
		// layers
		l_div(tr('change:_layer:first'), "layer1"),
		l_div(tr('change:_layer:second'), "layer2"),
		m_div() // method
	);
});

// translate main menu
function trMenu() {
	$("span#m_extent").text(tr('menu:extent:title'));
	$("span#m_extent_max").text(tr('menu:extent:max'));
	$("span#m_extent_vl").text(tr('menu:extent:vl'));
	$("span#m_layers").text(tr('menu:_layers:title'));
	$("span#m_layers_add").text(tr('menu:_layers:add'));
	$("span#m_service").text(tr('menu:service:title'));
	$("span#m_service_change").text(tr('menu:service:change'));
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
	$("span#md_change_title").text(tr('modal:change:title'));
	$("span#md_change_confirm").text(tr('modal:change:_confirm'));
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
	// TODO: change localhost to default url before ?
	location.href = "http://localhost:9080?lang=" + code;
}

function setLanguageFromULR() {
	var params = getParams();
	var param1 = params.lang;
	if (validParam(param1)) {
		settings.lang = param1;
	}
}

function login(username, _password) {
	$("span#m_user_username").text(username);
	// UGLY
	$("#menu_login_user").hide();
	$("#menu_logout_user").show();
	sessionStorage['username'] = username;
	sessionStorage['password'] = _password;
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
	// also, SECURITY measures!
	if ((!(sessionStorage['username'] === "undefined")) && (!(sessionStorage['password'] === "undefined"))) {
		login(sessionStorage['username'], sessionStorage['password']);
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