// array of kernels for filters
var kernels = {
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

function next4Edges(edge) {
	var x = edge[0], y = edge[1];
	return [
		[x + 1, y],
		[x - 1, y],
		[x, y + 1],
		[x, y - 1]
	];
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

// perform unsupervised classification
function classify(image) {
	var threshold = 70;
	var width = image.width;
	var height = image.height;
	var inputData = image.data;
	var outputData = new Uint8ClampedArray(inputData.length);
	var marked = new Array(outputData.length);
	// clear output data array
	for (var k = 0; k < marked.length; k++) {
		marked[k] = false;
	}
	var color_mark = 0; // mark of class
	for (var x = 0; x < width; x++) {
		for (var y = 0; y < height; y++) {
			var seed = [x, y];
			var seedIdx = (seed[1] * width + seed[0]) * 4;
			// to check only first seedIdx is enough!
			if (!marked[seedIdx]) { // this output position is not marked
				// do classification
				var seedR = inputData[seedIdx];
				var seedG = inputData[seedIdx + 1];
				var seedB = inputData[seedIdx + 2];
				var edge = [seed];
				while (edge.length) {
					var newedge = [];
					for (var i = 0, ii = edge.length; i < ii; i++) {
						// As noted in the Raster source constructor, this function is provided
						// using the `lib` option. Other functions will NOT be visible unless
						// provided using the `lib` option.
						var next = next4Edges(edge[i]);
						for (var j = 0, jj = next.length; j < jj; j++) {
							var s = next[j][0], t = next[j][1];
							if (s >= 0 && s < width && t >= 0 && t < height) {
								var ci = (t * width + s) * 4;
								var cr = inputData[ci];
								var cg = inputData[ci + 1];
								var cb = inputData[ci + 2];
								var ca = inputData[ci + 3];
								// if alpha is zero, carry on
								if (ca === 0) {
									continue;
								}
								// classify by difference in brightness
								if (Math.abs(seedR - cr) < threshold &&
									Math.abs(seedG - cg) < threshold &&
									Math.abs(seedB - cb) < threshold) {
									// just mark with any color
									outputData[ci] = color_mark;
									outputData[ci + 1] = color_mark;
									outputData[ci + 2] = color_mark;
									outputData[ci + 3] = 255; // no transparent
									// UGLY
									marked[ci] = true;
									marked[ci + 1] = true;
									marked[ci + 2] = true;
									marked[ci + 3] = true;
									// push newedge
									newedge.push([s, t]);
								}
								// mark as visited
								inputData[ci + 3] = 0;
							}
						}
					}
					edge = newedge;
				}
				color_mark++;
			}
		}
	}
	return {data: outputData, width: width, height: height};
}

// compare 2 classified images pixel-by-pixel
function compare(src, dst) {
	var threshold = 0;
	var width = src.width;
	var height = src.height;
	var srcData = src.data;
	var dstData = dst.data;
	var outputData = new Uint8ClampedArray(srcData.length);
	var i = 0;
	while (i < srcData.length) {
		var pixel = transparent(); // empty result
		var mean_src = (srcData[i] + srcData[i + 1] + srcData[i + 2]) / 3;
		var mean_dst = (dstData[i] + dstData[i + 1] + dstData[i + 2]) / 3;
		var delta = Math.abs(mean_dst - mean_src);
		if (delta > threshold) {
			pixel = changeColor(); // major change
		}
		outputData[i] = pixel[0]; // red
		outputData[i + 1] = pixel[1]; // green
		outputData[i + 2] = pixel[2]; // blue
		outputData[i + 3] = pixel[3]; // alpha
		i += 4;
	}
	return {data: outputData, width: width, height: height};
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
			switch (data.type) {
				case 'special':
					// special filter for change detection results
					// apply gaussian blur
					var img1 = convolve(pixels[0], normalize(data.matrices.gaussian));
					// sharpen the image
					var img2 = convolve(img1, normalize(data.matrices.sharpen));
					// remove all colors EXCEPT red as change color
					// delta=70 - leave some other colors, except red
					return remove(img2, [255, 0, 0, 255], true, 70);
					break;
				case 'edge':
					// apply edge detector
					var img1 = convolve(pixels[0], normalize(data.matrix));
					// remove black color, leaving ONLY edges
					// delta=0 - remove ANY black color
					return remove(img1, [0, 0, 0, 255], false, 0);
					break;
				default:
					// just apply kernel
					return convolve(pixels[0], normalize(data.matrix));
					break;
			}
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
		if (type === 'special') {
			// for now, only one exception...
			data.matrices = kernels;
		} else {
			data.matrix = kernels[type]; // get kernel
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
	if (method === 'classification') { // HACK
		changeDetection_classification();
		return;
	}
	// else process normally with simple change detection methods
	var func = functions[method] // change detection function
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
			process: func,
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

// change detection with unsupervised classification
function changeDetection_classification() {
	alert("changeDetection_classification");
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
	alert("layer_1 name: " + name_1);
	alert("layer_2 name: " + name_2);
	// do unsupervised classification and by-pixel change detection after that
	var raster = new ol.source.Raster({
		sources: [layer_1.getSource(), layer_2.getSource()],
		operationType: 'image',
		operation: function(inputs, data) {
			// classified image 1
			var img1 = classify(inputs[0]);
			// classified image 2
			var img2 = classify(inputs[0]);
			// compare result
			return compare(img1, img2);
		},
		lib: {
			compare: compare,
			classify: classify,
			next4Edges: next4Edges,
			changeColor: getChangeColor,
			transparent: getTransparent
		}
	});
	// some mumbo-jumbo with titles
	var title_1 = layer_1.get('title');
	var title_2 = layer_2.get('title');
	title_full = "Классификация [" + title_1 + ", " + title_2 + "]";
	var title_short = title_full; // initially the same
	if (title_short.length > 20) {
		title_short = title_short.substring(0, 20) + "..."; // cut
	}
	// add result image layer to map
	addResult(raster, title_short, "classify" + uid());
	map.render();
}