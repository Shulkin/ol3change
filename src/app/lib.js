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
	var normalized = new Uint8ClampedArray(size);
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
* Apply threshold on image
*/
function image_thresholding(image, threshold, mode) {
	var i = 0;
	var len = 4; // bands num
	var size = image.data.length;
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
	var delta = new Uint8ClampedArray(size);
	while (i < size) {
		for (var j = 0; j < len; j++) {
			delta[i + j] = Math.abs(src.data[i + j] - dst.data[i + j]);
			// 4th alpha band will always be zero on difference image!
			// cause 255 - 255 = 0
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
function image_ratio(src, dst, threshold) {
	var i = 0;
	var len = 4; // bands num
	var size = src.data.length;
	var ratio = new Uint8ClampedArray(size);
	while (i < size) {
		for (var j = 0; j < len; j++) {
			ratio[i + j] = Math.atan(src.data[i + j] / dst.data[i + j]) - (Math.PI / 4);
			// 4th alpha band will always be zero on ratio image!
			// cause arctan(255 / 255) = arctan(1) = Pi / 4 => Pi / 4 - Pi / 4 = 0
		}
		i += len;
	}
	return {data: ratio, width: src.width, height: src.height};
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