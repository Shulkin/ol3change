var service; // url of the current wms-service
var layersArray = []; // all layers from OGC service as simple list
var layersHierarchy = []; // same layers as tree structure

function clearLayersDOM() {
	$("#layers-list").html("");
}

function resetAll() {
	layersArray = []; // reset array
	clearLayersDOM(); // clear DOM list
}

function parseLayersList(layers, groupName) {
	var array = [];
	groupName = (typeof groupName === "undefined") ? null : groupName;
	if (groupName != null) {
		array.push(groupName);
	}
	for (var i = 0, len = layers.length; i < len; i++) {
		var obj = layers[i];
		if (isArray(obj.Layer)) {
			array.push(parseLayersList(obj.Layer, obj.Name));
		} else {
			array.push(obj.Name);
			layersArray.push(obj.Name); // HACK
		}
	}
	return array;
}

function updateTreeview(array, view) {
	for (var i = 0, len = array.length; i < len; i++) {
		var obj = array[i];
		var li = document.createElement("li");
		view.appendChild(li);
		var div = document.createElement("div");
		li.appendChild(div);
		var p = document.createElement("p");
		div.appendChild(p);
		var nobr = document.createElement("nobr"); // HACK
		p.appendChild(nobr);
		if (isArray(obj)) {
			li.className = "cl"; // closed by default
			var a = document.createElement("a");
			a.setAttribute("class", "sc");
			a.setAttribute("style", "cursor:pointer");
			a.innerHTML = "&#9658;"; // closed by default
			a.onclick = function(event) {
				if (event.target.innerHTML.charCodeAt(0) == 9658 ) {
					event.target.innerHTML = "&#9660;"; // down arrow, opened
					event.target.parentNode.parentNode.parentNode.parentNode.className = "";
				} else {
					event.target.innerHTML = "&#9658;"; // right arrow, closed
					event.target.parentNode.parentNode.parentNode.parentNode.className = "cl";
				}
			}
			nobr.appendChild(a);
			var span = document.createElement("span");
			nobr.appendChild(span);
			// first element of an array is the group's name, ergo shift
			var groupName = document.createTextNode(obj.shift());
			span.appendChild(groupName);
			var ul = document.createElement("ul");
			li.appendChild(ul);
			updateTreeview(obj, ul);
		} else {
			li.className = ""; // don't matter, should be empty
			var checkbox = document.createElement("input");
			checkbox.setAttribute("type", "checkbox");
			checkbox.setAttribute("value", obj);
			checkbox.setAttribute("name", service);
			checkbox.setAttribute("id", obj);
			nobr.appendChild(checkbox);
			var label = document.createElement("label");
			label.setAttribute("for", obj);
			nobr.appendChild(label);
			var name = document.createTextNode(obj);
			label.appendChild(name);
		}
	}
}

function updateLayersDOM() {
	console.log("Create DOM elements for layers list...");
	var treeview = document.createElement("div");
	treeview.className = "treeview";
	console.log("Div is ready!");
	var ul = document.createElement("ul");
	treeview.appendChild(ul);
	console.log("List is ready!");
	updateTreeview(layersHierarchy, ul);
	$("#layers-list").append(treeview);
	console.log("Layers on screen!");
}

function loadLayers() {
	resetAll();
	var parser = new ol.format.WMSCapabilities();
	service = $("#wms").val();
	console.log("Start loading layers from server " + service);
	console.log("Send AJAX-request...");
	// add ? to the end of url if necessary
	if (service.substr(service.length - 1) != "?") {
		service += "?";
	}
	$.ajax({
		type: "GET",
		// send header with authorization info
		// CORS needs to be enabled on server
		headers: {"Authorization": make_base_auth(getUsername(), getPassword())},
		url: service + "service=WMS&request=GetCapabilities"
	}).success(function (response, _status) {
		console.log("Server returned success! Status: " + _status);
	}).error(function (jqXHR, _status, _error) {
		console.log("Server returned error! Status: " + _status + ", jqXHR: " + JSON.stringify(jqXHR));
		server_login_error(_status);
	}).done(function (response) {
		console.log("Got response from server!");
		var result = parser.read(response);
		var layers = result.Capability.Layer.Layer;
		console.log("Number of layers: " + layers.length);
		console.log("Parsing layers list...");
		layersHierarchy = parseLayersList(layers);
		console.log("Update DOM...");
		updateLayersDOM();
		console.log("Done!");
	});
}

// get all checked layers from list and add to map one by one
function addComposition() {
	for (var i = 0, len = layersArray.length; i < len; i++) {
		var box = document.getElementById(layersArray[i]);
		if (box != null && box.checked) {
			// TODO: get actual title instead of box.value, i.e. layer name
			pushMosaic(box.name, box.value, box.value, true);
		}
	}
}

function make_base_auth(user, password) {
	return "Basic " + btoa(user + ":" + password);
}

function customLoader(tile, src) {
	var client = new XMLHttpRequest();
	client.open('GET', src);
	client.responseType = 'arraybuffer';
	client.setRequestHeader('Authorization', make_base_auth(getUsername(), getPassword()));
	client.onload = function() {
		if (client.status === 200) {
			var type = client.getResponseHeader('content-type');
			var uInt8Array = new Uint8Array(client.response);
			var i = uInt8Array.length;
			var binaryString = new Array(i);
			while (i--) {
				binaryString[i] = String.fromCharCode(uInt8Array[i]);
			}
			var data = binaryString.join('');
			tile.getImage().src = 'data:' + type + ';base64,' + btoa(data);
		} else {
			tile.getImage().src = src;
			server_login_error(client.statusText);
		}
	};
	client.send();
}

function pushMosaic(service, layerName, title, isDelete) {
	var tile = new ol.source.TileWMS({
		url: service,
		crossOrigin: 'null',
		params: {'LAYERS': layerName, 'TILED': true},
		serverType: 'geoserver'
	});
	tile.setTileLoadFunction(customLoader);
	var new_layer = new ol.layer.Tile({
		title: title,
		name: layerName,
		group: "imagery",
		visible: false,
		deletable: isDelete,
		source: tile
	});
	mosaics.push(new_layer);
	map.addLayer(mosaics.last());
	refreshLayersList(map);
}

// handler on show layers list window
$('#layers').on('shown.bs.modal', function() {
	resetAll();
});