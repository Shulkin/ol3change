// default 'sorry, not working' message
function m_con() {
	error(tr("error:under_construction"));
}

function setModalTitle(str) {
	$("#msg > div > div.modal-content > div.modal-header > .modal-title").text(str);
}

function clearModalBody() {
	$("#msg > div > div.modal-content > div.modal-body").html("");
}

function appendMessageToModalBodyP(str) {
	$("#msg > div > div.modal-content > div.modal-body").append("<p>" + str + "</p>");
}

function showModal() {
	$("#msg").modal("show");
}

function message(str) {
	setModalTitle(""); // clear
	clearModalBody();
	appendMessageToModalBodyP(str);
	showModal();
}

function error(str) {
	setModalTitle(tr("error:title")); // set error header
	clearModalBody();
	appendMessageToModalBodyP(str);
	showModal();
}

// display many error messages in one modal window
function error_lot(arr) {
	setModalTitle(tr("error:title")); // set error header
	clearModalBody();
	for (var i = 0; i < arr.length; i++) {
		appendMessageToModalBodyP(arr[i]);
	}
	showModal();
}