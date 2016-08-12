// multitemporal composite
function composite(src, dst) {
	var pixel = [0,0,0,0]; // result
	pixel[0] = (src[0] + src[1] + src[2]) / 3; // red
	pixel[1] = (dst[0] + dst[1] + dst[2]) / 3; // green
	pixel[2] = (dst[0] + dst[1] + dst[2]) / 3; // blue
	pixel[3] = 255; // aplha
	return pixel;
}

// image difference
function difference(src, dst) {
	var pixel = [0,0,0,0]; // result
	// image difference
	var threshold = 100;
	var mean_src = (src[0] + src[1] + src[2]) / 3;
	var mean_dst = (dst[0] + dst[1] + dst[2]) / 3;
	var delta = Math.abs(mean_dst - mean_src);
	if (delta > threshold) {
		pixel = [255,0,0,255]; // major change
	} else {
		pixel = [0,0,0,0]; // transparent
	}
	return pixel;
}

// image ratio
function ratio(src, dst) {
	var pixel = [0,0,0,0]; // result
	// image ratio
	var threshold = 0.7; // ?
	var mean_src = (src[0] + src[1] + src[2]) / 3;
	var mean_dst = (dst[0] + dst[1] + dst[2]) / 3;
	if (mean_src === 0) mean_src += 1; // ?
	if (mean_dst === 0) mean_dst += 1; // ?
	var ratio = Math.min(mean_src, mean_dst) / Math.max(mean_src, mean_dst);
	if (ratio > threshold) { // more than 0.5 ratio
		pixel = [255,0,0,255]; // major change
	} else {
		pixel = [0,0,0,0]; // transparent
	}
	return pixel;
}

// gaussian blut
function gaussian(image) {
	// image - source image
	/*
	var width = image.width;
	var height = image.height;
	var inputData = image.data;
	var outputData = new Uint8ClampedArray(inputData);
	return {data: outputData, width: width, height: height};
	*/
	return null;
}

// median filter
function median(image) {
	return null;
}

// array of process functions
var functions = [composite, difference, ratio];
// array of filter functions
var filters = [gaussian, median];

function addResult(source, title, name) {
	var img = new ol.layer.Image({
		title: title,
		name: name,
		group: "imagery",
		deletable: true,
		source: source
	});
	map.addLayer(img);
	refreshLayersList(map);
}

function postProcessing(type) {
	alert("postProcessing: " + type);
	var func = filters[type]; // choose filter type
	var name = get("layer_filter");
	if (name === 'null') {
		error(tr("error:invalid_layer"));
		return;
	}
	var layer = getLayerByName(map, name);
	if (layer === null) {
		//error: layer not found
		return;
	}
	// do filter
	var raster = new ol.source.Raster({
		sources: [layer],
		operationType: 'image',
		operation: function(inputs, data) {
			return filter(inputs[0]);
		},
		lib: {filter: func}
	});
	// add result image layer to map
	addResult(raster, "Фильтр [" + id + "]", "filter_" + uid());
}

function changeDetection(method) {
	var func = functions[method] // process function
	var id1 = get("layer_change_1");
	var id2 = get("layer_change_2");
	if (id1 === 'null' || id2 === 'null') {
		error(tr("error:invalid_layer"));
		return;
	}
	// process by chosen method
	var raster = new ol.source.Raster({
		sources: [mosaics[id1].getSource(), mosaics[id2].getSource()],
		/**
		 * Run calculations on pixel data.
		 * @param {Array} pixels List of pixels (one per source).
		 * @param {Object} data User data object.
		 * @return {Array} The output pixel.
		 */
		operation: function(pixels, data) {
			return process(pixels[0], pixels[1]);
		},
		lib: {process: func}
	});
	// add result image layer to map
	addResult(raster, "Изменения [" + id1 + ", " + id2 + "]", "change_" + uid());
}