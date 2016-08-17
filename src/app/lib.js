// array of 3x3 and 5x5 kernels for filters
var kernels = {
	none: [
		0, 0, 0,
		0, 1, 0,
		0, 0, 0
	],
	sharpen: [
		0, -1, 0,
		-1, 5, -1,
		0, -1, 0
	],
	gaussian: [
		1, 4, 7, 4, 1,
		4, 16, 26, 16, 4,
		7, 26, 41, 26, 7,
		4, 16, 26, 16, 4,
		1, 4, 7, 4, 1
	],
	edge: [
		0, 1, 0,
		1, -4, 1,
		0, 1, 0
	]
};

// array of process functions
var functions = [composite, difference, ratio];

function getChangeColor() {
	// red is the color of change
	return [255, 0, 0, 255];
}

function getTransparent() {
	// simple transparent white
	return [255, 255, 255, 0];
}

function normalize(kernel) {
	var len = kernel.length;
	var normal = new Array(len);
	var i, sum = 0;
	for (i = 0; i < len; ++i) {
		sum += kernel[i];
	}
	if (sum <= 0) {
		normal.normalized = false;
		sum = 1;
	} else {
		normal.normalized = true;
	}
	for (i = 0; i < len; ++i) {
		normal[i] = kernel[i] / sum;
	}
	return normal;
}

/**
* Apply a convolution kernel to image.  This works for any size kernel, but
* performance starts degrading above 3 x 3.
* @param {Image} image Input data.
* @param {Array.<number>} kernel Kernel.
*/
function convolve(image, kernel) {
	var width = image.width;
	var height = image.height;
	var size = Math.sqrt(kernel.length);
	var half = Math.floor(size / 2);
	var inputData = image.data;
	var outputData = new Uint8ClampedArray(inputData);
	for (var pixelY = 0; pixelY < height; ++pixelY) {
		var pixelsAbove = pixelY * width;
		for (var pixelX = 0; pixelX < width; ++pixelX) {
			var r = 0, g = 0, b = 0, a = 0;
			for (var kernelY = 0; kernelY < size; ++kernelY) {
				for (var kernelX = 0; kernelX < size; ++kernelX) {
					var weight = kernel[kernelY * size + kernelX];
					var neighborY = Math.min(height - 1, Math.max(0, pixelY + kernelY - half));
					var neighborX = Math.min(width - 1, Math.max(0, pixelX + kernelX - half));
					var inputIndex = (neighborY * width + neighborX) * 4;
					r += inputData[inputIndex] * weight;
					g += inputData[inputIndex + 1] * weight;
					b += inputData[inputIndex + 2] * weight;
					a += inputData[inputIndex + 3] * weight;
				}
			}
			var outputIndex = (pixelsAbove + pixelX) * 4;
			outputData[outputIndex] = r;
			outputData[outputIndex + 1] = g;
			outputData[outputIndex + 2] = b;
			outputData[outputIndex + 3] = kernel.normalized ? a : 255;
		}
	}
	return {data: outputData, width: width, height: height};
}

// remove color from image OR remove all colors except one
function remove(image, color, except, delta) {
	var width = image.width;
	var height = image.height;
	var inputData = image.data;
	var outputData = new Uint8ClampedArray(inputData);
	var i = 0;
	while (i < inputData.length) {
		var match = true;
		for (var j = 0; j < 3; j++) { // compare first 3 colors [R, G, B]
			if (Math.abs(inputData[i + j] - color[j]) > delta) {
				match = false;
				break;
			}
		}
		// copy first 3 color components
		for (j = 0; j < 3; j++) outputData[i + j] = inputData[i + j];
		// decide alpha depending on colors match
		if (except) {
			outputData[i + 3] = match ? 255 : 0;
		} else {
			outputData[i + 3] = match ? 0 : 255;
		}
		i += 4;
	}
	return {data: outputData, width: width, height: height};
}

// multitemporal composite
function composite(src, dst) {
	var pixel = transparent(); // result
	pixel[0] = (src[0] + src[1] + src[2]) / 3; // red
	pixel[1] = (dst[0] + dst[1] + dst[2]) / 3; // green
	pixel[2] = (dst[0] + dst[1] + dst[2]) / 3; // blue
	pixel[3] = 255; // aplha
	return pixel;
}

// image difference
function difference(src, dst) {
	var pixel = transparent(); // result
	// calculate difference
	var threshold = 100;
	var mean_src = (src[0] + src[1] + src[2]) / 3;
	var mean_dst = (dst[0] + dst[1] + dst[2]) / 3;
	var delta = Math.abs(mean_dst - mean_src);
	if (delta > threshold) {
		pixel = changeColor(); // major change
	} else {
		pixel = transparent(); // transparent
	}
	return pixel;
}

// image ratio
function ratio(src, dst) {
	var pixel = transparent(); // result
	// calculate ratio
	var threshold = 0.7;
	var mean_src = (src[0] + src[1] + src[2]) / 3;
	var mean_dst = (dst[0] + dst[1] + dst[2]) / 3;
	if (mean_src === 0) mean_src += 1;
	if (mean_dst === 0) mean_dst += 1;
	var ratio = Math.min(mean_src, mean_dst) / Math.max(mean_src, mean_dst);
	if (ratio > threshold) {
		pixel = changeColor(); // major change
	} else {
		pixel = transparent(); // transparent
	}
	return pixel;
}

// add layer on map
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

// any kernel filters, including complex ones
function kernelFilter(type) {
	// get layer
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
			if (data.type === 'remove') {
				// apply gaussian blur
				var img1 = convolve(pixels[0], normalize(data.matrices.gaussian));
				// sharpen the image
				var img2 = convolve(img1, normalize(data.matrices.sharpen));
				// remove all colors EXCEPT red as change color
				// 70 - delta, leave some other colors
				return remove(img2, [255, 0, 0, 255], true, 70);
			} else if (data.type === 'edge') {
				// apply edge detector
				var img1 = convolve(pixels[0], data.matrix);
				// remove black color, leave ONLY edges
				// 0 - remove ANY black
				return remove(img1, [0, 0, 0, 255], false, 0);
			} else {
				// just apply kernel
				return convolve(pixels[0], data.matrix);
			}
			return process(pixels[0], data.matrix);
		},
		lib: {
			normalize: normalize,
			convolve: convolve,
			remove: remove
		}
	});
	raster.on('beforeoperations', function(event) {
		// the event.data object will be passed to operations
		var data = event.data;
		data.type = type;
		if (type === 'remove') {
			// for now, only one exception...
			data.matrices = kernels;
		} else {
			data.matrix = normalize(kernels[type]); // get kernel
		}
	});
	raster.on('afteroperations', function(event) {
		// maybe unnecessary, just in case...
		map.render();
	});
	// some mumbo-jumbo with title
	var title = layer.get('title');
	title_full = "Фильтр_Матрица [" + title + "]";
	var title_short = title_full; // initially the same
	if (title_short.length > 20) {
		title_short = title_short.substring(0, 20) + "..."; // cut
	}
	// add result image layer to map
	addResult(raster, title_short, "filter_" + uid());
	map.render();
}

// process change detection methods
function changeDetection(method) {
	var process = functions[method] // change detection function
	// get layers
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
	// process by chosen method
	var raster = new ol.source.Raster({
		sources: [layer_1.getSource(), layer_2.getSource()],
		/**
		 * Run calculations on pixel data.
		 * @param {Array} pixels List of pixels (one per source).
		 * @param {Object} data User data object.
		 * @return {Array} The output pixel.
		 */
		operation: function(pixels, data) {
			return process(pixels[0], pixels[1]);
		},
		lib: {
			process: process,
			changeColor: getChangeColor,
			transparent: getTransparent
		}
	});
	// some mumbo-jumbo with titles
	var title_1 = layer_1.get('title');
	var title_2 = layer_2.get('title');
	title_full = "Изменения [" + title_1 + ", " + title_2 + "]";
	var title_short = title_full; // initially the same
	if (title_short.length > 20) {
		title_short = title_short.substring(0, 20) + "..."; // cut
	}
	// add result image layer to map
	addResult(raster, title_short, "change_" + uid());
	map.render();
}