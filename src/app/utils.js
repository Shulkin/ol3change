function zoomToFullExtent() {
	map.getView().setCenter(center_max);
	map.getView().setZoom(zoom_max);
}

function zoomToVladivostok() {
	map.getView().setCenter(center_vl);
	map.getView().setZoom(zoom_vl);
}

function get(id) { // get selected value by id
	var elem = document.getElementById(id);
	return elem.options[elem.selectedIndex].value;
}

function refreshLayersList(map) {
	map.getControls().forEach(function (control) {
		if (control instanceof app.LayersControl) {
			// refresh layers switcher
			control.clear();
			control.setMap(map);
		}
	});
}

function getAllLayers(map) {
	var result = [];
	var array = map.getLayers().getArray();
	array.forEach(function (layer, i) {
		if (layer instanceof ol.layer.Group && layer.getVisible() == true ) {
			layer.getLayers().getArray().forEach(function(sublayer, j, layers) {
				result.push(sublayer);
			})
		} else if (!(layer instanceof ol.layer.Group)/* && layer.getVisible() == true*/) {
			result.push(layer);
		}
	});
	return result;
}

function onMap(map, _layer) {
	var result = false;
	var array = getAllLayers(map);
	array.forEach(function(layer) {
		if (layer.get('title') === _layer.get('title')) {
			result = true;
		}
	});
	return result;
}

// default 'sorry, not working' message
function m_con() {
	error(tr("error:under_construction"));
}

function message(str) {
	$("#msg > div > div.modal-content > div.modal-header > .modal-title").text(""); // clear
	$("#msg > div > div.modal-content > div.modal-body > p").text(str);
	$("#msg").modal("show"); 
}

function error(str) {
	$("#msg > div > div.modal-content > div.modal-header > .modal-title").text(tr("error:title"));
	$("#msg > div > div.modal-content > div.modal-body > p").text(str);
	$("#msg").modal("show"); 
}