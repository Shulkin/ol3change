/**
 * Add all your dependencies here.
 *
 * @require Popup.js
 * @require LayersControl.js
 * @require translate.js
 * @require local.js
 * @require utils.js
 * @require lib.js
 */

// ==== config ====
var url = '/geoserver/ows?';
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
// satellite imagery
var mosaics = [
	new ol.layer.Tile({
		title: "Владивосток 2м 2010_1",
		group: "imagery",
		visible: false,
		deletable: false,
		source: new ol.source.TileWMS({
			url: url,
			params: {'LAYERS': "Mosaic1_ChangeDetection" + ':' + "Mosaic_20101230_UTM52_2m", 'TILED': true},
			serverType: 'geoserver'
		})
	}),
	new ol.layer.Tile({
		title: "Владивосток 2м 2010_2",
		group: "imagery",
		visible: false,
		deletable: false,
		source: new ol.source.TileWMS({
			url: url,
			params: {'LAYERS': "Mosaic1_ChangeDetection" + ':' + "Mosaic_20110224_part2_UTM52_2m", 'TILED': true},
			serverType: 'geoserver'
		})
	}),
	new ol.layer.Tile({
		title: "Владивосток 2м 2012",
		group: "imagery",
		visible: false,
		deletable: false,
		source: new ol.source.TileWMS({
			url: url,
			params: {'LAYERS': "Mosaic2_ChangeDetection" + ':' + "Vladivostok_Mosaic2_ChangeDetection", 'TILED': true},
			serverType: 'geoserver'
		})
	}),
	new ol.layer.Tile({
		title: "Владивосток 1м 2015",
		group: "imagery",
		visible: false,
		deletable: false,
		source: new ol.source.TileWMS({
			url: url,
			params: {'LAYERS': "Mosaic3_Resurs_ChangeDetection" + ':' + "Mosaic_UTM521", 'TILED': true},
			serverType: 'geoserver'
		})
	})
];
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
/*
// roads from OSM
var topojson = new ol.format.TopoJSON();
var tileGrid = ol.tilegrid.createXYZ({maxZoom: 19});
var roadStyleCache = {};
var roadColor = {
	'major_road': '#776',
	'minor_road': '#ccb',
	'highway': '#f39'
};
var roads = new ol.layer.VectorTile({
	title: 'Дороги',
	visible: false,
	source: new ol.source.VectorTile({
		format: topojson,
		tileGrid: tileGrid,
		url: 'http://{a-c}.tile.openstreetmap.us/vectiles-highroad/{z}/{x}/{y}.topojson'
	}),
	style: function(feature) {
		var kind = feature.get('kind');
		var railway = feature.get('railway');
		var sort_key = feature.get('sort_key');
		var styleKey = kind + '/' + railway + '/' + sort_key;
		var style = roadStyleCache[styleKey];
		if (!style) {
			var color, width;
			if (railway) {
				color = '#7de';
				width = 1;
			} else {
				color = roadColor[kind];
				width = kind == 'highway' ? 1.5 : 1;
			}
			style = new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: color,
					width: width
				}),
				zIndex: sort_key
			});
			roadStyleCache[styleKey] = style;
		}
		return style;
	}
});
// labels from OSM
var labels = new ol.layer.VectorTile({
	title: 'Подписи',
	visible: false,
	source: new ol.source.VectorTile({
		format: topojson,
		tileGrid: tileGrid,
		url: 'http://tile.openstreetmap.us/vectiles-skeletron/{z}/{x}/{y}.topojson'
	}),
	style: function(feature) {
		var name = feature.get('name');
		var sort_key = feature.get('sort_key');
		style = new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: "red",
				width: 2
			}),
			text: new ol.style.Text({
				font: '12px Verdana',
				text: name,
				fill: new ol.style.Fill({color: 'black'}),
				stroke: new ol.style.Stroke({color: 'white', width: 0.5})
			}),
			zIndex: sort_key
		});
		return style;
	}
});
*/

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
		mosaics[0], mosaics[1], mosaics[2], mosaics[3], // satellite mosaics
		/*roads, labels,*/ // additional data from OSM, deprecated for now
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
}

// translate modal windows
function trModal() {
	$("span#md_change_title").text(tr('modal:change:title'));
	$("span#md_change_confirm").text(tr('modal:change:_confirm'));
	$("span#md_msg_close").text(tr('modal:msg:_close'));
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
	location.href = "http://localhost:9080?lang=" + code;
}

function setLanguageFromULR() {
	var params = getParams();
	var param1 = params.lang;
	if (validParam(param1)) {
		settings.lang = param1;
	}
}

$(document).ready(function() {
	// set settings.lang
	setLanguageFromULR();
	// perform DOM localization
	translate();
});