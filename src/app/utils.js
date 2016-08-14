function isArray(obj) {
	return (Object.prototype.toString.call(obj) === "[object Array]");
}

function isUndefined(obj) {
	return ((obj === undefined) || (obj === "undefined"));
}

// anonymous if user or password is undefined
function anonymous(user, password) {
	return (isUndefined(user) || isUndefined(password));
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

function getLayerByName(map, name) {
	var result = null;
	var array = getAllLayers(map);
	array.forEach(function(layer) {
		// name is unique id for layer
		if (layer.get('name') === name) {
			result = layer;
		}
	});
	// return null if layer not found
	return result;
}

function onMap(map, layer) {
	var result = false;
	var array = getAllLayers(map);
	array.forEach(function(lar) {
		// name is unique id for layer
		if (lar.get('name') === layer.get('name')) {
			result = true;
		}
	});
	return result;
}

// generate some unique id
function uid () {
	// desired length of id
	var idStrLen = 32;
	// always start with a letter - base 36 makes for a nice shortcut
	var idStr = (Math.floor((Math.random() * 25)) + 10).toString(36) + "_";
	// add a timestamp in milliseconds (base 36 again) as the base
	idStr += (new Date()).getTime().toString(36) + "_";
	// similar to above, complete the Id using random, alphanumeric characters
	do {
		idStr += (Math.floor((Math.random() * 35))).toString(36);
	} while (idStr.length < idStrLen);
	return (idStr);
}