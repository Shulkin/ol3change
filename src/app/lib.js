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
* Calculate mean of the image pixels
*/
function image_mean(data) {
	var i = 0;
	var len = 4; // bands num
	var count = 0; // total counter
	var bands = new Array(len).fill(0); // [r, g, b, a]
	while (i < data.length) {
		for (var j = 0; j < len; j++) {
			bands[j] += data[i + j];
		}
		i += len;
		count++;
	}
	for (j = 0; j < len; j++) {
		bands[j] /= count;
	}
	return bands;
}

/**
* Calculate maximum of the image pixels
*/
function image_max(data) {
	var i = 0;
	var len = 4; // bands num
	var count = 0; // total counter
	var result = new Array(len).fill(Number.NEGATIVE_INFINITY);
	while (i < data.length) {
		for (var j = 0; j < len; j++) {
			if (result[j] < data[i + j]) result[j] = data[i + j];
		}
		i += len;
		count++;
	}
	return result;
}

/**
* Calculate minimum of the image pixels
*/
function image_min(data) {
	var i = 0;
	var len = 4; // bands num
	var count = 0; // total counter
	var result = new Array(len).fill(Number.POSITIVE_INFINITY);
	while (i < data.length) {
		for (var j = 0; j < len; j++) {
			if (result[j] > data[i + j]) result[j] = data[i + j];
		}
		i += len;
		count++;
	}
	return result;
}

/**
* Calculate standard deviation of the image pixels
*/
function image_standard_deviation(data) {
	var i = 0;
	var len = 4; // bands num
	var count = 0; // total counter
	var m = mean(data); // calculate mean
	var dispersion = new Array(len).fill(0);
	// calculate dispersion
	while (i < data.length) {
		for (var j = 0; j < len; j++) {
			dispersion[j] += Math.pow(data[i + j] - m[j], 2);
		}
		i += len;
		count++;
	}
	var bands = new Array(len).fill(0);
	for (j = 0; j < len; j++) {
		bands[j] = Math.sqrt((1 / (count)) * dispersion[j]);
	}
	return bands;
}

/**
* Normalize image pixels on all bands
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
* Clamp all pixels on image to positive numbers
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
* Apply threshold on image
*/
function image_thresholding(image, threshold, mode) {
	var i = 0;
	var len = 4; // bands num
	var size = image.data.length;
	// return to Uint8Clamped [0..255]
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
			for (var j = 0; j < len; j++) {
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
* Stretch color palette on image
*/
function image_stretch(image, palette) {
	//console.log("image_stretch");
	var i = 0;
	var len = 4; // bands num
	var size = image.data.length;
	// return to Uint8Clamped [0..255]
	var output = new Uint8ClampedArray(size);
	var min_bands = min(image.data);
	//console.log("min_bands: " + min_bands);
	var max_bands = max(image.data);
	//console.log("max_bands: " + max_bands);
	var count = 0;
	while (i < size) {
		for (var j = 0; j < len; j++) {
			// get value from i'th pixel, from j'th band
			var value = image.data[i + j];
			if (count >= 0 && count < 15) console.log("image.data[i + " + j + "]: " + value);
			// calculate its percentage between min and max in the corresponding bands
			var percent;
			var temp = max_bands[j] - min_bands[j]; // Math.abs()?
			if (temp === 0) { // division by zero is forbidden!
				percent = 0; // undefined
			} else {
				// calculate normally
				percent = ((value - min_bands[j]) / temp) * 100;
			}
			if (count >= 0 && count < 15) console.log("     percent: " + percent);
			// use percentage to calculate value in color palette
			var color;
			var segment = 100 / palette.length;
			if (count >= 0 && count < 15) console.log("     segment: " + segment);
			for (var k = 0; k < (palette.length - 1); k++) {
				if (k * segment <= percent && percent <= (k + 1) * segment) break;
			}
			if (count >= 0 && count < 15) console.log("     k: " + k);
			if (count >= 0 && count < 15) console.log("     palette[k]: " + palette[k]);
			if (count >= 0 && count < 15) console.log("     palette[k + 1]: " + palette[k + 1]);
			temp = palette[k][j] - palette[k + 1][j]; // Math.abs()?
			if (temp === 0) {
				// nothing to stretch, just use any color in palette
				color = palette[k + 1][j];
			} else {
				color = (percent / 100) * (palette[k + 1][j] - palette[k][j]) + palette[k][j];
			}
			if (count >= 0 && count < 15) console.log("     color: " + color);
			output[i + j] = color;
		}
		i += len;
		count++; // number of pixels
		/*
		if (count > 270000 && count < 270100) {
			console.log(output[i] + ", " + output[i + 1] + ", " + output[i + 2] + ", " + output[i + 3]);
		}
		*/
	}
	return {data: output, width: image.width, height: image.height};
}

/**
* Normalize a kernel N x N.
* @param {Array.<number>} kernel Kernel.
*/
function kernel_normalize(kernel) {
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
* Apply a convolution kernel to image. This works for any size kernel, but
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

/**
* Remove any chosen color from image.
* @param {Image} image Input data.
*/
function remove(image, color) {
	var width = image.width;
	var height = image.height;
	var inputData = image.data;
	var outputData = new Uint8ClampedArray(inputData.length);
	var i = 0;
	while (i < inputData.length) {
		var match = true;
		for (var j = 0; j < 3; j++) { // compare first 3 colors [R, G, B]
			if (inputData[i + j] != color[j]) {
				match = false;
				break;
			}
		}
		// copy first 3 color components
		for (j = 0; j < 3; j++) outputData[i + j] = inputData[i + j];
		outputData[i + 3] = match ? 0 : 255; // decide alpha
		i += 4;
	}
	return {data: outputData, width: width, height: height};
}

/**
* Join 2 images together.
* @param {Image} image Input data.
*/
function overlap(src ,dst) {
	var width = src.width;
	var height = src.height;
	var srcData = src.data;
	var dstData = dst.data;
	var outputData = new Uint8ClampedArray(srcData.length);
	var i = 0;
	while (i < srcData.length) {
		for (var j = 0; j < 4; j++) outputData[i + j] = srcData[i + j]; // init as srsData
		// overlap from dstData if corresponding alpha is not transparent
		if (dstData[i + 3] != 0) {
			for (j = 0; j < 4; j++) outputData[i + j] = dstData[i + j];
		}
		i += 4;
	}
	return {data: outputData, width: width, height: height};
}