/**
* Run change detection function.
* @param {String} method Method's name, i.e. id in array of functions.
*/
function changeDetection(method) {
	var process = functions[method] // change detection function
	// src and dst images
	var name_1 = get("layer_change_1");
	var name_2 = get("layer_change_2");
	if (name_1 === 'null' || name_2 === 'null') {
		error(tr("error:invalid_layer"));
		return;
	}
	var layer_1 = getLayerByName(map, name_1);
	var layer_2 = getLayerByName(map, name_2);
	if (layer_1 === null || layer_2 === null) {
		error(tr("error:layer_not_found"));
		return;
	}
	var raster = new ol.source.Raster({
		sources: [layer_1.getSource(), layer_2.getSource()],
		/**
		 * Run calculations on pixel data.
		 * @param {Array} pixels List of pixels (one per source).
		 * @param {Object} data User data object.
		 * @return {Array} The output pixel.
		 */
		operation: function(pixels, data) {
			return process(pixels[0], pixels[1], data);
		},
		lib: {
			process: process, // change detection function
			change: change, // color of change ([255, 0, 0, 255] by default)
			empty: empty // color of emptiness, transparent
		}
	});
	// set handler on beforeoperations
	raster.on('beforeoperations', function(event) {
		// the event.data object will be passed to operations
		var data = event.data;
		// set any parameters in data, like threshold for image difference
		switch (method) { // depending on processing method
			case 'difference':
				data.threshold = 100;
				break;
			case 'ratio':
				data.threshold = 0.7;
				break;
		}
	});
	var title = getShortTitle("Изменения", [layer_1.get('title'), layer_2.get('title')]);
	addResult(raster, title, "change_" + uid());
	map.render();
}

/**
* Apply kernel filter.
* @param {String} type Filter's type.
*/
function kernelFilter(type) {
	// single image to filter
	var name = get("layer_filter");
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
			switch (data.type) {
				case 'edge':
					// apply edge detector
					var img1 = convolve(pixels[0], data.matrix);
					// remove black color, leaving ONLY edges
					return remove(img1, [0, 0, 0, 255]);
					break;
				case 'median':
					var img1 = pixels[0];
					var img2 = new MedianFilter().convertImage(img1, img1.width, img1.height);
					return remove(img2, [0, 0, 0, 255]);
					break;
				default:
					// just apply kernel
					return convolve(pixels[0], data.matrix);
					break;
			}
		},
		lib: {
			convolve: convolve,
			remove: remove,
			MedianFilter: MedianFilter,
			MedianHistogram: MedianHistogram,
			MedianHistogramFast: MedianHistogramFast
		}
	});
	raster.on('beforeoperations', function(event) {
		// the event.data object will be passed to operations
		var data = event.data;
		data.type = type;
		if (type != "median") { // don't need kernel for median filter
			data.matrix = normalize(kernels[type]); // get kernel
		}
	});
	/*
	raster.on('afteroperations', function(event) {
		// maybe unnecessary, just in case...
		map.render();
	});
	*/
	var title = getShortTitle("Фильтр", [layer.get('title')]);
	addResult(raster, title, "filter_" + uid());
	map.render();
}