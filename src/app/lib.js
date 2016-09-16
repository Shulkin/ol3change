// for debug
function log_statistics(title, data, separate) {
	if (separate) console.log("");
	if (title != "") {
		console.log(title);
	}
	console.log("max: " + max(data));
	console.log("min: " + min(data));
	console.log("mean: " + mean(data));
	console.log("sdev: " + standard_deviation(data));
	if (separate) console.log("");
}

/**
* Normalize image pixels on all bands.
*/
function image_normalize(image, m1, m2, s1, s2) {
	var i = 0;
	var len = 4; // bands num
	var size = image.data.length;
	// Float32 for high precision
	var normalized = new Float32Array(size);
	while (i < size) {
		for (var j = 0; j < len; j++) {
			var temp = s2[j];
			if (temp === 0) temp = 1; // division by zero is forbidden!
			normalized[i + j] = (s1[j] / temp) * (image.data[i + j] - m2[j]) + m1[j];
		}
		i += len;
	}
	return {data: normalized, width: image.width, height: image.height};
}

/**
* Make a multi-temporal composite. Red band from src,
* Green and Blue from dst. Simple.
* @param {Image} src Input image 1.
* @param {Image} dst Input image 2.
* @param {Object} data Additional parameters.
*/
function multitemporal_composite(src, dst) {
	var i = 0;
	var len = 4; // bands num
	var size = src.data.length;
	// Uint8Clamped [0..255] because we need to keep initial discrete pixel values
	var composite = new Uint8ClampedArray(size);
	while (i < size) {
		var pixel = new Array(len).fill(0); // result
		// red band
		for (var j = 0; j < len; j++) {
			pixel[0] += src.data[i + j]
		}
		pixel[0] /= len;
		// green and blue bands
		for (var k = 1; k < 3; k++) {
			for (var j = 0; j < len; j++) {
				pixel[k] += dst.data[i + j];
			}
			pixel[k] /= len;
		}
		// alpha is always 255
		pixel[3] = 255;
		for (j = 0; j < len; j++) {
			composite[i + j] = pixel[j];
		}
		i += len;
	}
	return {data: composite, width: src.width, height: src.height};
}

/**
* Calculates the difference between the brightness of the pixels.
* @param {Image} src Input image 1.
* @param {Image} dst Input image 2.
* @param {Object} threshold Additional parameter.
*/
function image_difference(src, dst) {
	var i = 0;
	var len = 4; // bands num
	var size = src.data.length;
	// Float32 for high precision
	var delta = new Float32Array(size);
	// negative numbers will be clamped afterwards
	while (i < size) {
		for (var j = 0; j < len; j++) {
			// do not add Math.abs()! Keep negative values for statistics
			delta[i + j] = src.data[i + j] - dst.data[i + j];
			// 4th alpha band may be always 0 on difference image!
		}
		i += len;
	}
	return {data: delta, width: src.width, height: src.height};
}

/**
* Calculates the ratio between pixels.
* @param {Image} src Input image 1.
* @param {Image} dst Input image 2.
* @param {Object} threshold Additional parameter.
*/
function image_ratio(src, dst) {
	var i = 0;
	var len = 4; // bands num
	var size = src.data.length;
	// Float32 for high precision
	var ratio = new Float32Array(size);
	// negative numbers will be clamped afterwards
	while (i < size) {
		for (var j = 0; j < len; j++) {
			if (dst.data[i + j] === 0) {
				// division by zero is forbidden!
				if (src.data[i + j] < 0) { // -infinity
					ratio[i + j] = -Math.PI/2;
				} else { // +infinity
					ratio[i + j] = Math.PI/2;
				}
			} else {
				// ratio is [-Pi/2...Pi/2] initially because of arctan function
				ratio[i + j] = Math.atan(src.data[i + j] / dst.data[i + j]);
			}
			// make 4th band always 0
			ratio[i + 3] = 0; // kinda hack!
		}
		i += len;
	}
	return {data: ratio, width: src.width, height: src.height};
}

/**
* Clamp all pixels on image to positive numbers.
*/
function image_abs(image) {
	var i = 0;
	var size = image.data.length;
	// stay at Float32 because we may have [-Pi/2..Pi/2] in case of ratio
	var output = new Float32Array(size);
	while (i < size) {
		output[i] = Math.abs(image.data[i]);
		i++;
	}
	return {data: output, width: image.width, height: image.height};
}

/**
* Linear stretch all pixels in all bands to grayscale [0..255]
*/
function image_grayscale(image) {
	var i = 0;
	var len = 4; // bands num
	var size = image.data.length;
	// initially stay at Float32 to calculate norms
	var normalized = new Float32Array(size);
	while (i < size) {
		var norm = 0; // calculate vector length
		for (var j = 0; j < len; j++) {
			norm += Math.pow(image.data[i + j], 2);
		}
		norm = Math.sqrt(norm);
		for (j = 0; j < len; j++) {
			normalized[i + j] = norm;
		}
		i += len;
	}
	// return to Uint8Clamped [0..255]
	var output = new Uint8ClampedArray(size);
	var min_old = min(normalized);
	var max_old = max(normalized);
	var min_new = new Array(len).fill(0);
	var max_new = new Array(len).fill(255);
	i = 0;
	while (i < size) {
		for (var j = 0; j < len; j++) {
			var temp = max_old[j] - min_old[j];
			if (temp === 0) temp = 1; // division by zero is forbidden!
			output[i + j] = (normalized[i + j] - min_old[j]) * ((max_new[j] - min_new[j]) / temp) + min_new[j];
		}
		output[i + 3] = 255; // alpha should always be 255!
		i += len;
	}
	return {data: output, width: image.width, height: image.height};
}

/**
* Apply threshold on image.
*/
function image_thresholding(image, threshold, mode) {
	var i = 0;
	var len = 4; // bands num
	var size = image.data.length;
	/**
	 * Force to Uint8Clamped [0..255].
	 * We should be in grayscale by now!
	 */
	var output = new Uint8ClampedArray(size);
	while (i < size) {
		if (mode) {
			/**
			* If vector length is greater than threshold
			*/
			var norm = 0; // calculate vector length
			for (var j = 0; j < len; j++) {
				norm += Math.pow(image.data[i + j], 2);
			}
			norm = Math.sqrt(norm);
			var pixel = norm > threshold ? change() : empty(); // result
		} else {
			/**
			* If ANY element in vector is greater than threshold
			*/
			var pixel = empty(); // no change by default
			for (var j = 0; j < (len - 1); j++) { // exclude 255 alpha!
				if (image.data[i + j] > threshold) {
					pixel = change();
					break;
				}
			}
		}
		for (j = 0; j < len; j++) {
			output[i + j] = pixel[j]; // fill up output
		}
		i += len;
	}
	return {data: output, width: image.width, height: image.height};
}

/**
* Stretch color palette on image.
*/
function image_stretch(image, palette) {
	var i = 0;
	var len = 4; // bands num
	var size = image.data.length;
	/**
	 * Force to Uint8Clamped [0..255].
	 * We should be in grayscale by now!
	 */
	var output = new Uint8ClampedArray(size);
	var min_bands = min(image.data);
	var max_bands = max(image.data);
	while (i < size) {
		for (var j = 0; j < len; j++) {
			// get value from i'th pixel, from j'th band
			var value = image.data[i + j];
			// calculate its percentage between min and max in the corresponding bands
			var percent;
			var temp = max_bands[j] - min_bands[j]; // Math.abs()?
			if (temp === 0) { // division by zero is forbidden!
				percent = 0; // undefined
			} else {
				// calculate normally
				percent = ((value - min_bands[j]) / temp) * 100;
			}
			// use percentage to calculate value in color palette
			var color;
			for (var k = 0; k < palette.length - 1; k++) {
				if (palette[k].value <= percent && percent <= palette[k + 1].value) break;
			}
			var first = palette[k].color[j];
			var last = palette[k + 1].color[j];
			temp = last - first; // Math.abs()?
			if (temp === 0) {
				// nothing to stretch, just use any color in palette
				color = last;
			} else {
				color = (percent / 100) * temp + first;
			}
			output[i + j] = color;
		}
		i += len;
	}
	return {data: output, width: image.width, height: image.height};
}

function threshold_otsu() {
	console.log("determine threshold value with Otsu's method");
	return 100; // dummy
}

function threshold_kapur() {
	console.log("determine threshold value by Kapurs algorithm");
	return 100; // dummy
}

function threshold_percentile() {
	console.log("determine threshold value by percentile");
	return 100; // dummy
}