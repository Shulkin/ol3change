/**
* Run change detection function.
* @param {String} method Method's name, i.e. id in array of functions.
*/
function changeDetection(method) {
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
				/*
				console.log("initial input data:");
				console.log("");
				for (var i = 0; i < 2; i++) log("pixels[" + i + "]:", pixels[i].data, false);
				console.log("");
				console.log("normalize...");
				*/
			// if normalization option is enabled
			if (data.normalize) {
				var m1 = mean(pixels[0].data);
				var m2 = mean(pixels[1].data);
				var s1 = standard_deviation(pixels[0].data);
				var s2 = standard_deviation(pixels[1].data);
				pixels[1] = normalize(pixels[1], m1, m2, s1, s2);
			}
				/*
				console.log("");
				for (var i = 0; i < 2; i++) log("pixels[" + i + "]:", pixels[i].data, false);
				console.log("");
				*/
			switch (data.method) {
				case 'composite':
					// don't need threshold in composite
					return composite(pixels[0], pixels[1]);
					break;
				case 'difference':
						//console.log("calculate difference...");
					var img = difference(pixels[0], pixels[1]);
						//log("", img.data, true);
						//console.log("abs image");
					img = abs(img);
						//log("", img.data, true);
					if (data.outputType === "threshold") { // threshold
							//console.log("threshold image");
						img = thresholding(img, data.threshold, true);
					} else { // stretch
							//console.log("stretch image");
						// default palette
						img = stretch(img, getPalette("rgb"));
					}
						//log("", img.data, true);
					return img;
					break;
				case 'ratio':
						//console.log("calculate ratio...");
					var img = ratio(pixels[0], pixels[1]);
						//log("", img.data, true);
						//console.log("abs image");
					img = abs(img);
						//log("", img.data, true);
					if (data.outputType === "threshold") { // threshold
							//console.log("threshold image");
						img = thresholding(img, data.threshold, true);
					} else { // stretch
							//console.log("stretch image");
						// default palette
						img = stretch(img, getPalette("rgb"));
					}
						//log("", img.data, true);
					return img;
					break;
				default:
					return pixels[0]; // unnecessary
					break;
			}
		},
		lib: {
			// colors
			empty: empty, // color of emptiness, transparent
			change: change, // color of change ([255, 0, 0, 255] by default)
			// statistic functions
			max: image_max,
			min: image_min,
			mean: image_mean,
			standard_deviation: image_standard_deviation,
			// utils
			abs: image_abs,
			stretch: image_stretch,
			normalize: image_normalize,
			thresholding: image_thresholding,
			log: log_statistics,
			// any change detection functions
			ratio: image_ratio,
			difference: image_difference,
			composite: multitemporal_composite,
			// other
			getPalette: getPalette
		}
	});
	// set handler on beforeoperations
	raster.on('beforeoperations', function(event) {
		// the event.data object will be passed to operations
		var data = event.data;
		data.method = method;
		// set any parameters in data, like threshold for image difference
		if (method != "composite") {
			data.normalize = true; // always normalize by default
			data.threshold = val("change_threshold");
			data.outputType = get('change_outputType');
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
					// init median filter
					var filter = new MedianFilter();
					filter.maskHeight = 5;
					filter.maskWidth = 5;
					// normalize pixels[1]
					var m1 = mean(pixels[0].data);
					var m2 = mean(pixels[1].data);
					var s1 = standard_deviation(pixels[0].data);
					var s2 = standard_deviation(pixels[1].data);
					pixels[1] = normalize(pixels[1], m1, m2, s1, s2);
					// difference
					var diff = difference(pixels[0], pixels[1]);
					diff = abs(diff);
					diff = thresholding(diff, 90, true);
					var median1 = filter.convertImage(diff, diff.width, diff.height);
					median1 = removePixels(median1, [255, 255, 255, 255]); // remove white
					// ratio
					var rat = ratio(pixels[0], pixels[1]);
					rat = abs(rat);
					rat = thresholding(rat, 1.65, true);
					var median2 = filter.convertImage(rat, rat.width, rat.height);
					median2 = removePixels(median2, [255, 255, 255, 255]); // remove white
					// result
					return overlapPixels(median1, median2);
					break;
				default:
					return pixels[0]; // unnecessary
					break;
			}
		},
		lib: {
			// colors
			empty: empty,
			change: change,
			// statistic functions
			mean: image_mean,
			standard_deviation: image_standard_deviation,
			// utils
			abs: image_abs,
			normalize: image_normalize,
			thresholding: image_thresholding,
			// change detection sub-pixel methods
			ratio: image_ratio,
			difference: image_difference,
			// additional utils
			removePixels: remove,
			overlapPixels: overlap,
			// functions for median filter
			MedianFilter: MedianFilter,
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
			var output; // result of raster operation
			switch (data.type) {
				case 'edge':
					// apply edge detector
					var edges = convolve(source, data.matrix);
					// remove black color, leaving ONLY edges
					output = removePixels(edges, [0, 0, 0, 255]);
					break;
				case 'median':
					var filter = new MedianFilter();
					filter.maskHeight = data.size;
					filter.maskWidth = data.size;
					var median = filter.convertImage(source, source.width, source.height);
					output = removePixels(median, [0, 0, 0, 255]);
					break;
				default:
					// just apply kernel
					output = convolve(source, data.matrix);
					break;
			}
			return output;
		},
		lib: {
			// function to apply kernel
			convolve: convolve,
			// utils
			removePixels: remove,
			// functions for median filter
			MedianFilter: MedianFilter,
			MedianHistogram: MedianHistogram,
			MedianHistogramFast: MedianHistogramFast
		}
	});
	raster.on('beforeoperations', function(event) {
		// the event.data object will be passed to operations
		var data = event.data;
		data.type = type;
		if (type === "median") {
			// don't need kernel for median filter, set some parameters instead
			data.size = val("median_filter_size");
		} else {
			data.matrix = kernel_normalize(kernels[type]); // get kernel
		}
	});
	var title = getShortTitle("Фильтр", [layer.get('title')]);
	addResult(raster, title, "filter_" + uid());
	map.render();
}