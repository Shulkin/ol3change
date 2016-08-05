function isArray(obj) {
	return (Object.prototype.toString.call(obj) === "[object Array]");
}

function notUndefined(obj) {
	return ((obj != undefined) && (obj != 'undefined'));
}

Array.prototype.last = function() {
	return this[this.length - 1];
}

String.prototype.insert = function (index, string) {
	if (index > 0) {
		return this.substring(0, index) + string + this.substring(index, this.length);
	} else {
		return string + this;
	}
};

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
		} else if (!(layer instanceof ol.layer.Group)) {
			result.push(layer);
		}
	});
	return result;
}

function onMap(map, layer) {
	var result = false;
	var array = getAllLayers(map);
	array.forEach(function(lar) {
		if (lar.get('title') === layer.get('title')) {
			result = true;
		}
	});
	return result;
}