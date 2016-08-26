/**
* Run change detection function.
* @param {String} method Method's name, i.e. id in array of functions.
*/
function changeDetection(method) {
	var process = functions[method] // change detection function
	// both images to compare and detect changes
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
		operationType: 'image', // on whole image
		/**
		 * Run calculations on pixel data.
		 * @param {Array} pixels List of pixels (one per source).
		 * @param {Object} data User data object.
		 * @return {Array} The output pixel.
		 */
		operation: function(pixels, data) {
			switch (data.method) {
				case 'composite':
					// don't need threshold in composite
					return process(pixels[0], pixels[1]);
					break;
				default:
					return process(pixels[0], pixels[1], data.threshold);
					break;
			}
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
		data.method = method;
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
* Run quick analysis.
* @param {String} method Type of procedure
*/
function expressAnalysis(method) {
	// data for analysis
	var name_1 = get("layer_express_1");
	var name_2 = get("layer_express_2");
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
		operationType: 'image', // on whole image
		operation: function(pixels, data) {
			switch (data.method) {
				case 'urban':
					// complex chain of procedures
					var img1 = difference(pixels[0], pixels[1], 100); // difference
					var median1 = new MedianFilter().convertImage(img1, img1.width, img1.height);
					median1 = removePixels(median1, [255, 255, 255, 255]); // remove white
					var img2 = ratio(pixels[0], pixels[1], 0.7); // ratio
					var median2 = new MedianFilter().convertImage(img2, img2.width, img2.height);
					median2 = removePixels(median2, [255, 255, 255, 255]); // remove white
					return overlapPixels(median1, median2);
					break;
				default:
					return pixels[0]; // unnecessary
					break;
			}
		},
		lib: {
			// any procedures needed for complete analysis
			empty: empty,
			change: change,
			ratio: image_ratio,
			removePixels: remove,
			overlapPixels: overlap,
			MedianFilter: MedianFilter,
			difference: image_difference,
			MedianHistogram: MedianHistogram,
			MedianHistogramFast: MedianHistogramFast
		}
	});
	raster.on('beforeoperations', function(event) {
		var data = event.data;
		data.method = method;
	});
	var title = getShortTitle("Анализ", [layer_1.get('title'), layer_2.get('title')]);
	addResult(raster, title, "express" + uid());
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
			var source = pixels[0];
			switch (data.type) {
				case 'edge':
					// apply edge detector
					var edges = convolve(source, data.matrix);
					// remove black color, leaving ONLY edges
					return removePixels(edges, [0, 0, 0, 255]);
					break;
				case 'median':
					var median = new MedianFilter().convertImage(source, source.width, source.height);
					return removePixels(median, [0, 0, 0, 255]);
					break;
				default:
					// just apply kernel
					return convolve(source, data.matrix);
					break;
			}
		},
		lib: {
			convolve: convolve,
			removePixels: remove,
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
	var title = getShortTitle("Фильтр", [layer.get('title')]);
	addResult(raster, title, "filter_" + uid());
	map.render();
}